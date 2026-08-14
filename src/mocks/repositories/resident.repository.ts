import type { Resident } from '../../domain';
import type { ResidentRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryResidentRepository(seed: Resident[]): ResidentRepository {
  const store = new EntityStore<Resident>(seed);

  return {
    getById: (id) => store.getById(id),
    listByCommunity: (communityId) => store.list().filter((r) => r.communityId === communityId),
    listByUnit: (unitId) => store.list().filter((r) => r.unitId === unitId),
  };
}
