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
import type { ChargeCalculationResult } from '@/lib/policy-engine';

export type { UiMessage } from '../shared/types';

// Mirrors the response shape of GET /api/resident/[residentId]/move-out-workspace.
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
  // A live projection (deposit, short-notice penalty, deductions) from
  // community configuration alone — see lib/policy-engine.ts. Purely
  // informational until an admin confirms it; never treated as final.
  chargeEstimate: ChargeCalculationResult | null;
}
