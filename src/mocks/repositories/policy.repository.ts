import type { CommunityPolicy } from '../../domain';
import type { PolicyRepository } from '../../repositories';

export function createInMemoryPolicyRepository(policies: CommunityPolicy[]): PolicyRepository {
  return {
    listByCommunity: (communityId) => policies.filter((p) => p.communityId === communityId),
    findByTopic: (communityId, topic) =>
      policies.filter((p) => p.communityId === communityId && p.topic === topic),
  };
}
