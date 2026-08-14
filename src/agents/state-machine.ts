import type { ActorRole, AutonomyTier, MoveRequestStatus } from '../domain';

export interface TransitionRule {
  from: MoveRequestStatus;
  to: MoveRequestStatus;
  tier: AutonomyTier;
  // Who is permitted to *cause* this transition. 'system' means the
  // orchestrator itself, performing a deterministic, no-human-judgment
  // housekeeping transition (e.g. submitted -> under_review once
  // validation passes) — the orchestrator is responsible for passing
  // actorRole: 'system' on the tool call for these, regardless of which
  // human is chatting. Transitions gated to 'admin' can never be caused
  // by this orchestrator in its current scope (no admin-approval flow
  // exists yet) — they exist here for completeness and for
  // update-move-request.tool.ts's own guard.
  allowedRoles: ActorRole[];
  reversible: boolean;
}

// Encodes plan.md §4.6. under_review -> approved/rejected and
// scheduled -> completed are unconditionally admin-only regardless of
// CommunityConfiguration.approval.* flags — see plan §Key Design
// Decision 5. Approve/reject is always human-gated, no matter how clean
// the case looks.
const TRANSITIONS: TransitionRule[] = [
  {
    from: 'draft',
    to: 'submitted',
    tier: 'act',
    allowedRoles: ['resident', 'admin', 'system'],
    reversible: true,
  },
  {
    from: 'draft',
    to: 'cancelled',
    tier: 'act',
    allowedRoles: ['resident', 'admin', 'system'],
    reversible: true,
  },

  // 'admin' is allowed here (in addition to 'system') so that a
  // community with autonomy.allowAutoStatusAdvance: false — the agent
  // validates and deliberately stops at 'submitted' rather than
  // advancing itself — never dead-ends: an admin can still move it
  // forward manually. Communities that leave allowAutoStatusAdvance
  // true (the default) never need this; the agent keeps doing it
  // automatically exactly as before.
  {
    from: 'submitted',
    to: 'under_review',
    tier: 'act',
    allowedRoles: ['system', 'admin'],
    reversible: true,
  },
  {
    from: 'submitted',
    to: 'information_required',
    tier: 'act',
    allowedRoles: ['system'],
    reversible: true,
  },
  // A guardrail (e.g. policy_ambiguity) can fire before a request ever
  // reaches under_review — e.g. on the very first turn. 'admin' is also
  // allowed here (and on the two ->escalated rules below) so a human can
  // proactively escalate further (e.g. routing to a Treasurer) — not
  // just as a side effect of the agent's own guardrails. This doesn't
  // change how or when the agent itself escalates.
  {
    from: 'submitted',
    to: 'escalated',
    tier: 'escalate',
    allowedRoles: ['system', 'admin'],
    reversible: true,
  },

  {
    from: 'information_required',
    to: 'submitted',
    tier: 'act',
    allowedRoles: ['resident', 'admin', 'system'],
    reversible: true,
  },
  {
    from: 'information_required',
    to: 'escalated',
    tier: 'escalate',
    allowedRoles: ['system', 'admin'],
    reversible: true,
  },
  {
    from: 'information_required',
    to: 'cancelled',
    tier: 'act',
    allowedRoles: ['resident', 'admin'],
    reversible: true,
  },

  {
    from: 'under_review',
    to: 'approved',
    tier: 'recommend',
    allowedRoles: ['admin'],
    reversible: false,
  },
  {
    from: 'under_review',
    to: 'rejected',
    tier: 'recommend',
    allowedRoles: ['admin'],
    reversible: false,
  },
  {
    from: 'under_review',
    to: 'escalated',
    tier: 'escalate',
    allowedRoles: ['system', 'admin'],
    reversible: true,
  },
  {
    from: 'under_review',
    to: 'information_required',
    tier: 'act',
    allowedRoles: ['admin', 'system'],
    reversible: true,
  },

  { from: 'escalated', to: 'under_review', tier: 'act', allowedRoles: ['admin'], reversible: true },
  {
    from: 'escalated',
    to: 'information_required',
    tier: 'act',
    allowedRoles: ['admin'],
    reversible: true,
  },
  {
    from: 'escalated',
    to: 'approved',
    tier: 'recommend',
    allowedRoles: ['admin'],
    reversible: false,
  },
  {
    from: 'escalated',
    to: 'rejected',
    tier: 'recommend',
    allowedRoles: ['admin'],
    reversible: false,
  },

  { from: 'approved', to: 'scheduled', tier: 'act', allowedRoles: ['system'], reversible: true },

  {
    from: 'scheduled',
    to: 'completed',
    tier: 'recommend',
    allowedRoles: ['admin'],
    reversible: false,
  },
  {
    from: 'scheduled',
    to: 'cancelled',
    tier: 'act',
    allowedRoles: ['resident', 'admin'],
    reversible: true,
  },
  { from: 'scheduled', to: 'under_review', tier: 'act', allowedRoles: ['admin'], reversible: true },
];

const TERMINAL_STATES: readonly MoveRequestStatus[] = ['rejected', 'completed', 'cancelled'];

function findRule(from: MoveRequestStatus, to: MoveRequestStatus): TransitionRule | undefined {
  return TRANSITIONS.find((rule) => rule.from === from && rule.to === to);
}

export function canTransition(
  from: MoveRequestStatus,
  to: MoveRequestStatus,
  actorRole: ActorRole
): boolean {
  const rule = findRule(from, to);
  return rule !== undefined && rule.allowedRoles.includes(actorRole);
}

export function getAllowedTransitions(
  from: MoveRequestStatus,
  actorRole: ActorRole
): MoveRequestStatus[] {
  return TRANSITIONS.filter(
    (rule) => rule.from === from && rule.allowedRoles.includes(actorRole)
  ).map((rule) => rule.to);
}

export function transitionTier(
  from: MoveRequestStatus,
  to: MoveRequestStatus
): AutonomyTier | undefined {
  return findRule(from, to)?.tier;
}

export function isReversibleTransition(from: MoveRequestStatus, to: MoveRequestStatus): boolean {
  return findRule(from, to)?.reversible ?? false;
}

export function isTerminalState(status: MoveRequestStatus): boolean {
  return TERMINAL_STATES.includes(status);
}
