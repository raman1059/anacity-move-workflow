import type {
  AgentConversation,
  ChecklistItem,
  Community,
  CommunityConfiguration,
  CommunityPolicy,
  Document,
  MoveRequest,
  RequestNote,
  Resident,
  Unit,
} from '@/domain';

export type { UiMessage } from '../shared/types';

// Mirrors the response shape of GET /api/resident/[residentId]/workspace.
export interface WorkspaceData {
  resident: Resident;
  community: Community;
  communityConfig: CommunityConfiguration;
  unit: Unit | null;
  activeRequest: MoveRequest | null;
  checklist: ChecklistItem[];
  documents: Document[];
  notes: RequestNote[];
  relevantPolicies: CommunityPolicy[];
  conversation: AgentConversation | null;
}
