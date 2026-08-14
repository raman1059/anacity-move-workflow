import type { MoveSlot } from '../../domain';
import type { MoveSlotRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryMoveSlotRepository(seed: MoveSlot[]): MoveSlotRepository {
  const store = new EntityStore<MoveSlot>(seed);

  return {
    getById: (id) => store.getById(id),
    listAvailable: (communityId, resourceKey, dateRange) =>
      store
        .list()
        .filter(
          (s) =>
            s.communityId === communityId &&
            s.resourceKey === resourceKey &&
            s.date >= dateRange.from &&
            s.date <= dateRange.to &&
            s.bookedCount < s.capacity
        ),
    book: (slotId, requestId) => {
      const slot = store.getById(slotId);
      if (!slot) {
        throw new Error(`MoveSlot ${slotId} not found`);
      }
      if (slot.bookedCount >= slot.capacity) {
        // Re-checked here (not just at read time) so two concurrent
        // bookings for the same slot can't both succeed.
        throw new Error(`MoveSlot ${slotId} is at capacity`);
      }
      return store.update(slotId, {
        bookedCount: slot.bookedCount + 1,
        bookedByRequestIds: [...slot.bookedByRequestIds, requestId],
      });
    },
  };
}
