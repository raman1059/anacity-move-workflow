import type { Community, CommunityConfiguration, CommunityId } from '../domain';
import type { Repositories } from '../repositories';

export interface CommunityService {
  listCommunities(): Community[];
  getCommunity(communityId: CommunityId): Community | undefined;
  getCommunityConfiguration(communityId: CommunityId): CommunityConfiguration | undefined;
}

// Factory functions taking `Repositories` explicitly (rather than reaching
// into a global singleton) keep the service layer trivially unit-testable
// against the mock repositories — see src/tests/unit. lib/container.ts
// wires the singleton in for the running app.
export function createCommunityService(repositories: Repositories): CommunityService {
  return {
    listCommunities: () => repositories.communities.list(),
    getCommunity: (communityId) => repositories.communities.getById(communityId),
    getCommunityConfiguration: (communityId) =>
      repositories.communities.getConfiguration(communityId),
  };
}
