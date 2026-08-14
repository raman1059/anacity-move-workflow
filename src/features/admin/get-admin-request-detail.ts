import type { AdminDecision, MoveRequestStatus } from '@/domain';
import { getAllowedTransitions } from '@/agents/state-machine';
import { ADMIN_DECISION_TARGET_STATUS } from '@/lib/admin-decision';
import { findLatestRecommendation } from '@/lib/agent-recommendation';
import { getCommunityService, getMoveRequestService, getRepositories } from '@/lib/container';
import {
  calculateMoveOutCharges,
  validateMoveRequest,
  validateMoveRequestDocuments,
} from '@/lib/policy-engine';
import { computeRequestPriority } from '@/lib/request-priority';
import type { RequestDetailData } from './types';

const RELEVANT_TOPICS_MOVE_IN = ['move_in_documents', 'noc_requirement'];
const RELEVANT_TOPICS_MOVE_OUT = [
  'notice_period',
  'notice_period_exception',
  'move_out_documents',
  'dues_clearance',
  'inspection_process',
  'security_deposit',
];

const DECISION_TARGETS = Object.values(ADMIN_DECISION_TARGET_STATUS);

export type RequestDetailLookupResult =
  { ok: true; data: RequestDetailData } | { ok: false; error: string; status: 404 | 500 };

function whyHumanReviewRequired(status: MoveRequestStatus, escalationReason: string | undefined): string {
  switch (status) {
    case 'escalated':
      return (
        escalationReason ?? 'This request was escalated and needs a community admin\'s judgment.'
      );
    case 'under_review':
      return 'Recommendations always require human confirmation — the agent never auto-approves or auto-rejects a request.';
    case 'information_required':
      return 'The agent is waiting on the resident to provide missing information before it can proceed further.';
    default:
      return 'No active review is required right now.';
  }
}

// Server-only. The full Decision Context aggregator for one request — see
// features/admin/types.ts for what each field maps onto. Reads
// validation/documentValidation/chargeEstimate via the same pure
// lib/policy-engine.ts functions the tools wrap, computed directly here
// rather than through the tool registry — this is a read for display, the
// same bypass-the-registry-for-reads pattern get-workspace-data.ts and
// get-admin-dashboard-data.ts already use. Only the write actions (in the
// API routes) go through the registry.
export function getAdminRequestDetail(
  requestId: string,
  viewerRoleKey?: string
): RequestDetailLookupResult {
  const moveRequestService = getMoveRequestService();
  const detail = moveRequestService.getDetail(requestId);
  if (!detail) {
    return { ok: false, error: 'Request not found', status: 404 };
  }
  const { request, resident, unit, documents, checklist, notes, adminReviews, agentActions } =
    detail;

  const communityService = getCommunityService();
  const community = communityService.getCommunity(request.communityId);
  const communityConfig = communityService.getCommunityConfiguration(request.communityId);
  if (!community || !communityConfig || !resident) {
    return { ok: false, error: 'This request is missing required community or resident data.', status: 500 };
  }

  const repositories = getRepositories();
  const communityPolicies = repositories.policies.listByCommunity(request.communityId);

  const validation = validateMoveRequest(request, resident, communityConfig);
  const documentValidation = validateMoveRequestDocuments(
    request,
    resident,
    communityConfig,
    documents
  );
  const chargeEstimate =
    request.type === 'move_out' ? calculateMoveOutCharges(request, communityConfig) : null;

  const latestRecommendation = findLatestRecommendation(agentActions);

  const latestEscalation = agentActions
    .filter((a) => a.tool === 'escalateToAdmin' && a.success)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const escalationReason = latestEscalation?.input.reason as string | undefined;

  const citedPolicyIds = latestRecommendation?.citedPolicyIds ?? [];
  const citedPolicies = communityPolicies.filter((p) => citedPolicyIds.includes(p.id));

  const relevantTopics =
    request.type === 'move_in' ? RELEVANT_TOPICS_MOVE_IN : RELEVANT_TOPICS_MOVE_OUT;
  const relevantPolicies = communityPolicies.filter((p) => relevantTopics.includes(p.topic));

  const priority = computeRequestPriority(request, agentActions, communityConfig);

  const allowedForAdmin = getAllowedTransitions(request.status, 'admin');
  const decisionActions = (Object.keys(ADMIN_DECISION_TARGET_STATUS) as AdminDecision[]).filter(
    (decision) => allowedForAdmin.includes(ADMIN_DECISION_TARGET_STATUS[decision])
  );
  const otherActions = allowedForAdmin.filter((status) => !DECISION_TARGETS.includes(status));

  // A role key is resolved against THIS request's own community config —
  // a title picked elsewhere (e.g. "Treasurer" while browsing a
  // different community's request) carries no special authority here.
  const currentRole = viewerRoleKey
    ? communityConfig.adminPermissions.roles.find((r) => r.key === viewerRoleKey)
    : undefined;

  const isFinancialException =
    chargeEstimate !== null && chargeEstimate.totalDeductions > communityConfig.approval.financialEscalationThreshold;

  // Real, structural permission — mirrors isFinancialException. Undefined
  // currentRole (e.g. viewing cross-community with no matching role key)
  // means "no demonstrated authority," so this defaults to false rather
  // than assuming the widest permission.
  const canApproveThisType = currentRole
    ? request.type === 'move_in'
      ? currentRole.canApproveMoveIn
      : currentRole.canApproveMoveOut
    : false;

  return {
    ok: true,
    data: {
      request,
      resident,
      unit,
      community,
      communityConfig,
      checklist,
      documents,
      notes,
      adminReviews,
      agentActions,
      citedPolicies,
      relevantPolicies,
      validation,
      documentValidation,
      chargeEstimate,
      latestRecommendation,
      whyHumanReviewRequired: whyHumanReviewRequired(request.status, escalationReason),
      priority,
      decisionActions,
      otherActions,
      currentRole,
      isFinancialException,
      canApproveThisType,
    },
  };
}
