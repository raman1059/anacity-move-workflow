import type {
  ChargeId,
  ChecklistItemId,
  CommunityId,
  DocumentId,
  MoveSlotId,
  RequestId,
  ResidentId,
  UnitId,
} from './ids';
import type { ActorRole, MoveRequestStatus } from './enums';

export interface MoveRequestBase {
  id: RequestId;
  communityId: CommunityId;
  residentId: ResidentId;
  unitId: UnitId;
  status: MoveRequestStatus;
  // Set when status transitions to 'escalated' so resolution can return
  // the case to where it was, rather than a fixed state.
  previousStatus?: MoveRequestStatus;
  requestedDate: string;
  documentIds: DocumentId[];
  checklistItemIds: ChecklistItemId[];
  moveSlotId?: MoveSlotId;
  createdBy: { actorId: string; actorRole: ActorRole };
  createdAt: string;
  updatedAt: string;
}

export interface MoveInRequest extends MoveRequestBase {
  type: 'move_in';
  occupantCount?: number;
  vehicleCount?: number;
}

export interface MoveOutRequest extends MoveRequestBase {
  type: 'move_out';
  noticeGivenAt: string;
  forwardingAddress?: string;
  reasonForMoveOut?: string;
  chargeId?: ChargeId;
}

export type MoveRequest = MoveInRequest | MoveOutRequest;
