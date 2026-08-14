import type { AdminReview } from '../../domain';

export const adminReviews: AdminReview[] = [
  // Rohan Gupta — admin accepted the agent's recommendation outright.
  {
    id: 'review-gh-002',
    requestId: 'request-gh-002',
    adminId: 'admin-gh-facility-manager',
    agentRecommendation: {
      action: 'approve',
      rationale:
        'All required documents verified (government ID, ownership deed, Society NOC). No policy violations. Requested move-in date is within the booking window.',
      confidence: 0.95,
      citedPolicyIds: ['policy-gh-move-in-documents', 'policy-gh-noc'],
      createdAt: '2026-08-09T11:29:00.000Z',
    },
    decision: 'approved',
    overrodeRecommendation: false,
    createdAt: '2026-08-09T11:45:00.000Z',
  },
  // Aditi Bose — admin overrode the agent's reject recommendation after
  // verifying the name mismatch by phone. This is the case that matters
  // most for the audit trail: the disagreement and its reason are both
  // preserved even though the outcome differed from the recommendation.
  {
    id: 'review-gh-007',
    requestId: 'request-gh-007',
    adminId: 'admin-gh-facility-manager',
    agentRecommendation: {
      action: 'reject',
      rationale:
        'Name mismatch between government ID (Aditi Bose) and ownership deed (Aditi R. Bose) could not be automatically reconciled.',
      confidence: 0.6,
      citedPolicyIds: ['policy-gh-move-in-documents'],
      createdAt: '2026-08-07T10:00:05.000Z',
    },
    decision: 'approved',
    overrodeRecommendation: true,
    reason:
      'Verified by phone on 2026-08-08 — "R." is a middle initial omitted from the ID; both documents confirmed to belong to the same person.',
    createdAt: '2026-08-08T15:45:00.000Z',
  },
  // Imran Qureshi — admin agreed with the agent's reject recommendation.
  {
    id: 'review-rv-003',
    requestId: 'request-rv-003',
    adminId: 'admin-rv-community-manager',
    agentRecommendation: {
      action: 'reject',
      rationale:
        'Outstanding dues of ₹18,400 remain unresolved after two information-required cycles; move-out cannot proceed until dues are cleared per policy.',
      confidence: 0.85,
      citedPolicyIds: ['policy-rv-dues'],
      createdAt: '2026-08-06T12:35:00.000Z',
    },
    decision: 'rejected',
    overrodeRecommendation: false,
    createdAt: '2026-08-06T13:00:00.000Z',
  },
  // Vikram Shah (request-gh-005) and Meera Iyer (request-rv-002) have no
  // AdminReview yet — they're still under_review / escalated, correctly
  // awaiting a human decision.
];
