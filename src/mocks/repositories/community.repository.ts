import type { Community, CommunityConfiguration } from '../../domain';
import type { CommunityRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryCommunityRepository(
  communities: Community[],
  configurations: CommunityConfiguration[]
): CommunityRepository {
  const store = new EntityStore<Community>(communities);
  const configByCommunity = new Map(configurations.map((c) => [c.communityId, c]));

  return {
    getById: (id) => store.getById(id),
    list: () => store.list(),
    getConfiguration: (communityId) => configByCommunity.get(communityId),
  };
}
