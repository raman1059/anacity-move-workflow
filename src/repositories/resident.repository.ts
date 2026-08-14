import type { CommunityId, Resident, ResidentId, UnitId } from '../domain';

export interface ResidentRepository {
  getById(id: ResidentId): Resident | undefined;
  listByCommunity(communityId: CommunityId): Resident[];
  listByUnit(unitId: UnitId): Resident[];
}
