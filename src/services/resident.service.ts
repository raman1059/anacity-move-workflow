import type { CommunityId, Resident, ResidentId, UnitId } from '../domain';
import type { Repositories } from '../repositories';

export interface ResidentService {
  getById(residentId: ResidentId): Resident | undefined;
  listByCommunity(communityId: CommunityId): Resident[];
  listByUnit(unitId: UnitId): Resident[];
}

export function createResidentService(repositories: Repositories): ResidentService {
  return {
    getById: (residentId) => repositories.residents.getById(residentId),
    listByCommunity: (communityId) => repositories.residents.listByCommunity(communityId),
    listByUnit: (unitId) => repositories.residents.listByUnit(unitId),
  };
}
