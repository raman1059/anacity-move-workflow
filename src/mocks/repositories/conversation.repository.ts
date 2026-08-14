import type { AgentConversation } from '../../domain';
import type { ConversationRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryConversationRepository(
  seed: AgentConversation[]
): ConversationRepository {
  const store = new EntityStore<AgentConversation>(seed);

  return {
    getById: (id) => store.getById(id),
    listByRequest: (requestId) => store.list().filter((c) => c.requestId === requestId),
    listByActor: (actorId) => store.list().filter((c) => c.actorId === actorId),
    create: (conversation) => store.create(conversation),
    appendMessage: (conversationId, message) => {
      const existing = store.getById(conversationId);
      if (!existing) {
        throw new Error(`AgentConversation ${conversationId} not found`);
      }
      return store.update(conversationId, {
        messages: [...existing.messages, message],
        updatedAt: message.createdAt,
      });
    },
  };
}
