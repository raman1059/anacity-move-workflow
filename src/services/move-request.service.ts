import type {
  AdminReview,
  AgentAction,
  Charge,
  ChecklistItem,
  CommunityId,
  Document,
  MoveRequest,
  RequestId,
  RequestNote,
  Resident,
  ResidentId,
  Unit,
} from '../domain';
import type { Repositories } from '../repositories';

export interface MoveRequestDetail {
  request: MoveRequest;
  resident: Resident | undefined;
  unit: Unit | undefined;
  documents: Document[];
  checklist: ChecklistItem[];
  charge: Charge | undefined;
  notes: RequestNote[];
  adminReviews: AdminReview[];
  agentActions: AgentAction[];
}

export interface MoveRequestService {
  listByCommunity(communityId: CommunityId): MoveRequest[];
  listByResident(residentId: ResidentId): MoveRequest[];
  getById(requestId: RequestId): MoveRequest | undefined;
  // Aggregates a request with everything a resident/admin view needs to
  // render it in one shot — the kind of read-model composition that
  // belongs in the service layer, not scattered across UI components.
  getDetail(requestId: RequestId): MoveRequestDetail | undefined;
}

export function createMoveRequestService(repositories: Repositories): MoveRequestService {
  return {
    listByCommunity: (communityId) => repositories.moveRequests.listByCommunity(communityId),
    listByResident: (residentId) => repositories.moveRequests.listByResident(residentId),
    getById: (requestId) => repositories.moveRequests.getById(requestId),
    getDetail: (requestId) => {
      const request = repositories.moveRequests.getById(requestId);
      if (!request) {
        return undefined;
      }
      return {
        request,
        resident: repositories.residents.getById(request.residentId),
        unit: repositories.units.getById(request.unitId),
        documents: repositories.documents.listByRequest(requestId),
        checklist: repositories.checklistItems.listByRequest(requestId),
        charge: repositories.charges.getByRequest(requestId),
        notes: repositories.requestNotes.listByRequest(requestId),
        adminReviews: repositories.adminReviews.listByRequest(requestId),
        agentActions: repositories.agentActions.listByRequest(requestId),
      };
    },
  };
}
