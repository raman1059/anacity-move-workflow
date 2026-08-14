import type {
  ActorRole,
  AutonomyTier,
  Charge,
  ChecklistItem,
  Community,
  CommunityConfiguration,
  CommunityId,
  CommunityPolicy,
  ConversationId,
  Document,
  MoveRequest,
  MoveRequestStatus,
  AgentMessage as MoveRequestMessage,
  PolicyId,
  PolicyTopic,
  RequestId,
  RequestNote,
  Resident,
  ToolName,
  Unit,
  UnitId,
} from '../domain';

// --- Intent classification (the ONLY job an LLMAgentProvider does — see
// agent-provider.ts. Tool selection, decisioning, and response text are
// all deterministic orchestrator code, never delegated to the provider.
// This is what makes autonomy tiers structurally unbypassable rather than
// merely documented.) ---
export type AgentIntent =
  | 'start_move_in'
  | 'start_move_out'
  | 'provide_info'
  | 'ask_question'
  | 'request_status'
  | 'admin_review_action'
  | 'cancel_request'
  // A request to waive, reduce, or dispute a charge — distinct from a
  // plain policy question. The agent may never grant this itself (see
  // guardrails.ts's policy_exception guardrail); it always escalates.
  | 'dispute_charge'
  | 'ambiguous';

export interface AgentIntentClassification {
  intent: AgentIntent;
  extractedFields?: Record<string, unknown>;
  // Only ever triggers the 'ambiguous' fallback path. Never gates a
  // guardrail or a tier — see AgentDecision.decisionConfidence for the
  // number that actually matters for autonomy decisions.
  intentConfidence: number;
}

// --- Cumulative per-turn context. Rebuilt fresh each run from governed
// tool calls (resident, community config, policy, request, slots) plus a
// handful of ungoverned context-assembly reads (see context-reader.ts).
// Never trusted from prior-turn memory — see plan.md §4.1. ---
export interface AgentContext {
  session: {
    communityId: CommunityId;
    requestId?: RequestId;
    actorId: string;
    actorRole: ActorRole;
    turnId: string;
    conversationId?: ConversationId;
  };
  resident?: Resident;
  unit?: Unit;
  community?: Community;
  communityConfig?: CommunityConfiguration;
  request?: MoveRequest;
  workflowState: {
    current: MoveRequestStatus | 'not_started';
    allowedTransitions: MoveRequestStatus[];
    previousStatus?: MoveRequestStatus;
  };
  checklist: ChecklistItem[];
  documents: Document[];
  charge?: Charge;
  // Windowed — most-recent-N only, not the full history.
  conversation: MoveRequestMessage[];
  // Only clauses actually retrieved this turn, topic-scoped — never the
  // full policy set. See guardrails.ts's policy_ambiguity guardrail.
  policies: CommunityPolicy[];
  notes: RequestNote[];
  intent?: AgentIntentClassification;
}

// --- The orchestrator's own execution phase within a single run, mapped
// 1:1 onto the 11 numbered steps of the loop. This is "where in the loop
// we are," distinct from AgentDecision.tier ("what was decided"). ---
export type AgentState =
  | 'observing' // 1. receive context
  | 'identifying_workflow' // 2. identify workflow + current state
  | 'checking_config' // 3. check community configuration
  | 'gathering_context' // 4. determine whether information is missing
  | 'selecting_tool' // 5. select the appropriate tool
  | 'executing_tool' // 6. execute the tool
  | 'validating_result' // 7. validate the tool result
  | 'deciding' // 8. determine the next safe action (guardrails run here)
  | 'updating_state' // 9. update workflow state when allowed
  | 'responding' // 10. produce a human-readable response
  | 'done'; // 11. trace finalized

export type GuardrailKey =
  | 'missing_data'
  | 'invalid_state_transition'
  | 'unauthorized_action'
  | 'policy_ambiguity'
  | 'low_confidence'
  | 'financial_decision'
  | 'policy_exception'
  | 'sensitive_information';

export interface GuardrailViolation {
  guardrail: GuardrailKey;
  message: string;
}

// --- The tier-classified outcome of a turn — the judgment. ---
export interface AgentDecision {
  tier: AutonomyTier;
  // One concise sentence. Not chain-of-thought — see AgentTrace.reasoningSummary.
  summary: string;
  // Computed by the orchestrator from structured signals (validation
  // completeness, policy-lookup misses, financial impact) — never an LLM
  // self-report. This is the only confidence number any guardrail reads.
  decisionConfidence: number;
  requiresHumanReview: boolean;
  guardrailViolations: GuardrailViolation[];
  citedPolicyIds: PolicyId[];
}

// --- The concrete step the orchestrator executes this turn — the
// execution. Distinct from domain.AgentAction, which is the persisted
// audit-log row; alias that import as AgentActionRecord wherever both are
// needed in the same file (see move-coordinator.agent.ts). ---
export type AgentAction =
  { kind: 'call_tool'; tool: ToolName; input: Record<string, unknown> } | { kind: 'respond_only' };

// --- What actually lands in the trace for "contextUsed" — a distinct,
// narrower type (not Partial<AgentContext>), so PII omission is enforced
// by the type itself rather than remembered at write time. See
// guardrails.ts's sensitive_information guardrail. ---
export interface RedactedAgentContext {
  communityId: CommunityId;
  requestId?: RequestId;
  requestStatus?: MoveRequestStatus;
  requestType?: MoveRequest['type'];
  actorRole: ActorRole;
  hasResident: boolean;
  hasCommunityConfig: boolean;
  checklistSummary: { total: number; verified: number; missing: string[] };
  documentsSummary: { total: number; verified: number };
  policyTopicsRetrieved: PolicyTopic[];
  conversationTurnCount: number;
}

export interface AgentToolResultSummary {
  tool: ToolName;
  success: boolean;
  summary: string;
}

// --- Every run produces exactly one of these. This is the audit surface
// — concise reasoning summaries, decisions, evidence, and actions, never
// a raw model chain-of-thought dump. ---
export interface AgentTrace {
  turnId: string;
  requestId?: RequestId;
  intent: AgentIntent;
  intentConfidence: number;
  contextUsed: RedactedAgentContext;
  toolsCalled: ToolName[];
  toolResults: AgentToolResultSummary[];
  reasoningSummary: string[];
  decision: AgentDecision;
  action: AgentAction;
  confidence: number;
  requiresHumanReview: boolean;
  createdAt: string;
}

export interface AgentResult {
  reply: string;
  decision: AgentDecision;
  trace: AgentTrace;
}

export interface AgentMessageInput {
  content: string;
  communityId: CommunityId;
  requestId?: RequestId;
  // Set when starting a brand-new request — represents what a real UI's
  // unit picker would already have supplied before the resident ever
  // types a message. Free text is never parsed for a unit id.
  unitId?: UnitId;
  actorId: string;
  actorRole: ActorRole;
  conversationId?: ConversationId;
}
