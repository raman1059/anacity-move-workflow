import type { Charge } from '../../domain';
import type { ChargeRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryChargeRepository(seed: Charge[]): ChargeRepository {
  const store = new EntityStore<Charge>(seed);

  return {
    getByRequest: (requestId) => store.list().find((c) => c.requestId === requestId),
    create: (charge) => store.create(charge),
    update: (id, patch) => store.update(id, patch),
  };
}
