import type { LLMAgentProvider } from './agent-provider';
import type { AgentContext, AgentIntentClassification } from './types';

// Best-effort, advisory-only slot extraction — the orchestrator always
// re-validates anything extracted here via the real validateMoveRequest
// tool before trusting it. Never treated as ground truth on its own.
function extractOccupantCount(text: string): number | undefined {
  const withUnit = text.match(/(\d+)\s*(occupant|people|person|resident)/);
  if (withUnit) return Number(withUnit[1]);
  // A bare number in a follow-up turn ("2") is almost always answering
  // whatever the agent just asked for — the orchestrator only applies
  // this when a field is actually pending, so a wrong guess here is
  // caught immediately by re-validation.
  const bare = text.trim();
  return /^\d+$/.test(bare) ? Number(bare) : undefined;
}

function extractDate(text: string): string | undefined {
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : undefined;
}

function isQuestionPhrasing(text: string): boolean {
  const trimmed = text.trim();
  return (
    /\?\s*$/.test(trimmed) ||
    /^(what|how|when|why|can|could|do|does|is|are|will|should|where)\b/.test(trimmed)
  );
}

// A request to waive/reduce/dispute a charge — checked ahead of general
// question phrasing so "Can you waive this charge?" always routes to
// dispute_charge, never to a plain policy Q&A. Requires BOTH a
// charge-word and a dispute-word, so "Can you explain this charge?" (no
// dispute-word) still falls through to the normal, grounded ask_question
// path instead of short-circuiting into an escalation.
function isChargeDisputeAsk(text: string): boolean {
  const mentionsCharge = /\b(charges?|fees?|penalt(?:y|ies)|deductions?)\b/.test(text);
  const mentionsDispute =
    /\b(waive|waiver|dispute|contest|appeal|remove|reduce|lower|cancel|reverse)\b/.test(text) ||
    /don'?t (want to )?pay|refuse to pay|not pay/.test(text);
  return mentionsCharge && mentionsDispute;
}

// Best-effort topic inference for a policy question — deterministic
// keyword matching, not NLU. The orchestrator treats this only as a
// hint: it still calls the real getCommunityPolicy tool and answers
// from whatever (if anything) that tool actually returns, never from
// this guess directly. See plan.md §4.4 ("never invent community
// policies"). `requestType` disambiguates the generic "document" fallback
// between move-in and move-out document requirements.
function inferPolicyTopic(
  text: string,
  requestType?: 'move_in' | 'move_out'
): string | undefined {
  // More specific first: "emergency exception to the notice period"
  // should resolve to the exception topic, not the general one.
  if (/exception|waive|emergency/.test(text)) return 'notice_period_exception';
  if (/notice period|days?\s*notice|how (much|many) notice/.test(text)) return 'notice_period';
  if (/deposit|refund|charges?|fees?|penalt(?:y|ies)|deductions?/.test(text))
    return 'security_deposit';
  if (/\bnoc\b|no objection/.test(text)) return 'noc_requirement';
  if (/inspection/.test(text)) return 'inspection_process';
  if (/slot|schedule|book|elevator|loading dock/.test(text)) return 'move_slot_booking';
  if (/dues|maintenance/.test(text)) return 'dues_clearance';
  if (/document|paperwork|upload|proof|checklist/.test(text))
    return requestType === 'move_out' ? 'move_out_documents' : 'move_in_documents';
  return undefined;
}

// Deterministic, rule-based, zero-network default. Same input always
// produces the same output; there is no call to any external service.
// This is why the whole application runs with `npm install && npm run
// dev` and no API key. A real, Claude-backed provider is a future
// swap-in behind the same LLMAgentProvider interface — see
// lib/container.ts for where the default is selected.
export class MockAgentProvider implements LLMAgentProvider {
  readonly name = 'mock-deterministic';

  async classifyIntent(message: string, context: AgentContext): Promise<AgentIntentClassification> {
    const text = message.toLowerCase();

    // Excludes an obvious negation ("I don't want to cancel, I just have
    // a question") — worth the extra care now that cancel_request is a
    // real mutation (see move-coordinator.agent.ts), not a dead intent.
    if (/\bcancel\b/.test(text) && !/\b(don'?t|do not|won'?t|will not|never)\b.{0,20}\bcancel\b/.test(text)) {
      return { intent: 'cancel_request', intentConfidence: 0.9 };
    }

    if (/\bstatus\b|\bwhat'?s happening\b|\bany update\b/.test(text)) {
      return { intent: 'request_status', intentConfidence: 0.85 };
    }

    // Checked ahead of question phrasing: a charge waiver/dispute is
    // actionable (must be routed to an admin), not merely informational,
    // even though it's usually phrased as a question ("Can you waive
    // this charge?").
    if (isChargeDisputeAsk(text)) {
      return { intent: 'dispute_charge', intentConfidence: 0.85 };
    }

    // Checked before start_move_in/out: "What documents do I need for
    // move-in?" is a question ABOUT the process, not a command to start
    // it — matching on "move-in" first would misfire here.
    if (isQuestionPhrasing(text)) {
      const policyTopic = inferPolicyTopic(text, context.request?.type);
      // An exception/waiver ask against a request that's already in
      // flight is actionable, not merely informational — e.g. "can you
      // waive the notice requirement?" on an active move-out should be
      // evaluated (and, if warranted, escalated) by the normal pipeline,
      // not answered as a standalone policy question. Falling through
      // here (rather than returning ask_question) lets it do that.
      const isActionableExceptionAsk =
        policyTopic === 'notice_period_exception' && Boolean(context.request);
      if (!isActionableExceptionAsk) {
        return {
          intent: 'ask_question',
          intentConfidence: 0.6,
          extractedFields: policyTopic ? { policyTopic } : undefined,
        };
      }
    }

    if (context.session.actorRole === 'admin' && /\bapprove\b|\breject\b|\boverride\b/.test(text)) {
      return { intent: 'admin_review_action', intentConfidence: 0.8 };
    }

    if (/move[-\s]?in/.test(text)) {
      const extractedFields: Record<string, unknown> = {};
      const occupantCount = extractOccupantCount(text);
      const requestedDate = extractDate(text);
      if (occupantCount !== undefined) extractedFields.occupantCount = occupantCount;
      if (requestedDate !== undefined) extractedFields.requestedDate = requestedDate;
      return { intent: 'start_move_in', intentConfidence: 0.9, extractedFields };
    }

    if (/move[-\s]?out/.test(text)) {
      const extractedFields: Record<string, unknown> = {};
      const requestedDate = extractDate(text);
      if (requestedDate !== undefined) extractedFields.requestedDate = requestedDate;
      return { intent: 'start_move_out', intentConfidence: 0.9, extractedFields };
    }

    if (context.request && /\d/.test(text)) {
      // A number in a follow-up turn against an existing request usually
      // means "here's the field you asked for" (occupant count, a date, ...).
      const extractedFields: Record<string, unknown> = {};
      const occupantCount = extractOccupantCount(text);
      if (occupantCount !== undefined) extractedFields.occupantCount = occupantCount;
      return { intent: 'provide_info', intentConfidence: 0.7, extractedFields };
    }

    if (/\bpolicy\b|\bnotice period\b|\bdeposit\b|\bdocument\b/.test(text)) {
      const policyTopic = inferPolicyTopic(text, context.request?.type);
      return {
        intent: 'ask_question',
        intentConfidence: 0.55,
        extractedFields: policyTopic ? { policyTopic } : undefined,
      };
    }

    return { intent: 'ambiguous', intentConfidence: 0.3 };
  }
}
