import { isTerminalState } from '@/agents/state-machine';
import {
  getCommunityService,
  getMoveRequestService,
  getRepositories,
  getResidentService,
} from '@/lib/container';
import { calculateMoveOutCharges } from '@/lib/policy-engine';
import type { WorkspaceData } from './types';

export type WorkspaceLookupResult =
  { ok: true; data: WorkspaceData } | { ok: false; error: string; status: 404 | 500 };

// Server-only. Shared by the move-out workspace API route and the
// workspace Server Component page — see features/move-in's identical
// pattern, which this mirrors exactly so the two feature flows never
// drift in shape even though they read different request types.
export function getWorkspaceData(residentId: string): WorkspaceLookupResult {
  const resident = getResidentService().getById(residentId);
  if (!resident) {
    return { ok: false, error: 'Resident not found', status: 404 };
  }

  const communityService = getCommunityService();
  const community = communityService.getCommunity(resident.communityId);
  const communityConfig = communityService.getCommunityConfiguration(resident.communityId);
  if (!community || !communityConfig) {
    return { ok: false, error: 'This community has no configuration on file.', status: 500 };
  }

  const moveRequestService = getMoveRequestService();
  const moveOutRequests = moveRequestService
    .listByResident(residentId)
    .filter((r) => r.type === 'move_out')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  // The most recent request that's still in flight, not just the most
  // recent overall — see features/move-in/get-workspace-data.ts's
  // identical fix. Without this, resident-sanjay-kulkarni's cancelled
  // request-rv-004 would pin his workspace forever and he could never
  // start a new move-out through the UI.
  const activeRequest = moveOutRequests.find((r) => !isTerminalState(r.status)) ?? null;
  const detail = activeRequest ? moveRequestService.getDetail(activeRequest.id) : undefined;

  const repositories = getRepositories();
  const unit = resident.unitId ? repositories.units.getById(resident.unitId) : undefined;
  const relevantPolicies = [
    ...repositories.policies.findByTopic(resident.communityId, 'notice_period'),
    ...repositories.policies.findByTopic(resident.communityId, 'move_out_documents'),
    ...repositories.policies.findByTopic(resident.communityId, 'dues_clearance'),
    ...repositories.policies.findByTopic(resident.communityId, 'inspection_process'),
    ...repositories.policies.findByTopic(resident.communityId, 'security_deposit'),
  ];

  const conversations = repositories.conversations
    .listByActor(residentId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const conversation = conversations[0] ?? null;

  const chargeEstimate =
    activeRequest && activeRequest.type === 'move_out'
      ? calculateMoveOutCharges(activeRequest, communityConfig)
      : null;

  return {
    ok: true,
    data: {
      resident,
      community,
      communityConfig,
      unit: unit ?? null,
      activeRequest,
      checklist: detail?.checklist ?? [],
      documents: detail?.documents ?? [],
      notes: detail?.notes ?? [],
      relevantPolicies,
      conversation,
      chargeEstimate,
    },
  };
}
