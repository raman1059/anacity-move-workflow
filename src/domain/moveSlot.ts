import type { CommunityId, MoveSlotId, RequestId } from './ids';

export interface MoveSlot {
  id: MoveSlotId;
  communityId: CommunityId;
  // Matches a MoveResourceConfig.key from the community's CommunityConfiguration
  resourceKey: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  bookedByRequestIds: RequestId[];
}
