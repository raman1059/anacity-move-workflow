// Repository contracts for the whole domain — one interface per aggregate,
// bundled below into `Repositories`.
//
// Nothing outside `mocks/repositories/*` should ever depend on the fact
// that data currently lives in in-process Maps. The service layer, agent
// tools, API routes, and any future UI depend only on the interfaces here.
// Swapping persistence later means writing e.g.
// `createPrismaRepositories(prisma): Repositories` or
// `createDynamoRepositories(docClient): Repositories` that satisfies the
// same shape — no caller changes.
import type { AdminReviewRepository } from './admin-review.repository';
import type { AgentActionRepository } from './agent-action.repository';
import type { ChargeRepository } from './charge.repository';
import type { ChecklistRepository } from './checklist.repository';
import type { CommunityRepository } from './community.repository';
import type { ConversationRepository } from './conversation.repository';
import type { DocumentRepository } from './document.repository';
import type { MoveRequestRepository } from './move-request.repository';
import type { MoveSlotRepository } from './move-slot.repository';
import type { PolicyRepository } from './policy.repository';
import type { RequestNoteRepository } from './request-note.repository';
import type { ResidentRepository } from './resident.repository';
import type { UnitRepository } from './unit.repository';

export interface Repositories {
  communities: CommunityRepository;
  policies: PolicyRepository;
  residents: ResidentRepository;
  units: UnitRepository;
  moveRequests: MoveRequestRepository;
  documents: DocumentRepository;
  checklistItems: ChecklistRepository;
  moveSlots: MoveSlotRepository;
  charges: ChargeRepository;
  conversations: ConversationRepository;
  agentActions: AgentActionRepository;
  adminReviews: AdminReviewRepository;
  requestNotes: RequestNoteRepository;
}

export type { AdminReviewRepository } from './admin-review.repository';
export type { AgentActionRepository } from './agent-action.repository';
export type { ChargeRepository } from './charge.repository';
export type { ChecklistRepository } from './checklist.repository';
export type { CommunityRepository } from './community.repository';
export type { ConversationRepository } from './conversation.repository';
export type { DocumentRepository } from './document.repository';
export type { MoveRequestPatch, MoveRequestRepository } from './move-request.repository';
export type { MoveSlotRepository } from './move-slot.repository';
export type { PolicyRepository } from './policy.repository';
export type { RequestNoteRepository } from './request-note.repository';
export type { ResidentRepository } from './resident.repository';
export type { UnitRepository } from './unit.repository';
