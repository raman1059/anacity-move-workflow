import type { Community, CommunityConfiguration } from '../../domain';

export const WILLOW_CREEK_ID = 'community-willow-creek';

// A small, fast-turnaround co-living community — deliberately the third
// and most different contrast point (see plan.md's Scalability
// Architecture section): 3-day notice, a single move-in document,
// tenant-only occupancy, no exit inspection, a distinct move-slot
// resource, USD instead of INR, a per-day-short-notice deduction (the
// one DeductionRule.calculation variant neither Greenfield Heights nor
// Riverside Villas exercises), a single full-authority admin role, and
// autonomy settings that intentionally disable automatic status
// advancement — added purely as data, with zero changes to any
// agent/tool/service code, which is the point.
export const willowCreekCommunity: Community = {
  id: WILLOW_CREEK_ID,
  name: 'Willow Creek Co-Living',
  city: 'Austin',
  timezone: 'America/Chicago',
  isActive: true,
  createdAt: '2026-02-01T00:00:00.000Z',
};

export const willowCreekConfiguration: CommunityConfiguration = {
  communityId: WILLOW_CREEK_ID,
  version: 1,
  effectiveFrom: '2026-02-01T00:00:00.000Z',
  moveIn: {
    minAdvanceBookingDays: 1,
    maxOccupants: 2,
    requiresNOC: false,
    allowedResidentTypes: ['tenant'],
  },
  moveOut: {
    noticePeriodDays: 3,
    requiresInspection: false,
    allowEarlyMoveWithPenalty: true,
    minSettlementDays: 1,
  },
  documents: {
    moveIn: [
      {
        key: 'gov_id_proof',
        label: 'Government ID Proof',
        description: 'Passport or driving licence',
        required: true,
      },
    ],
    moveOut: [
      {
        key: 'key_return_form',
        label: 'Key Return Form',
        description: 'Completed on the day of move-out',
        required: true,
      },
    ],
  },
  scheduling: {
    businessHoursStart: '10:00',
    businessHoursEnd: '18:00',
    bookingWindowDays: 3,
    blackoutDates: [],
    resources: [
      {
        key: 'common_lobby_cart',
        label: 'Common Lobby Cart',
        capacityPerSlot: 3,
        slotDurationMinutes: 30,
      },
    ],
  },
  charges: {
    currency: 'USD',
    securityDepositAmount: 500,
    duesCheckEnabled: false,
    shortNoticePenalty: { enabled: false, perDayAmount: 0 },
    deductions: [
      { key: 'late_notice_fee', label: 'Late Notice Fee', calculation: 'per_day_short_notice', amount: 15 },
    ],
  },
  approval: {
    moveInRequiresAdminApproval: true,
    moveOutRequiresAdminApproval: true,
    financialEscalationThreshold: 200,
  },
  autonomy: {
    allowAutoStatusAdvance: false,
    allowAutoChecklistVerification: true,
    allowAutoSlotProposal: true,
    idleDaysBeforeEscalate: 2,
    minRecommendationConfidence: 0.5,
  },
  adminPermissions: {
    roles: [
      {
        key: 'site_manager',
        label: 'Site Manager',
        canApproveMoveIn: true,
        canApproveMoveOut: true,
        canApproveFinancialException: true,
        canOverrideAgent: true,
      },
    ],
  },
};
