import type { Community, CommunityConfiguration } from '../../domain';

export const GREENFIELD_HEIGHTS_ID = 'community-greenfield-heights';

// A large, strict high-rise community: NOC required, exit inspection
// required, 30-day notice, short-notice penalty enabled, two-tier admin
// approval (Facility Manager + Treasurer for financial exceptions).
export const greenfieldHeightsCommunity: Community = {
  id: GREENFIELD_HEIGHTS_ID,
  name: 'Greenfield Heights',
  city: 'Bengaluru',
  timezone: 'Asia/Kolkata',
  isActive: true,
  createdAt: '2024-01-10T00:00:00.000Z',
};

export const greenfieldHeightsConfiguration: CommunityConfiguration = {
  communityId: GREENFIELD_HEIGHTS_ID,
  version: 3,
  effectiveFrom: '2026-04-01T00:00:00.000Z',
  moveIn: {
    minAdvanceBookingDays: 5,
    maxOccupants: 4,
    requiresNOC: true,
    allowedResidentTypes: ['owner', 'tenant'],
  },
  moveOut: {
    noticePeriodDays: 30,
    requiresInspection: true,
    allowEarlyMoveWithPenalty: true,
    minSettlementDays: 7,
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
        description: 'Signed lease for the unit',
        required: true,
        residentTypes: ['tenant'],
      },
      {
        key: 'ownership_deed',
        label: 'Ownership Deed',
        description: 'Proof of ownership for the unit',
        required: true,
        residentTypes: ['owner'],
      },
      {
        key: 'society_noc',
        label: 'Society NOC',
        description: 'No Objection Certificate from the society office',
        required: true,
      },
      {
        key: 'vehicle_registration',
        label: 'Vehicle Registration',
        description: 'Required only if a parking allocation is requested',
        required: false,
      },
    ],
    moveOut: [
      {
        key: 'forwarding_address_proof',
        label: 'Forwarding Address Proof',
        description: 'Proof of the address deposit refund should be linked to',
        required: true,
      },
      {
        key: 'dues_clearance_form',
        label: 'Dues Clearance Acknowledgement',
        description: 'Signed acknowledgement that dues are cleared or itemized',
        required: true,
      },
      {
        key: 'key_return_form',
        label: 'Key Return Form',
        description: 'Completed on the day of move-out',
        required: true,
      },
    ],
  },
  scheduling: {
    businessHoursStart: '09:00',
    businessHoursEnd: '18:00',
    bookingWindowDays: 21,
    blackoutDates: ['2026-12-25', '2027-01-01'],
    resources: [
      {
        key: 'elevator_service',
        label: 'Service Elevator',
        capacityPerSlot: 1,
        slotDurationMinutes: 60,
      },
      { key: 'loading_dock', label: 'Loading Dock', capacityPerSlot: 1, slotDurationMinutes: 60 },
    ],
  },
  charges: {
    currency: 'INR',
    securityDepositAmount: 50000,
    duesCheckEnabled: true,
    shortNoticePenalty: { enabled: true, perDayAmount: 500 },
    deductions: [
      { key: 'cleaning_fee', label: 'Standard Cleaning Fee', calculation: 'flat', amount: 2000 },
    ],
  },
  approval: {
    moveInRequiresAdminApproval: true,
    moveOutRequiresAdminApproval: true,
    financialEscalationThreshold: 10000,
  },
  autonomy: {
    allowAutoStatusAdvance: true,
    allowAutoChecklistVerification: true,
    allowAutoSlotProposal: true,
    idleDaysBeforeEscalate: 10,
    minRecommendationConfidence: 0.6,
  },
  adminPermissions: {
    roles: [
      {
        key: 'facility_manager',
        label: 'Facility Manager',
        canApproveMoveIn: true,
        canApproveMoveOut: true,
        canApproveFinancialException: false,
        canOverrideAgent: true,
      },
      {
        key: 'treasurer',
        label: 'Treasurer',
        canApproveMoveIn: false,
        canApproveMoveOut: true,
        canApproveFinancialException: true,
        canOverrideAgent: true,
      },
    ],
  },
};
