import type { CommunityId } from './ids';
import type { ResidentType } from './enums';

export interface Community {
  id: CommunityId;
  name: string;
  city: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
}

export interface DocumentRequirement {
  key: string;
  label: string;
  description: string;
  required: boolean;
  // If omitted, applies to all resident types
  residentTypes?: ResidentType[];
}

export interface MoveInRules {
  minAdvanceBookingDays: number;
  maxOccupants: number;
  requiresNOC: boolean;
  allowedResidentTypes: ResidentType[];
}

export interface MoveOutRules {
  noticePeriodDays: number;
  requiresInspection: boolean;
  allowEarlyMoveWithPenalty: boolean;
  minSettlementDays: number;
}

export interface MoveResourceConfig {
  key: string;
  label: string;
  capacityPerSlot: number;
  slotDurationMinutes: number;
}

export interface SchedulingRules {
  businessHoursStart: string;
  businessHoursEnd: string;
  bookingWindowDays: number;
  blackoutDates: string[];
  resources: MoveResourceConfig[];
}

export interface DeductionRule {
  key: string;
  label: string;
  calculation: 'flat' | 'per_day_short_notice' | 'percentage_of_deposit';
  // Interpreted according to `calculation` — a flat amount, a per-day rate,
  // or a percentage (0-100) of the security deposit.
  amount: number;
}

export interface ChargeRules {
  currency: string;
  securityDepositAmount: number;
  duesCheckEnabled: boolean;
  shortNoticePenalty: {
    enabled: boolean;
    perDayAmount: number;
  };
  deductions: DeductionRule[];
}

export interface ApprovalRules {
  moveInRequiresAdminApproval: boolean;
  moveOutRequiresAdminApproval: boolean;
  // Net charge amount above which the agent must escalate rather than
  // just recommend, regardless of how confident the recommendation is.
  financialEscalationThreshold: number;
}

export interface AutonomyConfig {
  allowAutoStatusAdvance: boolean;
  allowAutoChecklistVerification: boolean;
  allowAutoSlotProposal: boolean;
  idleDaysBeforeEscalate: number;
  // Below this confidence, the agent must escalate instead of recommend.
  minRecommendationConfidence: number;
}

export interface AdminRole {
  key: string;
  label: string;
  canApproveMoveIn: boolean;
  canApproveMoveOut: boolean;
  canApproveFinancialException: boolean;
  canOverrideAgent: boolean;
}

export interface AdminPermissionConfig {
  roles: AdminRole[];
}

export interface CommunityConfiguration {
  communityId: CommunityId;
  version: number;
  effectiveFrom: string;
  moveIn: MoveInRules;
  moveOut: MoveOutRules;
  documents: {
    moveIn: DocumentRequirement[];
    moveOut: DocumentRequirement[];
  };
  scheduling: SchedulingRules;
  charges: ChargeRules;
  approval: ApprovalRules;
  autonomy: AutonomyConfig;
  adminPermissions: AdminPermissionConfig;
}
