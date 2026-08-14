import type { Repositories } from '../../repositories';
import type { SeedData } from '../types';
import { createInMemoryAdminReviewRepository } from './admin-review.repository';
import { createInMemoryAgentActionRepository } from './agent-action.repository';
import { createInMemoryChargeRepository } from './charge.repository';
import { createInMemoryChecklistRepository } from './checklist.repository';
import { createInMemoryCommunityRepository } from './community.repository';
import { createInMemoryConversationRepository } from './conversation.repository';
import { createInMemoryDocumentRepository } from './document.repository';
import { createInMemoryMoveRequestRepository } from './move-request.repository';
import { createInMemoryMoveSlotRepository } from './move-slot.repository';
import { createInMemoryPolicyRepository } from './policy.repository';
import { createInMemoryRequestNoteRepository } from './request-note.repository';
import { createInMemoryResidentRepository } from './resident.repository';
import { createInMemoryUnitRepository } from './unit.repository';

// The one place that knows the current persistence choice is in-memory.
// A future `createPrismaRepositories`/`createDynamoRepositories` sibling
// module would take the same shape of arguments (or a client) and return
// the same `Repositories` type — everything downstream (services, agent
// tools, API routes) is unaffected by the switch.
export function createMockRepositories(seed: SeedData): Repositories {
  return {
    communities: createInMemoryCommunityRepository(seed.communities, seed.communityConfigurations),
    policies: createInMemoryPolicyRepository(seed.policies),
    residents: createInMemoryResidentRepository(seed.residents),
    units: createInMemoryUnitRepository(seed.units),
    moveRequests: createInMemoryMoveRequestRepository(seed.moveRequests),
    documents: createInMemoryDocumentRepository(seed.documents),
    checklistItems: createInMemoryChecklistRepository(seed.checklistItems),
    moveSlots: createInMemoryMoveSlotRepository(seed.moveSlots),
    charges: createInMemoryChargeRepository(seed.charges),
    conversations: createInMemoryConversationRepository(seed.conversations),
    agentActions: createInMemoryAgentActionRepository(seed.agentActions),
    adminReviews: createInMemoryAdminReviewRepository(seed.adminReviews),
    requestNotes: createInMemoryRequestNoteRepository(seed.requestNotes),
  };
}
