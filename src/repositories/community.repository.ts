import type { Community, CommunityConfiguration, CommunityId } from '../domain';

export interface CommunityRepository {
  getById(id: CommunityId): Community | undefined;
  list(): Community[];
  getConfiguration(communityId: CommunityId): CommunityConfiguration | undefined;
}
