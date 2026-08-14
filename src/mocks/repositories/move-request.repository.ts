import type { MoveRequest } from '../../domain';
import type { MoveRequestRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryMoveRequestRepository(seed: MoveRequest[]): MoveRequestRepository {
  const store = new EntityStore<MoveRequest>(seed);

  return {
    getById: (id) => store.getById(id),
    listByCommunity: (communityId) => store.list().filter((r) => r.communityId === communityId),
    listByResident: (residentId) => store.list().filter((r) => r.residentId === residentId),
    listByStatus: (communityId, status) =>
      store.list().filter((r) => r.communityId === communityId && r.status === status),
    create: (request) => store.create(request),
    update: (id, patch) => {
      const existing = store.getById(id);
      if (!existing) {
        throw new Error(`MoveRequest ${id} not found`);
      }
      // MoveRequestPatch is a flat superset of both variants' mutable
      // fields, so the merge preserves whichever discriminated variant
      // `existing` already is regardless of which optional keys `patch` sets.
      return store.create({ ...existing, ...patch });
    },
  };
}
