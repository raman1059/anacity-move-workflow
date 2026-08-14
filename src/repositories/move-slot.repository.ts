import type { CommunityId, MoveSlot, MoveSlotId, RequestId } from '../domain';

export interface MoveSlotRepository {
  getById(id: MoveSlotId): MoveSlot | undefined;
  listAvailable(
    communityId: CommunityId,
    resourceKey: string,
    dateRange: { from: string; to: string }
  ): MoveSlot[];
  book(slotId: MoveSlotId, requestId: RequestId): MoveSlot;
}
