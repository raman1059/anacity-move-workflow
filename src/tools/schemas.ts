import { z } from 'zod';

// Zod mirror of the domain model (src/domain), used to compose per-tool
// input/output schemas. Defined once here so tools don't each re-declare
// the shape of a Resident, a MoveRequest, etc. IDs are plain non-empty
// strings, matching the domain's plain-string-alias convention (see
// domain/ids.ts).
export const idSchema = z.string().min(1);

export const actorRoleSchema = z.enum(['resident', 'admin', 'system']);
export const residentTypeSchema = z.enum(['owner', 'tenant']);
export const residentStatusSchema = z.enum(['prospective', 'active', 'moved_out']);
export const unitStatusSchema = z.enum([
  'vacant',
  'occupied',
  'pending_move_in',
  'pending_move_out',
]);
export const documentStatusSchema = z.enum(['pending_upload', 'uploaded', 'verified', 'rejected']);
export const moveRequestStatusSchema = z.enum([
  'draft',
  'submitted',
  'under_review',
  'information_required',
  'approved',
  'rejected',
  'scheduled',
  'completed',
  'cancelled',
  'escalated',
]);
export const moveRequestTypeSchema = z.enum(['move_in', 'move_out']);
export const checklistItemStatusSchema = z.enum(['pending', 'submitted', 'verified', 'rejected']);
export const checklistItemSourceSchema = z.enum(['document', 'system_check', 'manual']);
export const recommendationActionSchema = z.enum([
  'approve',
  'reject',
  'request_info',
  'approve_with_charges',
]);

export const residentSchema = z.object({
  id: idSchema,
  communityId: idSchema,
  unitId: idSchema.nullable(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  residentType: residentTypeSchema,
  isPrimary: z.boolean(),
  status: residentStatusSchema,
  createdAt: z.string(),
});

export const unitSchema = z.object({
  id: idSchema,
  communityId: idSchema,
  unitNumber: z.string(),
  block: z.string().optional(),
  floor: z.number().optional(),
  type: z.enum(['apartment', 'villa', 'studio']),
  currentResidentIds: z.array(idSchema),
  status: unitStatusSchema,
});

export const communitySchema = z.object({
  id: idSchema,
  name: z.string(),
  city: z.string(),
  timezone: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

const documentRequirementSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  required: z.boolean(),
  residentTypes: z.array(residentTypeSchema).optional(),
});

const moveResourceConfigSchema = z.object({
  key: z.string(),
  label: z.string(),
  capacityPerSlot: z.number(),
  slotDurationMinutes: z.number(),
});

const deductionRuleSchema = z.object({
  key: z.string(),
  label: z.string(),
  calculation: z.enum(['flat', 'per_day_short_notice', 'percentage_of_deposit']),
  amount: z.number(),
});

const adminRoleSchema = z.object({
  key: z.string(),
  label: z.string(),
  canApproveMoveIn: z.boolean(),
  canApproveMoveOut: z.boolean(),
  canApproveFinancialException: z.boolean(),
  canOverrideAgent: z.boolean(),
});

export const communityConfigurationSchema = z.object({
  communityId: idSchema,
  version: z.number(),
  effectiveFrom: z.string(),
  moveIn: z.object({
    minAdvanceBookingDays: z.number(),
    maxOccupants: z.number(),
    requiresNOC: z.boolean(),
    allowedResidentTypes: z.array(residentTypeSchema),
  }),
  moveOut: z.object({
    noticePeriodDays: z.number(),
    requiresInspection: z.boolean(),
    allowEarlyMoveWithPenalty: z.boolean(),
    minSettlementDays: z.number(),
  }),
  documents: z.object({
    moveIn: z.array(documentRequirementSchema),
    moveOut: z.array(documentRequirementSchema),
  }),
  scheduling: z.object({
    businessHoursStart: z.string(),
    businessHoursEnd: z.string(),
    bookingWindowDays: z.number(),
    blackoutDates: z.array(z.string()),
    resources: z.array(moveResourceConfigSchema),
  }),
  charges: z.object({
    currency: z.string(),
    securityDepositAmount: z.number(),
    duesCheckEnabled: z.boolean(),
    shortNoticePenalty: z.object({ enabled: z.boolean(), perDayAmount: z.number() }),
    deductions: z.array(deductionRuleSchema),
  }),
  approval: z.object({
    moveInRequiresAdminApproval: z.boolean(),
    moveOutRequiresAdminApproval: z.boolean(),
    financialEscalationThreshold: z.number(),
  }),
  autonomy: z.object({
    allowAutoStatusAdvance: z.boolean(),
    allowAutoChecklistVerification: z.boolean(),
    allowAutoSlotProposal: z.boolean(),
    idleDaysBeforeEscalate: z.number(),
    minRecommendationConfidence: z.number(),
  }),
  adminPermissions: z.object({ roles: z.array(adminRoleSchema) }),
});

export const communityPolicySchema = z.object({
  id: idSchema,
  communityId: idSchema,
  topic: z.string(),
  title: z.string(),
  body: z.string(),
  version: z.number(),
  effectiveFrom: z.string(),
});

const moveRequestBaseSchema = z.object({
  id: idSchema,
  communityId: idSchema,
  residentId: idSchema,
  unitId: idSchema,
  status: moveRequestStatusSchema,
  previousStatus: moveRequestStatusSchema.optional(),
  requestedDate: z.string(),
  documentIds: z.array(idSchema),
  checklistItemIds: z.array(idSchema),
  moveSlotId: idSchema.optional(),
  createdBy: z.object({ actorId: z.string(), actorRole: actorRoleSchema }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const moveInRequestSchema = moveRequestBaseSchema.extend({
  type: z.literal('move_in'),
  occupantCount: z.number().optional(),
  vehicleCount: z.number().optional(),
});

export const moveOutRequestSchema = moveRequestBaseSchema.extend({
  type: z.literal('move_out'),
  noticeGivenAt: z.string(),
  forwardingAddress: z.string().optional(),
  reasonForMoveOut: z.string().optional(),
  chargeId: idSchema.optional(),
});

export const moveRequestSchema = z.discriminatedUnion('type', [
  moveInRequestSchema,
  moveOutRequestSchema,
]);

export const documentSchema = z.object({
  id: idSchema,
  requestId: idSchema,
  typeKey: z.string(),
  label: z.string(),
  status: documentStatusSchema,
  fileName: z.string().optional(),
  uploadedAt: z.string().optional(),
  verifiedAt: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const checklistItemSchema = z.object({
  id: idSchema,
  requestId: idSchema,
  key: z.string(),
  label: z.string(),
  required: z.boolean(),
  status: checklistItemStatusSchema,
  source: checklistItemSourceSchema,
  relatedDocumentId: idSchema.optional(),
  updatedAt: z.string(),
});

export const moveSlotSchema = z.object({
  id: idSchema,
  communityId: idSchema,
  resourceKey: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  capacity: z.number(),
  bookedCount: z.number(),
  bookedByRequestIds: z.array(idSchema),
});

export const requestNoteSchema = z.object({
  id: idSchema,
  requestId: idSchema,
  authorType: z.enum(['agent', 'admin', 'resident']),
  authorId: z.string(),
  text: z.string(),
  category: z.string(),
  createdAt: z.string(),
});

export const agentRecommendationSchema = z.object({
  action: recommendationActionSchema,
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  citedPolicyIds: z.array(idSchema),
  createdAt: z.string(),
});

export const adminDecisionSchema = z.enum([
  'approved',
  'rejected',
  'requested_info',
  'escalated_further',
]);

export const adminReviewSchema = z.object({
  id: idSchema,
  requestId: idSchema,
  adminId: z.string(),
  agentRecommendation: agentRecommendationSchema.optional(),
  decision: adminDecisionSchema,
  overrodeRecommendation: z.boolean(),
  reason: z.string().optional(),
  createdAt: z.string(),
});

export const validateRequestResultSchema = z.object({
  valid: z.boolean(),
  missingFields: z.array(z.string()),
  violatedPolicies: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const validateDocumentsResultSchema = z.object({
  allRequiredVerified: z.boolean(),
  items: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      required: z.boolean(),
      status: z.enum(['verified', 'uploaded', 'pending_upload', 'rejected', 'not_applicable']),
    })
  ),
  missingKeys: z.array(z.string()),
});

export const chargeCalculationResultSchema = z.object({
  currency: z.string(),
  securityDepositAmount: z.number(),
  lineItems: z.array(
    z.object({ key: z.string(), label: z.string(), amount: z.number(), reason: z.string() })
  ),
  totalDeductions: z.number(),
  netRefundAmount: z.number(),
});
