import type { ZodType } from 'zod';
import type { ActorRole, AutonomyTier, ToolName } from '../domain';
import type { Repositories } from '../repositories';

export interface ToolContext {
  repositories: Repositories;
  actorId: string;
  actorRole: ActorRole;
  requestId?: string;
  conversationId?: string;
  turnId: string;
}

// Blast-radius classification — independent of `tier` (which is about
// autonomy: how much judgment the agent may exercise with this tool's
// result). `sideEffect` is about risk: what the tool can actually do to
// the system, and who is allowed to trigger that.
//
//   READ_ONLY       no mutation of any kind.
//   SAFE_WRITE       mutates, but additively/reversibly and without
//                    touching approval state (create a draft, append a
//                    note, record a recommendation).
//   SENSITIVE_WRITE   mutates core workflow state (status transitions,
//                    escalation) — internally gated by the state machine
//                    and role, but consequential enough to flag at the
//                    tool level too.
//   ADMIN_ONLY        exclusively for a human admin's own action — never
//                    callable from a resident context, structurally, at
//                    the registry level, not just by allowedRoles config.
export type ToolSideEffect = 'READ_ONLY' | 'SAFE_WRITE' | 'SENSITIVE_WRITE' | 'ADMIN_ONLY';

// A structured summary of what execute() enforces beyond allowedRoles —
// documents the authorization rule declaratively so it can be inspected
// and tested independently of reading the implementation.
//   none         no check beyond the role gate (e.g. topic-scoped policy lookup).
//   self         resident actor must match the target record's owner.
//   admin_role   must be an admin (explicit even where allowedRoles already implies it).
//   system_only  only the orchestrator itself may call this.
export type ToolAuthorization = 'none' | 'self' | 'admin_role' | 'system_only';

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: ToolName;
  description: string;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  authorization: ToolAuthorization;
  // Roles allowed to invoke this tool at all, checked by the registry
  // before execute() runs. This is enforced independently of whatever an
  // LLM decides to call — see plan.md §4.4 ("never perform an action
  // without validating permissions").
  allowedRoles: ActorRole[];
  sideEffect: ToolSideEffect;
  tier: AutonomyTier;
  execute(input: TInput, context: ToolContext): Promise<TOutput>;
}

// Vocabulary alias for the agent orchestrator's vocabulary (AgentContext,
// AgentDecision, AgentAction, ...) — same shape as ToolDefinition, no new
// behavior. Kept as an alias rather than a rename so the already-tested
// ToolDefinition/ToolRegistry machinery doesn't need to change.
export type AgentTool<TInput = unknown, TOutput = unknown> = ToolDefinition<TInput, TOutput>;

export class ToolPermissionError extends Error {
  constructor(
    public readonly toolName: ToolName,
    message: string
  ) {
    super(message);
    this.name = 'ToolPermissionError';
  }
}

// Thrown when input fails inputSchema validation, before execute() ever
// runs — the tool implementation never sees malformed input.
export class ToolValidationError extends Error {
  constructor(
    public readonly toolName: ToolName,
    public readonly issues: string[]
  ) {
    super(`Invalid input for tool "${toolName}": ${issues.join('; ')}`);
    this.name = 'ToolValidationError';
  }
}
