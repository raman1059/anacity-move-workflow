export type MoveRequestType = 'move_in' | 'move_out';

export type MoveRequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'information_required'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'escalated';

export type ActorRole = 'resident' | 'admin' | 'system';

export type AutonomyTier = 'guide' | 'decide' | 'act' | 'recommend' | 'escalate';

export type ResidentType = 'owner' | 'tenant';

export type ResidentStatus = 'prospective' | 'active' | 'moved_out';

export type UnitStatus = 'vacant' | 'occupied' | 'pending_move_in' | 'pending_move_out';

export type DocumentStatus = 'pending_upload' | 'uploaded' | 'verified' | 'rejected';

export type ChecklistItemStatus = 'pending' | 'submitted' | 'verified' | 'rejected';

export type ChecklistItemSource = 'document' | 'system_check' | 'manual';

export type ChargeStatus = 'projected' | 'admin_confirmed';

export type AdminDecision = 'approved' | 'rejected' | 'requested_info' | 'escalated_further';

export type RecommendationAction = 'approve' | 'reject' | 'request_info' | 'approve_with_charges';
