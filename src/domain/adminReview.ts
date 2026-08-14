import type { PolicyId, RequestId, ReviewId } from './ids';
import type { AdminDecision, RecommendationAction } from './enums';

export interface AgentRecommendation {
  action: RecommendationAction;
  rationale: string;
  confidence: number;
  citedPolicyIds: PolicyId[];
  createdAt: string;
}

export interface AdminReview {
  id: ReviewId;
  requestId: RequestId;
  adminId: string;
  agentRecommendation?: AgentRecommendation;
  decision: AdminDecision;
  overrodeRecommendation: boolean;
  // Required whenever overrodeRecommendation is true
  reason?: string;
  createdAt: string;
}
