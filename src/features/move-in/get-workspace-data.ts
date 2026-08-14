import { isTerminalState } from '@/agents/state-machine';
import {
  getCommunityService,
  getMoveRequestService,
  getRepositories,
  getResidentService,
} from '@/lib/container';
import type { WorkspaceData } from './types';

export type WorkspaceLookupResult =
  { ok: true; data: WorkspaceData } | { ok: false; error: string; status: 404 | 500 };

// Server-only. Shared by the workspace API route and the workspace
// Server Component page, so the two never drift — the page calls this
// directly (no reason for a Server Component to round-trip through its
// own API), the API route wraps it in a Response for the client-side
// refetch that happens after every chat turn / upload.
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
  const moveInRequests = moveRequestService
    .listByResident(residentId)
    .filter((r) => r.type === 'move_in')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  // The most recent request that's still in flight — not just the most
  // recent overall. A resident whose earlier move-in was rejected or
  // cancelled can still start a fresh one; picking [0] unconditionally
  // would pin the workspace on that old, closed request forever and the
  // resident would never see the "start a new request" option again.
  const activeRequest = moveInRequests.find((r) => !isTerminalState(r.status)) ?? null;
  const detail = activeRequest ? moveRequestService.getDetail(activeRequest.id) : undefined;

  const repositories = getRepositories();
  const unit = resident.unitId ? repositories.units.getById(resident.unitId) : undefined;
  const relevantPolicies = [
    ...repositories.policies.findByTopic(resident.communityId, 'move_in_documents'),
    ...repositories.policies.findByTopic(resident.communityId, 'noc_requirement'),
  ];

  const conversations = repositories.conversations
    .listByActor(residentId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const conversation = conversations[0] ?? null;

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
    },
  };
}
