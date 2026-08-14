import { z } from 'zod';
import { canTransition } from '../../agents/state-machine';
import { ADMIN_DECISION_TARGET_STATUS } from '../../lib/admin-decision';
import { findLatestRecommendation } from '../../lib/agent-recommendation';
import { generateId } from '../../lib/id';
import type { AdminDecision, AdminReview, RecommendationAction } from '../../domain';
import { adminDecisionSchema, adminReviewSchema, idSchema } from '../schemas';
import { ToolPermissionError, type ToolDefinition } from '../types';

const inputSchema = z
  .object({
    requestId: idSchema,
    decision: adminDecisionSchema,
    reason: z.string().min(1).optional(),
    // Required, not optional — see plan.md's Security & Agent-Safety
    // Review, gap 5. It used to be optional with permission checks
    // skipped entirely whenever it was absent or didn't resolve to a
    // real role; that meant an omitted or misspelled roleKey silently
    // bypassed every role-based restriction below instead of denying.
    // Resolved against THIS request's own community's AdminRole
    // definitions — a role key from a different community carries no
    // authority here (see plan.md's Scalability Architecture
    // §Permissions) and is now a hard failure, not a silent no-op.
    roleKey: z.string().min(1),
  })
  .strict();
export type RecordAdminDecisionInput = z.infer<typeof inputSchema>;
const outputSchema = adminReviewSchema;

const NOTE_CATEGORY: Record<AdminDecision, string> = {
  approved: 'approval',
  rejected: 'rejection',
  requested_info: 'info_request',
  escalated_further: 'escalation',
};

// Whether an admin `decision` agrees with what the agent already
// recommended — 'escalated_further' never matches, since the agent
// itself never recommends escalating (recommendAction is only ever
// approve/reject/request_info/approve_with_charges); choosing to
// escalate further is always the admin going beyond, or against,
// whatever the agent proposed (or proposed nothing, if it escalated
// itself already).
function decisionMatchesRecommendation(decision: AdminDecision, action: RecommendationAction): boolean {
  switch (decision) {
    case 'approved':
      return action === 'approve' || action === 'approve_with_charges';
    case 'rejected':
      return action === 'reject';
    case 'requested_info':
      return action === 'request_info';
    case 'escalated_further':
      return false;
  }
}

// ADMIN_ONLY, ACT tier. The single atomic action behind the four
// resident-request decision capabilities (approve / reject / request
// more info / escalate further) — see plan.md's Administrator Workflow
// section. Bundles the state transition (same canTransition rule table
// updateMoveRequestTool uses), the AdminReview audit row (with the
// agent's recommendation snapshotted for comparison), and a
// human-readable RequestNote, in one call — so there is no window where
// the review is recorded but the status didn't change, or vice versa.
// This is a genuinely different kind of action from recommendAction:
// this one is never proposed by the agent and never auto-executed — a
// human clicked a specific button.
export const recordAdminDecisionTool: ToolDefinition<RecordAdminDecisionInput, AdminReview> = {
  name: 'recordAdminDecision',
  description:
    "Record a community admin's decision on a request (approve/reject/request more info/escalate further), transition its status accordingly, and snapshot the agent recommendation it agreed with or overrode.",
  inputSchema,
  outputSchema,
  authorization: 'admin_role',
  allowedRoles: ['admin'],
  sideEffect: 'ADMIN_ONLY',
  tier: 'act',
  async execute(input, context) {
    const existing = context.repositories.moveRequests.getById(input.requestId);
    if (!existing) {
      throw new Error(`MoveRequest ${input.requestId} not found`);
    }

    const targetStatus = ADMIN_DECISION_TARGET_STATUS[input.decision];

    // Idempotency: if this exact decision was already recorded and the
    // request is already sitting in its target status, treat a repeat
    // call (a double-clicked button, a retried request after a dropped
    // response) as a no-op rather than creating a duplicate AdminReview
    // and a duplicate note. See plan.md's Security & Agent-Safety
    // Review, gap 6.
    if (targetStatus === existing.status) {
      const priorReviews = context.repositories.adminReviews.listByRequest(input.requestId);
      const matchingReview = [...priorReviews]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .find((review) => review.decision === input.decision);
      if (matchingReview) {
        return matchingReview;
      }
    } else if (!canTransition(existing.status, targetStatus, context.actorRole)) {
      throw new ToolPermissionError(
        'recordAdminDecision',
        `Cannot record decision "${input.decision}" — request is in status "${existing.status}"`
      );
    }

    const agentActions = context.repositories.agentActions.listByRequest(input.requestId);
    const latestRecommendation = findLatestRecommendation(agentActions);
    const overrodeRecommendation = latestRecommendation
      ? !decisionMatchesRecommendation(input.decision, latestRecommendation.action)
      : false;

    // Fail closed: a role that doesn't resolve for this request's own
    // community is denied outright, never silently treated as
    // unrestricted. See plan.md's Security & Agent-Safety Review, gap 5.
    const communityConfig = context.repositories.communities.getConfiguration(
      existing.communityId
    );
    const role = communityConfig?.adminPermissions.roles.find((r) => r.key === input.roleKey);
    if (!role) {
      throw new ToolPermissionError(
        'recordAdminDecision',
        `Role "${input.roleKey}" has no authority defined for this request's community.`
      );
    }
    if (input.decision === 'approved') {
      const canApprove = existing.type === 'move_in' ? role.canApproveMoveIn : role.canApproveMoveOut;
      if (!canApprove) {
        throw new ToolPermissionError(
          'recordAdminDecision',
          `Role "${role.label}" is not authorized to approve ${existing.type.replace('_', '-')} requests.`
        );
      }
    }
    if (overrodeRecommendation && !role.canOverrideAgent) {
      throw new ToolPermissionError(
        'recordAdminDecision',
        `Role "${role.label}" is not authorized to override an agent recommendation.`
      );
    }

    if (!input.reason && (overrodeRecommendation || input.decision === 'rejected')) {
      throw new Error(
        overrodeRecommendation
          ? 'A reason is required when your decision differs from the agent\'s recommendation.'
          : 'A reason is required when rejecting a request.'
      );
    }

    const now = new Date().toISOString();
    const patch: Parameters<typeof context.repositories.moveRequests.update>[1] = {
      status: targetStatus,
      updatedAt: now,
    };
    if (targetStatus === 'escalated' && existing.previousStatus === undefined) {
      patch.previousStatus = existing.status;
    }
    context.repositories.moveRequests.update(input.requestId, patch);

    const review = context.repositories.adminReviews.create({
      id: generateId('review'),
      requestId: input.requestId,
      adminId: context.actorId,
      agentRecommendation: latestRecommendation,
      decision: input.decision,
      overrodeRecommendation,
      reason: input.reason,
      createdAt: now,
    });

    const summary = `${input.decision.replace(/_/g, ' ')}${input.reason ? `: ${input.reason}` : ''}`;
    context.repositories.requestNotes.create({
      id: generateId('note'),
      requestId: input.requestId,
      authorType: 'admin',
      authorId: context.actorId,
      text: overrodeRecommendation
        ? `Overrode agent recommendation (${latestRecommendation?.action}). ${summary}`
        : summary,
      category: overrodeRecommendation ? 'override' : NOTE_CATEGORY[input.decision],
      createdAt: now,
    });

    return review;
  },
};
