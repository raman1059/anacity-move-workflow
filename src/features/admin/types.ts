import type {
  AdminDecision,
  AdminReview,
  AdminRole,
  AgentAction,
  AgentRecommendation,
  Community,
  CommunityConfiguration,
  CommunityId,
  CommunityPolicy,
  ChecklistItem,
  Document,
  MoveRequest,
  MoveRequestStatus,
  RequestNote,
  Resident,
  Unit,
} from '@/domain';
import type {
  ChargeCalculationResult,
  ValidateDocumentsResult,
  ValidateRequestResult,
} from '@/lib/policy-engine';
import type { RequestPriority } from '@/lib/request-priority';

// A pickable "who am I acting as" identity — mocked auth, no real login,
// same rule as the resident flows. See lib/admin-identity.ts.
export interface AdminIdentity {
  communityId: CommunityId;
  communityName: string;
  roleKey: string;
  roleLabel: string;
  adminId: string;
  canApproveMoveIn: boolean;
  canApproveMoveOut: boolean;
  canApproveFinancialException: boolean;
  canOverrideAgent: boolean;
}

// One row of the cross-community dashboard table.
export interface DashboardRow {
  request: MoveRequest;
  communityId: CommunityId;
  communityName: string;
  residentName: string;
  unitNumber: string | undefined;
  priority: RequestPriority;
}

export interface DashboardData {
  rows: DashboardRow[];
  communities: { id: CommunityId; name: string }[];
}

// The full "Decision Context" bundle for one request — every field maps
// directly onto the 8 panel items in the spec (what's requested / what
// the policy says / what was provided / what's missing / what the agent
// validated / agent recommendation / why human review is required /
// available actions), plus the raw material (checklist, documents,
// notes, adminReviews, agentActions) the panel renders around it.
export interface RequestDetailData {
  request: MoveRequest;
  resident: Resident | undefined;
  unit: Unit | undefined;
  community: Community;
  communityConfig: CommunityConfiguration;
  checklist: ChecklistItem[];
  documents: Document[];
  notes: RequestNote[];
  adminReviews: AdminReview[];
  agentActions: AgentAction[];

  // "What the policy says" — the policies the agent actually cited when
  // it last recommended or escalated, when that's recoverable; a
  // broader relevant-topic set otherwise (labeled differently in the UI
  // so the distinction between "the exact clause the agent used" and
  // "generally relevant policy" is never blurred).
  citedPolicies: CommunityPolicy[];
  relevantPolicies: CommunityPolicy[];

  // "What the agent validated" / "what is missing"
  validation: ValidateRequestResult;
  documentValidation: ValidateDocumentsResult;
  chargeEstimate: ChargeCalculationResult | null;

  // "Agent recommendation" — reconstructed from the audit log, never
  // re-stored. Distinct from adminReviews, which are the administrator's
  // own decisions.
  latestRecommendation: AgentRecommendation | undefined;

  // "Why human review is required"
  whyHumanReviewRequired: string;

  priority: RequestPriority;

  // "Available actions" — both computed from state-machine.ts's own
  // transition table, never hand-coded per status.
  decisionActions: AdminDecision[];
  otherActions: MoveRequestStatus[];

  // The picked identity's role definition, resolved against THIS
  // request's own community configuration (a role key from elsewhere
  // carries no special authority here) — drives the financial-exception
  // gate on Approve.
  currentRole: AdminRole | undefined;
  isFinancialException: boolean;
  // Whether currentRole is authorized to approve THIS request's type
  // (canApproveMoveIn / canApproveMoveOut) — false when no role is
  // resolved, never assumed permissive.
  canApproveThisType: boolean;
}
