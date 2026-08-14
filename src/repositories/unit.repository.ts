import type { CommunityId, Unit, UnitId } from '../domain';

export interface UnitRepository {
  getById(id: UnitId): Unit | undefined;
  listByCommunity(communityId: CommunityId): Unit[];
}
