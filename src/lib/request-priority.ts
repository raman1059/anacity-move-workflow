import type { AgentAction, CommunityConfiguration, MoveRequest } from '../domain';

export type RequestPriority = 'low' | 'medium' | 'high';

function daysSince(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

// No priority field exists anywhere in the domain model — this is
// computed from real signals, never invented. An escalated request uses
// the actual `urgency` the agent recorded when it escalated (real,
// persisted data — see escalate-to-admin.tool.ts's input), not a guess;
// an escalated request with no recorded urgency defaults to 'high'
// rather than silently ranking low, since escalation itself already
// means a human is needed now.
//
// `communityConfig` is optional but, when given, makes this genuinely
// per-community: `autonomy.idleDaysBeforeEscalate` (previously an
// unread field — see plan.md's Scalability Architecture section) now
// elevates a request that has sat untouched past that community's own
// threshold. Two requests in the identical status, updated the same day
// ago, can rank differently purely because they belong to communities
// with different idle thresholds — no branching on which community it
// is, just reading its own configuration.
export function computeRequestPriority(
  request: MoveRequest,
  agentActions: AgentAction[],
  communityConfig?: CommunityConfiguration
): RequestPriority {
  if (request.status === 'escalated') {
    const latestEscalation = agentActions
      .filter((a) => a.tool === 'escalateToAdmin' && a.success)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    const urgency = latestEscalation?.input.urgency as RequestPriority | undefined;
    return urgency ?? 'high';
  }

  const idleThreshold = communityConfig?.autonomy.idleDaysBeforeEscalate;
  const isStale = idleThreshold !== undefined && daysSince(request.updatedAt) >= idleThreshold;

  if (request.status === 'information_required' || request.status === 'under_review') {
    return isStale ? 'high' : 'medium';
  }

  if (request.status === 'submitted') {
    return isStale ? 'medium' : 'low';
  }

  return 'low';
}
