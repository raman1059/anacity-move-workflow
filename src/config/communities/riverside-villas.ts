import type { Community, CommunityConfiguration } from '../../domain';

export const RIVERSIDE_VILLAS_ID = 'community-riverside-villas';

// A small, lightweight villa community: no NOC, no inspection, shorter
// 14-day notice, no short-notice penalty, single broad admin role. The
// deliberate contrast with Greenfield Heights is the point — the same
// core workflow and agent logic runs unmodified against both, driven
// entirely by this config.
export const riversideVillasCommunity: Community = {
  id: RIVERSIDE_VILLAS_ID,
  name: 'Riverside Villas',
  city: 'Pune',
  timezone: 'Asia/Kolkata',
  isActive: true,
  createdAt: '2024-06-15T00:00:00.000Z',
};

export const riversideVillasConfiguration: CommunityConfiguration = {
  communityId: RIVERSIDE_VILLAS_ID,
  version: 1,
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  moveIn: {
    minAdvanceBookingDays: 2,
    maxOccupants: 6,
    requiresNOC: false,
    allowedResidentTypes: ['owner', 'tenant'],
  },
  moveOut: {
    noticePeriodDays: 14,
    requiresInspection: false,
    allowEarlyMoveWithPenalty: false,
    minSettlementDays: 3,
  },
  documents: {
    moveIn: [
      {
        key: 'gov_id_proof',
        label: 'Government ID Proof',
        description: 'Passport, Aadhaar, or driving licence',
        required: true,
      },
      {
        key: 'lease_agreement',
        label: 'Lease Agreement',
        description: 'Signed lease for the villa',
        required: true,
        residentTypes: ['tenant'],
      },
      {
        key: 'ownership_deed',
        label: 'Ownership Deed',
        description: 'Proof of ownership for the villa',
        required: true,
        residentTypes: ['owner'],
      },
    ],
    moveOut: [
      {
        key: 'forwarding_address_proof',
        label: 'Forwarding Address Proof',
        description: 'Optional — used only if a refund needs to be mailed',
        required: false,
      },
      {
        key: 'dues_clearance_form',
        label: 'Dues Clearance Acknowledgement',
        description: 'Signed acknowledgement that dues are cleared or itemized',
        required: true,
      },
    ],
  },
  scheduling: {
    businessHoursStart: '08:00',
    businessHoursEnd: '20:00',
    bookingWindowDays: 10,
    blackoutDates: [],
    resources: [
      {
        key: 'driveway_loading',
        label: 'Driveway Loading Area',
        capacityPerSlot: 2,
        slotDurationMinutes: 90,
      },
    ],
  },
  charges: {
    currency: 'INR',
    securityDepositAmount: 20000,
    duesCheckEnabled: true,
    shortNoticePenalty: { enabled: false, perDayAmount: 0 },
    deductions: [],
  },
  approval: {
    moveInRequiresAdminApproval: true,
    moveOutRequiresAdminApproval: true,
    financialEscalationThreshold: 5000,
  },
  autonomy: {
    allowAutoStatusAdvance: true,
    allowAutoChecklistVerification: true,
    allowAutoSlotProposal: true,
    idleDaysBeforeEscalate: 5,
    minRecommendationConfidence: 0.55,
  },
  adminPermissions: {
    roles: [
      {
        key: 'community_manager',
        label: 'Community Manager',
        canApproveMoveIn: true,
        canApproveMoveOut: true,
        canApproveFinancialException: true,
        canOverrideAgent: true,
      },
    ],
  },
};
