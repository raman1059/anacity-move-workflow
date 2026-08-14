import type { AdminDecision, MoveRequestStatus } from '../domain';

// The one place this mapping is defined — shared by record-admin-decision.tool.ts
// (which enforces it) and features/admin's request-detail aggregator
// (which uses it to compute which of the 4 decision buttons are
// currently legal, via state-machine.ts's own transition table). Kept
// out of the tool file so the read-only UI layer doesn't have to import
// from tools/implementations/* directly.
export const ADMIN_DECISION_TARGET_STATUS: Record<AdminDecision, MoveRequestStatus> = {
  approved: 'approved',
  rejected: 'rejected',
  requested_info: 'information_required',
  escalated_further: 'escalated',
};
