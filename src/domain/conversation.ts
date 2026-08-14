import type { ActionId, ConversationId, MessageId, RequestId } from './ids';
import type { ActorRole } from './enums';

export interface AgentMessage {
  id: MessageId;
  role: 'user' | 'agent' | 'system';
  content: string;
  // AgentActions the orchestrator took while producing this message
  relatedActionIds: ActionId[];
  createdAt: string;
}

export interface AgentConversation {
  id: ConversationId;
  // null before a request exists yet (e.g. a resident asking general questions)
  requestId: RequestId | null;
  actorId: string;
  actorRole: ActorRole;
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
}
