import type { CommunityId, CommunityPolicy, PolicyTopic } from '../domain';

export interface PolicyRepository {
  listByCommunity(communityId: CommunityId): CommunityPolicy[];
  // Returns [] rather than throwing when nothing matches — an empty result
  // is the signal the agent uses to escalate instead of inventing a policy.
  findByTopic(communityId: CommunityId, topic: PolicyTopic): CommunityPolicy[];
}
