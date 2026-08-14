import type { AgentConversation, AgentMessage, ConversationId, RequestId } from '../domain';

export interface ConversationRepository {
  getById(id: ConversationId): AgentConversation | undefined;
  listByRequest(requestId: RequestId): AgentConversation[];
  // A conversation is created before a request may exist yet (requestId
  // starts null — see domain/conversation.ts) and requestId can't be
  // changed after creation, so listByRequest alone can't find "the"
  // conversation for a resident's journey once it's linked. This is what
  // lets the workspace re-hydrate a conversation started before its
  // request existed.
  listByActor(actorId: string): AgentConversation[];
  create(conversation: AgentConversation): AgentConversation;
  appendMessage(conversationId: ConversationId, message: AgentMessage): AgentConversation;
}
