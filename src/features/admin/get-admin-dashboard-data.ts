import { getCommunityService, getRepositories } from '@/lib/container';
import { computeRequestPriority } from '@/lib/request-priority';
import type { DashboardData, DashboardRow } from './types';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

// Server-only. Cross-community by design (see plan.md's Administrator
// Workflow §Key Design Decision 1) — the dashboard itself is the "filter
// by community" surface, not a per-community picker. Small dataset
// (a handful of communities, a dozen-ish requests each in this
// prototype), so a single full fetch filtered client-side is the right
// call, not premature — see DashboardFilters.tsx.
export function getAdminDashboardData(): DashboardData {
  const repositories = getRepositories();
  const communities = getCommunityService().listCommunities();

  const communityService = getCommunityService();
  const rows: DashboardRow[] = [];
  for (const community of communities) {
    const communityConfig = communityService.getCommunityConfiguration(community.id);
    for (const request of repositories.moveRequests.listByCommunity(community.id)) {
      const resident = repositories.residents.getById(request.residentId);
      const unit = repositories.units.getById(request.unitId);
      const agentActions = repositories.agentActions.listByRequest(request.id);
      rows.push({
        request,
        communityId: community.id,
        communityName: community.name,
        residentName: resident ? `${resident.firstName} ${resident.lastName}` : 'Unknown resident',
        unitNumber: unit?.unitNumber,
        priority: computeRequestPriority(request, agentActions, communityConfig),
      });
    }
  }

  rows.sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.request.updatedAt < b.request.updatedAt ? 1 : -1;
  });

  return { rows, communities: communities.map((c) => ({ id: c.id, name: c.name })) };
}
