import type {
  AdminReview,
  AgentAction,
  AgentConversation,
  Charge,
  ChecklistItem,
  Community,
  CommunityConfiguration,
  CommunityPolicy,
  Document,
  MoveRequest,
  MoveSlot,
  RequestNote,
  Resident,
  Unit,
} from '../domain';

// The shape mock/seed data must conform to for `createMockRepositories`.
// A future real-persistence swap-in doesn't use this type at all — it's
// specific to the mock layer, not part of the `Repositories` contract.
export interface SeedData {
  communities: Community[];
  communityConfigurations: CommunityConfiguration[];
  policies: CommunityPolicy[];
  residents: Resident[];
  units: Unit[];
  moveRequests: MoveRequest[];
  documents: Document[];
  checklistItems: ChecklistItem[];
  moveSlots: MoveSlot[];
  charges: Charge[];
  conversations: AgentConversation[];
  agentActions: AgentAction[];
  adminReviews: AdminReview[];
  requestNotes: RequestNote[];
}
