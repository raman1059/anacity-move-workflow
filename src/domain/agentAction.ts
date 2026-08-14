import type { ActionId, ConversationId, RequestId } from './ids';
import type { ActorRole, AutonomyTier } from './enums';

export type ToolName =
  | 'getResident'
  | 'getCommunity'
  | 'getCommunityConfig'
  | 'getCommunityPolicy'
  | 'getMoveRequest'
  | 'validateMoveRequest'
  | 'validateDocuments'
  | 'calculateMoveOutCharges'
  | 'getAvailableMoveSlots'
  | 'createMoveRequest'
  | 'updateMoveRequest'
  | 'uploadDocument'
  | 'addRequestNote'
  | 'addAdminNote'
  | 'recommendAction'
  | 'escalateToAdmin'
  | 'recordAdminDecision';

export interface AgentAction {
  id: ActionId;
  requestId: RequestId;
  conversationId?: ConversationId;
  turnId: string;
  tool: ToolName;
  tier: AutonomyTier;
  actorRole: ActorRole;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}
