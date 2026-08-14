import type { Unit } from '../../domain';
import type { UnitRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryUnitRepository(seed: Unit[]): UnitRepository {
  const store = new EntityStore<Unit>(seed);

  return {
    getById: (id) => store.getById(id),
    listByCommunity: (communityId) => store.list().filter((u) => u.communityId === communityId),
  };
}
