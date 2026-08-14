import type {
  CommunityId,
  MoveRequest,
  MoveRequestBase,
  MoveRequestStatus,
  RequestId,
  ResidentId,
} from '../domain';

// Base fields (status, moveSlotId, document/checklist links, ...) plus a
// flat, optional union of the few type-specific fields a resident
// legitimately supplies after creation (answering "how many occupants?"
// in chat, for instance) — not the full Partial<MoveInRequest |
// MoveOutRequest>, which would also let this method silently accept
// `type` or other fields that must never change post-creation.
export type MoveRequestPatch = Partial<MoveRequestBase> & {
  occupantCount?: number;
  vehicleCount?: number;
  forwardingAddress?: string;
  reasonForMoveOut?: string;
};

export interface MoveRequestRepository {
  getById(id: RequestId): MoveRequest | undefined;
  listByCommunity(communityId: CommunityId): MoveRequest[];
  listByResident(residentId: ResidentId): MoveRequest[];
  listByStatus(communityId: CommunityId, status: MoveRequestStatus): MoveRequest[];
  create(request: MoveRequest): MoveRequest;
  update(id: RequestId, patch: MoveRequestPatch): MoveRequest;
}
