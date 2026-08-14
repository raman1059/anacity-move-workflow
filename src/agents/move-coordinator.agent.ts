import type {
  ActorRole,
  AutonomyTier,
  CommunityConfiguration,
  CommunityPolicy,
  MoveRequest,
  PolicyId,
  RequestId,
  RequestNote,
  ToolName,
} from '../domain';
import { generateId } from '../lib/id';
import type {
  ChargeCalculationResult,
  ValidateDocumentsResult,
  ValidateRequestResult,
} from '../lib/policy-engine';
import type { Repositories } from '../repositories';
import type { CreateMoveRequestInput } from '../tools/implementations/create-move-request.tool';
import type { ToolRegistry } from '../tools/registry';
import { ToolPermissionError, type ToolContext } from '../tools/types';
import type { LLMAgentProvider } from './agent-provider';
import { assembleAgentContext, type AgentContextReader, type CallTool } from './context-reader';
import { requiresHumanReview, runGuardrails } from './guardrails';
import { buildReply, type ReplyParams, type ReplyScenario } from './response-templates';
import { canTransition, isTerminalState } from './state-machine';
import type {
  AgentAction,
  AgentContext,
  AgentDecision,
  AgentIntent,
  AgentMessageInput,
  AgentResult,
  AgentToolResultSummary,
  AgentTrace,
  GuardrailViolation,
  RedactedAgentContext,
} from './types';

// The orchestrator contract — Observe -> Identify workflow/state -> Check
// config -> Gather missing context -> Select tool -> Execute -> Validate
// -> Decide (guardrails run here) -> Update state -> Respond -> Trace.
// See plan.md §4.1/§4.5 and this task's approved plan for the full loop.
export interface MoveCoordinatorAgent {
  handleMessage(input: AgentMessageInput): Promise<AgentResult>;
}

export interface MoveCoordinatorAgentDeps {
  toolRegistry: ToolRegistry;
  // The orchestrator's dependency is the Repositories *interface*, never
  // a concrete `mocks/repositories/*` class — satisfies "no dependency
  // on concrete repositories." It is used for exactly two things: (1)
  // constructing each ToolContext for callTool (every governed read and
  // every mutation goes through the tool registry from there), and (2)
  // as the narrow AgentContextReader passed into assembleAgentContext,
  // which structurally only sees the read-only Pick'd subset and cannot
  // call a mutation even by accident. The orchestrator's own code below
  // never calls a repository mutation method directly — every state
  // change goes through callTool.
  repositories: Repositories;
  agentProvider: LLMAgentProvider;
}

function computeConfidence(
  validation: ValidateRequestResult,
  documentValidation: ValidateDocumentsResult
): number {
  let confidence = 0.95;
  confidence -= validation.warnings.length * 0.05;
  confidence -= validation.violatedPolicies.length * 0.15;
  confidence -= documentValidation.items.filter((i) => i.status === 'rejected').length * 0.1;
  return Math.max(0, Math.min(1, confidence));
}

function summarizeToolResult(tool: ToolName, result: unknown): string {
  if (result === undefined) return 'no result';
  switch (tool) {
    case 'validateMoveRequest': {
      const r = result as ValidateRequestResult;
      return r.valid
        ? 'valid, no violations'
        : `missing: [${r.missingFields.join(', ')}], violations: [${r.violatedPolicies.join(', ')}]`;
    }
    case 'validateDocuments': {
      const r = result as ValidateDocumentsResult;
      return r.allRequiredVerified
        ? 'all required documents verified'
        : `missing: [${r.missingKeys.join(', ')}]`;
    }
    case 'calculateMoveOutCharges': {
      const r = result as ChargeCalculationResult;
      return `${r.lineItems.length} line item(s), net refund ${r.currency} ${r.netRefundAmount}`;
    }
    case 'getCommunityPolicy': {
      const r = result as { id: string }[];
      return r.length > 0 ? `${r.length} clause(s) found` : 'not found';
    }
    default:
      return 'ok';
  }
}

function redactContext(context: AgentContext): RedactedAgentContext {
  const missing = context.checklist
    .filter((c) => c.required && c.status !== 'verified')
    .map((c) => c.key);
  return {
    communityId: context.session.communityId,
    requestId: context.request?.id,
    requestStatus: context.request?.status,
    requestType: context.request?.type,
    actorRole: context.session.actorRole,
    hasResident: Boolean(context.resident),
    hasCommunityConfig: Boolean(context.communityConfig),
    checklistSummary: {
      total: context.checklist.length,
      verified: context.checklist.filter((c) => c.status === 'verified').length,
      missing,
    },
    documentsSummary: {
      total: context.documents.length,
      verified: context.documents.filter((d) => d.status === 'verified').length,
    },
    policyTopicsRetrieved: context.policies.map((p) => p.topic),
    conversationTurnCount: context.conversation.length,
  };
}

interface Outcome {
  tier: AutonomyTier;
  violations: GuardrailViolation[];
  confidence: number;
  scenario: ReplyScenario;
  citedPolicyIds: PolicyId[];
  chargeResult?: ChargeCalculationResult;
}

export function createMoveCoordinatorAgent(deps: MoveCoordinatorAgentDeps): MoveCoordinatorAgent {
  return {
    async handleMessage(input: AgentMessageInput): Promise<AgentResult> {
      const turnId = generateId('turn');
      const startedAt = new Date().toISOString();
      const toolsCalled: ToolName[] = [];
      const toolResults: AgentToolResultSummary[] = [];
      const reasoningSummary: string[] = [];
      let toolPermissionDenied = false;
      let effectiveRequestId: RequestId | undefined = input.requestId;

      const callTool: CallTool = async <TInput, TOutput>(
        tool: ToolName,
        toolInput: TInput,
        actorOverride?: { actorId?: string; actorRole?: ActorRole }
      ): Promise<TOutput | undefined> => {
        // Bounded: a single turn may not make unbounded tool calls. See
        // plan.md §4.5/§4.8 — hitting the cap forces the turn to stop
        // rather than spiral. 12 comfortably covers the worst realistic
        // chain here (context assembly ~3, validate x2, up to 2 status
        // advances, charge calc, policy lookup, and a final recommend/
        // escalate call ~= 10) with headroom, while still being a real
        // bound, not an unbounded loop.
        if (toolsCalled.length >= 12) {
          // Distinct from a genuine tool failure (see the catch block
          // below) — the tool was never attempted at all, so it must not
          // be silently indistinguishable from one that ran and errored.
          toolResults.push({
            tool,
            success: false,
            summary: 'Tool call budget exceeded for this turn (12) — not attempted.',
          });
          return undefined;
        }
        toolsCalled.push(tool);
        const toolDef = deps.toolRegistry.get(tool);
        const toolContext: ToolContext = {
          repositories: deps.repositories,
          actorId: actorOverride?.actorId ?? input.actorId,
          actorRole: actorOverride?.actorRole ?? input.actorRole,
          requestId: effectiveRequestId,
          conversationId: input.conversationId,
          turnId,
        };
        try {
          const result = await deps.toolRegistry.execute<TInput, TOutput>(
            tool,
            toolInput,
            toolContext
          );
          toolResults.push({ tool, success: true, summary: summarizeToolResult(tool, result) });
          if (effectiveRequestId) {
            deps.repositories.agentActions.create({
              id: generateId('action'),
              requestId: effectiveRequestId,
              conversationId: input.conversationId,
              turnId,
              tool,
              tier: toolDef?.tier ?? 'guide',
              actorRole: toolContext.actorRole,
              input: toolInput as Record<string, unknown>,
              output: (result ?? {}) as Record<string, unknown>,
              success: true,
              createdAt: new Date().toISOString(),
            });
          }
          return result;
        } catch (err) {
          if (err instanceof ToolPermissionError) {
            toolPermissionDenied = true;
          }
          const message = err instanceof Error ? err.message : String(err);
          toolResults.push({ tool, success: false, summary: message });
          if (effectiveRequestId) {
            deps.repositories.agentActions.create({
              id: generateId('action'),
              requestId: effectiveRequestId,
              conversationId: input.conversationId,
              turnId,
              tool,
              tier: toolDef?.tier ?? 'guide',
              actorRole: toolContext.actorRole,
              input: toolInput as Record<string, unknown>,
              output: {},
              success: false,
              errorMessage: message,
              createdAt: new Date().toISOString(),
            });
          }
          return undefined;
        }
      };

      // The narrow reader — a real Repositories object structurally
      // satisfies this; assembleAgentContext only ever sees the Pick'd
      // read methods declared on AgentContextReader, nothing more.
      const contextReader: AgentContextReader = deps.repositories;

      let context = await assembleAgentContext(input, turnId, contextReader, callTool);
      context.intent = await deps.agentProvider.classifyIntent(input.content, context);
      const intent: AgentIntent = context.intent.intent;

      function finalize(outcome: {
        tier: AutonomyTier;
        replyParams: ReplyParams;
        violations?: GuardrailViolation[];
        confidence?: number;
        citedPolicyIds?: PolicyId[];
      }): AgentResult {
        const violations = outcome.violations ?? [];
        const confidence = outcome.confidence ?? 1;
        const citedPolicyIds = outcome.citedPolicyIds ?? [];
        const reviewRequired = requiresHumanReview(outcome.tier);

        const decision: AgentDecision = {
          tier: outcome.tier,
          summary: reasoningSummary[reasoningSummary.length - 1] ?? outcome.replyParams.scenario,
          decisionConfidence: confidence,
          requiresHumanReview: reviewRequired,
          guardrailViolations: violations,
          citedPolicyIds,
        };

        const lastTool = toolsCalled.at(-1);
        const action: AgentAction =
          lastTool !== undefined
            ? { kind: 'call_tool', tool: lastTool, input: {} }
            : { kind: 'respond_only' };

        const trace: AgentTrace = {
          turnId,
          requestId: context.request?.id,
          intent,
          intentConfidence: context.intent?.intentConfidence ?? 0,
          contextUsed: redactContext(context),
          toolsCalled,
          toolResults,
          reasoningSummary,
          decision,
          action,
          confidence,
          requiresHumanReview: reviewRequired,
          createdAt: startedAt,
        };

        return { reply: buildReply(outcome.replyParams), decision, trace };
      }

      // Integrity check: the request the client claims to be talking
      // about must actually belong to the community the client claims
      // to be in. Without this, a payload with a real requestId but a
      // mismatched communityId would validate that request against a
      // different community's notice periods, documents, and charge
      // rules — context.communityConfig above was fetched using
      // input.communityId *before* context.request was even resolved,
      // so nothing else catches this. The request record itself is the
      // authoritative source of its own community, never the caller's
      // claim about it.
      if (context.request && context.request.communityId !== input.communityId) {
        reasoningSummary.push(
          "The community specified doesn't match this request's own community — refusing to proceed."
        );
        return finalize({
          tier: 'escalate',
          replyParams: { scenario: 'escalate_generic' },
          violations: [
            {
              guardrail: 'unauthorized_action',
              message: "communityId does not match the request's own community.",
            },
          ],
        });
      }

      // A requestId was given but getMoveRequest denied it (not this
      // actor's request) — this must surface as unauthorized_action, not
      // silently fall through to "no request exists yet, maybe start
      // one." The tool has already refused to leak whether the request
      // exists at all.
      if (input.requestId && !context.request && toolPermissionDenied) {
        reasoningSummary.push('Access to the requested record was denied for this actor.');
        const guardrailResult = runGuardrails({
          proposedTier: 'guide',
          actorRole: input.actorRole,
          communityConfig: context.communityConfig,
          toolPermissionDenied: true,
        });
        return finalize({
          tier: guardrailResult.tier,
          replyParams: { scenario: 'escalate_generic' },
          violations: guardrailResult.violations,
        });
      }

      // ---- Free-standing question: answered the same way whether or not
      // a request exists yet, always via a real policy lookup — never
      // answered from the model's own "knowledge." A miss is reported
      // honestly, not filled in with an invented policy. ----
      if (intent === 'ask_question') {
        const policyTopic = context.intent?.extractedFields?.policyTopic as string | undefined;
        if (policyTopic) {
          const policies = await callTool<
            { communityId: string; topic: string },
            CommunityPolicy[]
          >('getCommunityPolicy', { communityId: input.communityId, topic: policyTopic });

          // A failed tool call (`undefined`) is distinct from a
          // successful call that found nothing (`[]`) — conflating them
          // would have the agent falsely tell the resident "no policy
          // is defined" when the real problem is that it couldn't check
          // at all. See plan.md's demo Scenario 10 (tool failure).
          if (policies === undefined) {
            reasoningSummary.push(
              `Could not check the policy on ${policyTopic.replace(/_/g, ' ')} this turn.`
            );
            return finalize({ tier: 'escalate', replyParams: { scenario: 'escalate_generic' } });
          }

          // More than one clause for the same topic is a real policy
          // configuration problem, not something to silently resolve by
          // picking the first result — the agent has no basis for
          // deciding which clause is authoritative, so it must not
          // guess. Exercises guardrails.ts's existing policyAmbiguity
          // `conflicting` check, which nothing previously ever set.
          if (policies.length > 1) {
            context.policies.push(...policies);
            reasoningSummary.push(
              `Found ${policies.length} conflicting policy clauses for "${policyTopic.replace(/_/g, ' ')}" — cannot answer without guessing.`
            );
            const guardrailResult = runGuardrails({
              proposedTier: 'guide',
              actorRole: input.actorRole,
              communityConfig: context.communityConfig,
              policyLookup: { topic: policyTopic, found: true, conflicting: true },
            });
            return finalize({
              tier: guardrailResult.tier,
              replyParams: { scenario: 'escalate_policy_ambiguity' },
              violations: guardrailResult.violations,
            });
          }

          if (policies.length > 0) {
            context.policies.push(...policies);
            reasoningSummary.push(`Checked community policy on ${policyTopic.replace(/_/g, ' ')}.`);

            // A charges question ("how much will I be charged?") against
            // an active move-out gets a real, tool-computed projection
            // alongside the policy text — not just the policy prose. This
            // is the "calculate deterministic charges through a tool" +
            // "explain charges clearly" responsibilities working on
            // demand, not only at the final recommend/escalate step.
            if (policyTopic === 'security_deposit' && context.request?.type === 'move_out') {
              const chargeResult = await callTool<
                { requestId: RequestId },
                ChargeCalculationResult
              >('calculateMoveOutCharges', { requestId: context.request.id });
              reasoningSummary.push('Calculated a projected move-out settlement.');
              return finalize({
                tier: 'guide',
                replyParams: { scenario: 'ask_question_with_charges', policies, chargeResult },
                citedPolicyIds: policies.map((p) => p.id),
              });
            }

            return finalize({
              tier: 'guide',
              replyParams: { scenario: 'ask_question_with_policy', policies },
              citedPolicyIds: policies.map((p) => p.id),
            });
          }
          reasoningSummary.push(
            `No policy is defined for "${policyTopic.replace(/_/g, ' ')}" in this community.`
          );
          return finalize({ tier: 'guide', replyParams: { scenario: 'ask_question_no_policy' } });
        }
        reasoningSummary.push('Answered a general question; no specific policy topic matched.');
        return finalize({ tier: 'guide', replyParams: { scenario: 'ask_question_no_policy' } });
      }

      // ---- Charge waiver / dispute: the agent may never grant this
      // itself (guardrails.ts's policy_exception), regardless of intent
      // phrasing or which status the request is in. Always routes to a
      // human admin, and always says so plainly rather than deflecting. ----
      if (intent === 'dispute_charge') {
        if (!context.request) {
          reasoningSummary.push('No active move-out request on file to review a charge for.');
          return finalize({ tier: 'guide', replyParams: { scenario: 'charge_waiver_no_request' } });
        }
        if (context.request.status === 'escalated') {
          reasoningSummary.push('Already escalated; a charge waiver still requires admin approval.');
          return finalize({ tier: 'guide', replyParams: { scenario: 'status_escalated' } });
        }
        if (isTerminalState(context.request.status)) {
          reasoningSummary.push('Request is closed; directing the resident to contact an admin directly.');
          return finalize({ tier: 'guide', replyParams: { scenario: 'charge_waiver_terminal' } });
        }
        reasoningSummary.push(
          'Resident asked to waive or dispute a charge — the agent cannot grant this; requires admin approval.'
        );
        const guardrailResult = runGuardrails({
          proposedTier: 'guide',
          actorRole: input.actorRole,
          communityConfig: context.communityConfig,
          isExceptionRequest: true,
        });
        await callTool(
          'escalateToAdmin',
          {
            requestId: context.request.id,
            reason: 'Resident requested a charge waiver or dispute.',
            urgency: 'medium',
          },
          { actorRole: 'system' }
        );
        reasoningSummary.push('Admin review required.');
        return finalize({
          tier: guardrailResult.tier,
          replyParams: { scenario: 'charge_waiver_escalated' },
          violations: guardrailResult.violations,
        });
      }

      // ---- Cancellation: a resident's own act on their own request,
      // legal only from the statuses the state machine already allows
      // (draft / information_required / scheduled — never once under
      // admin review or later, without an admin's involvement). Checked
      // ahead of the "no request" block below so both the with- and
      // without-a-request cases are handled explicitly, never silently
      // falling through to the generic validate/advance pipeline as a
      // no-op. ----
      if (intent === 'cancel_request') {
        if (!context.request) {
          reasoningSummary.push('No active request on file to cancel.');
          return finalize({ tier: 'guide', replyParams: { scenario: 'nothing_to_cancel' } });
        }
        if (!canTransition(context.request.status, 'cancelled', input.actorRole)) {
          reasoningSummary.push(
            `Request is in status "${context.request.status}" — cannot be cancelled directly by the resident at this stage.`
          );
          return finalize({
            tier: 'guide',
            replyParams: { scenario: 'cannot_cancel', request: context.request },
          });
        }
        const cancelled = await callTool<
          { requestId: RequestId; patch: Record<string, unknown> },
          MoveRequest
        >('updateMoveRequest', { requestId: context.request.id, patch: { status: 'cancelled' } });
        if (!cancelled) {
          reasoningSummary.push('Could not cancel the request this turn.');
          return finalize({ tier: 'escalate', replyParams: { scenario: 'escalate_generic' } });
        }
        context.request = cancelled;
        reasoningSummary.push("Request cancelled at the resident's request.");
        return finalize({ tier: 'guide', replyParams: { scenario: 'request_cancelled' } });
      }

      // ---- No request in context yet ----
      if (!context.request) {
        if (intent === 'start_move_in' || intent === 'start_move_out') {
          if (!input.unitId) {
            reasoningSummary.push(
              'Resident wants to start a request but has not specified a unit.'
            );
            return finalize({ tier: 'guide', replyParams: { scenario: 'missing_unit' } });
          }

          const type = intent === 'start_move_in' ? 'move_in' : 'move_out';
          const extracted = context.intent?.extractedFields ?? {};
          const requestedDate = extracted.requestedDate as string | undefined;

          // Move-out always needs an explicit intended date from the
          // resident — it drives the notice-period check and any
          // short-notice charge, so it is never defaulted or guessed.
          if (type === 'move_out' && !requestedDate) {
            reasoningSummary.push(
              'Resident wants to start a move-out but has not given an intended move-out date.'
            );
            return finalize({
              tier: 'guide',
              replyParams: { scenario: 'missing_move_out_date' },
            });
          }

          const created = await callTool<CreateMoveRequestInput, MoveRequest>('createMoveRequest', {
            communityId: input.communityId,
            residentId: input.actorId,
            unitId: input.unitId,
            type,
            requestedDate: requestedDate ?? new Date().toISOString().slice(0, 10),
            occupantCount: extracted.occupantCount as number | undefined,
            noticeGivenAt: type === 'move_out' ? new Date().toISOString() : undefined,
          });

          if (!created) {
            reasoningSummary.push('Could not start the request (see tool error).');
            return finalize({
              tier: 'escalate',
              replyParams: { scenario: 'escalate_generic' },
              violations: toolPermissionDenied
                ? [
                    {
                      guardrail: 'unauthorized_action',
                      message: 'Not permitted to create this request.',
                    },
                  ]
                : [
                    {
                      guardrail: 'invalid_state_transition',
                      message: toolResults.at(-1)?.summary ?? 'creation failed',
                    },
                  ],
            });
          }

          effectiveRequestId = created.id;
          reasoningSummary.push(`Started a new ${type.replace('_', '-')} request (${created.id}).`);
          context = await assembleAgentContext(
            { ...input, requestId: created.id },
            turnId,
            contextReader,
            callTool
          );
          context.intent = { intent, extractedFields: extracted, intentConfidence: 1 };

          // Explain the move-out policy (notice period, in plain terms)
          // right away, on the same turn the request is started — this
          // is the concrete mechanism for "explain move-out policy" /
          // "check notice requirements" as agent responsibilities, not
          // something the resident has to separately ask for.
          if (type === 'move_out') {
            const noticePolicies = await callTool<
              { communityId: string; topic: string },
              CommunityPolicy[]
            >('getCommunityPolicy', { communityId: input.communityId, topic: 'notice_period' });
            if (noticePolicies && noticePolicies.length > 0) {
              context.policies.push(...noticePolicies);
            }
            reasoningSummary.push('Checked community move-out policy and notice period.');
          }
        } else {
          // ask_question is already handled above, before this block —
          // anything reaching here is genuinely ambiguous.
          reasoningSummary.push(`No active request; classified intent as "${intent}".`);
          return finalize({ tier: 'guide', replyParams: { scenario: 'ambiguous' } });
        }
      }

      const request = context.request;
      if (!request) {
        // Should be unreachable — creation above either populated this or returned early.
        return finalize({ tier: 'guide', replyParams: { scenario: 'ambiguous' } });
      }

      // ---- Status short-circuits: no re-validation needed ----
      if (request.status === 'escalated') {
        reasoningSummary.push('Request is already escalated; awaiting admin resolution.');
        return finalize({ tier: 'guide', replyParams: { scenario: 'status_escalated' } });
      }
      if (isTerminalState(request.status)) {
        const latestNote: RequestNote | undefined = context.notes.at(-1);
        reasoningSummary.push(`Request is in a terminal state ("${request.status}").`);

        // An admin's own note (e.g. a rejection reason) is written for
        // the internal review record, not authored as a resident-facing
        // message — echoing it verbatim would expose internal
        // deliberation this actor was never authorized to see. This is
        // the one place in the orchestrator where a note's raw text
        // could otherwise reach a resident's reply unfiltered; see
        // guardrails.ts's sensitiveInformation check.
        const withholdNote = latestNote?.authorType === 'admin';
        let violations: GuardrailViolation[] | undefined;
        if (withholdNote) {
          violations = runGuardrails({
            proposedTier: 'guide',
            actorRole: input.actorRole,
            communityConfig: context.communityConfig,
            exposesUnauthorizedPII: true,
          }).violations;
          reasoningSummary.push(
            "Withholding the admin's internal note text from the resident-facing reply."
          );
        }

        return finalize({
          tier: 'guide',
          replyParams: {
            scenario: 'status_terminal',
            request,
            latestNote: withholdNote ? undefined : latestNote,
          },
          violations,
        });
      }
      if (request.status === 'scheduled') {
        reasoningSummary.push('Request is approved and scheduled.');
        return finalize({ tier: 'guide', replyParams: { scenario: 'status_scheduled', request } });
      }
      if (request.status === 'approved') {
        reasoningSummary.push('Request is approved; awaiting a move slot.');
        return finalize({
          tier: 'guide',
          replyParams: { scenario: 'status_approved_awaiting_schedule', request },
        });
      }

      // ---- provide_info: apply a structured field the resident just
      // supplied (e.g. occupant count) before re-validating. Uses the
      // real actor role, not a 'system' override — this is the resident
      // updating their own request, same as updateMoveRequestTool's
      // authorization='self' rule expects. Re-validation right after
      // means a wrong or out-of-range value is caught immediately, never
      // silently trusted. ----
      if (intent === 'provide_info' && request.type === 'move_in') {
        const occupantCount = context.intent?.extractedFields?.occupantCount;
        if (typeof occupantCount === 'number') {
          if (request.occupantCount === undefined) {
            const updated = await callTool<
              { requestId: RequestId; patch: Record<string, unknown> },
              MoveRequest
            >('updateMoveRequest', { requestId: request.id, patch: { occupantCount } });
            if (updated) {
              context.request = updated;
              reasoningSummary.push(`Recorded occupant count: ${occupantCount}.`);
            }
          } else if (request.occupantCount !== occupantCount) {
            // Genuinely conflicting information — never silently
            // overwritten, averaged, or guessed at. The agent asks which
            // number is correct instead (demo Scenario 3: "ambiguous
            // information").
            reasoningSummary.push(
              `Received a conflicting occupant count (${occupantCount}) — ${request.occupantCount} is already on file. Asking for clarification instead of guessing.`
            );
            return finalize({
              tier: 'guide',
              replyParams: {
                scenario: 'ambiguous_occupant_count',
                occupantCountConflict: { existing: request.occupantCount, incoming: occupantCount },
              },
            });
          }
        }
      }

      // ---- Validate (steps 3-4: check config, determine missing info) ----
      const validation = await callTool<{ requestId: RequestId }, ValidateRequestResult>(
        'validateMoveRequest',
        {
          requestId: request.id,
        }
      );
      const documentValidation = await callTool<{ requestId: RequestId }, ValidateDocumentsResult>(
        'validateDocuments',
        { requestId: request.id }
      );

      if (!validation || !documentValidation) {
        reasoningSummary.push('Could not complete validation this turn.');
        return finalize({ tier: 'escalate', replyParams: { scenario: 'escalate_generic' } });
      }

      // Ready to advance means nothing is factually MISSING — a policy
      // VIOLATION (e.g. short notice) is a different concern, handled at
      // the recommend/escalate stage below via `validation.violatedPolicies`,
      // and must not block a request from ever reaching under_review. See
      // plan.md §4.9(d): a short-notice move-out is still valid, it just
      // carries charges/escalation risk once it's actually decided on.
      const readyForReview =
        validation.missingFields.length === 0 && documentValidation.allRequiredVerified;

      // ---- Auto-advance where safe (steps 5-9: select/execute/validate/decide/update) ----
      // context.request may be fresher than `request` if provide_info
      // patched a field just above.
      let current = context.request ?? request;
      if (!readyForReview) {
        if (current.status === 'submitted') {
          const updated = await callTool<
            { requestId: RequestId; patch: Record<string, unknown> },
            MoveRequest
          >(
            'updateMoveRequest',
            { requestId: current.id, patch: { status: 'information_required' } },
            { actorRole: 'system' }
          );
          if (updated) current = updated;
        }

        reasoningSummary.push(
          validation.missingFields.length > 0
            ? `${validation.missingFields.length} field(s) still needed: ${validation.missingFields.join(', ')}.`
            : `${documentValidation.missingKeys.length} document(s) still required: ${documentValidation.missingKeys.join(', ')}.`
        );

        const scenario: ReplyScenario =
          validation.missingFields.length > 0 ? 'missing_fields' : 'missing_documents';
        const guardrailResult = runGuardrails({
          proposedTier: 'guide',
          actorRole: 'system',
          communityConfig: context.communityConfig,
          validation,
          documentValidation,
        });
        return finalize({
          tier: guardrailResult.tier,
          replyParams: {
            scenario,
            validation,
            documentValidation,
            policies: context.policies,
            request: current,
          },
          violations: guardrailResult.violations,
        });
      }

      // Clean — advance as far as the state machine allows this turn.
      if (current.status === 'draft' || current.status === 'information_required') {
        const toSubmitted = await callTool<
          { requestId: RequestId; patch: Record<string, unknown> },
          MoveRequest
        >(
          'updateMoveRequest',
          { requestId: current.id, patch: { status: 'submitted' } },
          { actorRole: 'system' }
        );
        if (toSubmitted) {
          current = toSubmitted;
          reasoningSummary.push('Request submitted successfully.');
        }
      }
      // autonomy.allowAutoStatusAdvance is a per-community workflow
      // variation, not a hardcoded agent behavior: when a community sets
      // it to false, the agent deliberately stops here rather than
      // deciding on its own that the case is ready for review — an
      // admin must move it forward manually (state-machine.ts allows
      // 'admin' on this exact transition for precisely this case). Every
      // community that leaves it true (the default) sees no change at
      // all — same auto-advance as always.
      const allowAutoStatusAdvance = context.communityConfig?.autonomy.allowAutoStatusAdvance ?? true;
      if (current.status === 'submitted' && allowAutoStatusAdvance) {
        const toReview = await callTool<
          { requestId: RequestId; patch: Record<string, unknown> },
          MoveRequest
        >(
          'updateMoveRequest',
          { requestId: current.id, patch: { status: 'under_review' } },
          { actorRole: 'system' }
        );
        if (toReview) {
          current = toReview;
          reasoningSummary.push('All documents verified — request moved to admin review.');
        }
      }
      context.request = current;

      if (current.status === 'submitted' && !allowAutoStatusAdvance) {
        reasoningSummary.push(
          'This community requires requests to be moved to review manually — leaving as submitted for an admin.'
        );
        return finalize({
          tier: 'guide',
          replyParams: { scenario: 'ready_awaiting_manual_advance', request: current },
        });
      }

      if (current.status !== 'under_review') {
        // Couldn't advance (e.g. a guardrail elsewhere blocked the tool call).
        reasoningSummary.push('Unable to advance this request further this turn.');
        return finalize({ tier: 'escalate', replyParams: { scenario: 'escalate_generic' } });
      }

      // ---- Decide (step 8): recommend, or escalate on policy/financial guardrails ----
      // context.communityConfig is genuinely optional (getCommunityConfigTool
      // returns undefined, not a thrown error, for an unknown community —
      // see plan.md's Security & Agent-Safety Review). Everything below
      // this point reads it unconditionally, so a missing config must be
      // caught here — a graceful escalation, not an unhandled crash from
      // the cast that used to happen unconditionally.
      if (!context.communityConfig) {
        reasoningSummary.push('No community configuration is available for this request.');
        return finalize({ tier: 'escalate', replyParams: { scenario: 'escalate_generic' } });
      }
      const config = context.communityConfig;
      let outcome: Outcome;

      if (current.type === 'move_in') {
        const moveInPolicies = await callTool<
          { communityId: string; topic: string },
          CommunityPolicy[]
        >('getCommunityPolicy', { communityId: current.communityId, topic: 'move_in_documents' });
        context.policies.push(...(moveInPolicies ?? []));
        reasoningSummary.push('Checked community move-in policy.');

        const confidence = computeConfidence(validation, documentValidation);
        const guardrailResult = runGuardrails({
          proposedTier: 'recommend',
          actorRole: 'system',
          communityConfig: config,
          decisionConfidence: confidence,
        });
        const citedPolicyIds = (moveInPolicies ?? []).map((p) => p.id);
        if (guardrailResult.tier === 'recommend') {
          await callTool(
            'recommendAction',
            {
              requestId: current.id,
              action: 'approve',
              rationale: 'All required documents verified; no policy violations.',
              confidence,
              citedPolicyIds,
            },
            { actorRole: 'system' }
          );
          reasoningSummary.push('Recommended approval to the community admin.');
        } else {
          await callTool(
            'escalateToAdmin',
            {
              requestId: current.id,
              reason: guardrailResult.violations.map((v) => v.message).join(' '),
              urgency: 'medium',
            },
            { actorRole: 'system' }
          );
          reasoningSummary.push(
            'Confidence or policy check failed; escalated instead of recommending.'
          );
          reasoningSummary.push('Admin review required.');
        }
        outcome = {
          tier: guardrailResult.tier,
          violations: guardrailResult.violations,
          confidence,
          scenario: guardrailResult.tier === 'recommend' ? 'recommend_approve' : 'escalate_generic',
          citedPolicyIds,
        };
      } else {
        outcome = await decideMoveOutOutcome({
          request: current,
          validation,
          documentValidation,
          config,
          callTool,
          reasoningSummary,
          context,
        });
      }

      return finalize({
        tier: outcome.tier,
        replyParams: {
          scenario: outcome.scenario,
          request: current,
          chargeResult: outcome.chargeResult,
          policies: context.policies,
          guardrailViolations: outcome.violations,
        },
        violations: outcome.violations,
        confidence: outcome.confidence,
        citedPolicyIds: outcome.citedPolicyIds,
      });
    },
  };
}

async function decideMoveOutOutcome(args: {
  request: MoveRequest;
  validation: ValidateRequestResult;
  documentValidation: ValidateDocumentsResult;
  config: CommunityConfiguration;
  callTool: CallTool;
  reasoningSummary: string[];
  context: AgentContext;
}): Promise<Outcome> {
  const { request, validation, documentValidation, config, callTool, reasoningSummary, context } =
    args;

  const shortNoticeNotPermitted = validation.violatedPolicies.includes(
    'notice_period_short_not_permitted'
  );
  const shortNoticeWithPenalty = validation.violatedPolicies.includes('notice_period_short');

  if (shortNoticeNotPermitted) {
    const exceptionPolicies = await callTool<
      { communityId: string; topic: string },
      { id: PolicyId; topic: string }[]
    >('getCommunityPolicy', { communityId: request.communityId, topic: 'notice_period_exception' });
    context.policies.push(...((exceptionPolicies as never[]) ?? []));
    const found = (exceptionPolicies ?? []).length > 0;

    const guardrailResult = runGuardrails({
      proposedTier: 'recommend',
      actorRole: 'system',
      communityConfig: config,
      isExceptionRequest: true,
      policyLookup: { topic: 'notice_period_exception', found },
    });

    reasoningSummary.push(
      found
        ? 'Notice period not met; a defined exception process exists but requires admin judgment.'
        : 'Notice period not met and no exception policy is defined for this community.'
    );
    reasoningSummary.push('Admin review required.');

    await callTool(
      'escalateToAdmin',
      {
        requestId: request.id,
        reason: guardrailResult.violations.map((v) => v.message).join(' '),
        urgency: 'high',
      },
      { actorRole: 'system' }
    );

    return {
      tier: 'escalate',
      violations: guardrailResult.violations,
      confidence: 0.3,
      scenario: found ? 'escalate_exception' : 'escalate_policy_ambiguity',
      citedPolicyIds: (exceptionPolicies ?? []).map((p) => p.id),
    };
  }

  const chargeResult = await callTool<{ requestId: RequestId }, ChargeCalculationResult>(
    'calculateMoveOutCharges',
    { requestId: request.id }
  );
  const noticePolicies = await callTool<
    { communityId: string; topic: string },
    { id: PolicyId; topic: string }[]
  >('getCommunityPolicy', { communityId: request.communityId, topic: 'notice_period' });
  context.policies.push(...((noticePolicies as never[]) ?? []));

  const confidence = computeConfidence(validation, documentValidation);
  const isFinancialAction = shortNoticeWithPenalty || (chargeResult?.totalDeductions ?? 0) > 0;

  const guardrailResult = runGuardrails({
    proposedTier: 'recommend',
    actorRole: 'system',
    communityConfig: config,
    decisionConfidence: confidence,
    isFinancialAction,
    chargeResult,
  });

  if (guardrailResult.tier === 'recommend') {
    await callTool(
      'recommendAction',
      {
        requestId: request.id,
        action: shortNoticeWithPenalty ? 'approve_with_charges' : 'approve',
        rationale: shortNoticeWithPenalty
          ? 'Valid but short-notice penalty and/or deductions apply per policy.'
          : 'All checks passed; no deductions apply.',
        confidence,
        citedPolicyIds: (noticePolicies ?? []).map((p) => p.id),
      },
      { actorRole: 'system' }
    );
    reasoningSummary.push(
      shortNoticeWithPenalty
        ? 'Recommended approval with charges to the community admin.'
        : 'Recommended approval to the community admin.'
    );
  } else {
    await callTool(
      'escalateToAdmin',
      {
        requestId: request.id,
        reason: guardrailResult.violations.map((v) => v.message).join(' '),
        urgency: 'high',
      },
      { actorRole: 'system' }
    );
    reasoningSummary.push(
      'Financial or confidence guardrail triggered; escalated instead of recommending.'
    );
    reasoningSummary.push('Admin review required.');
  }

  return {
    tier: guardrailResult.tier,
    violations: guardrailResult.violations,
    confidence,
    scenario:
      guardrailResult.tier === 'recommend'
        ? shortNoticeWithPenalty
          ? 'recommend_approve_with_charges'
          : 'recommend_approve'
        : 'escalate_generic',
    chargeResult,
    citedPolicyIds: (noticePolicies ?? []).map((p) => p.id),
  };
}
