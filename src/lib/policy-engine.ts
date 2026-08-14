import type {
  CommunityConfiguration,
  Document,
  DocumentStatus,
  MoveOutRequest,
  MoveRequest,
  Resident,
} from '../domain';

// Pure functions only — no repository/tool dependency. This is what
// validate-request.tool.ts, validate-documents.tool.ts, and
// calculate-move-out-charges.tool.ts wrap. Kept separate from the tools
// themselves so the actual decision logic is testable without any
// permission/context machinery in the way.

export interface ValidateRequestResult {
  valid: boolean;
  // Request-level fields the resident hasn't supplied yet (e.g. occupant
  // count) — distinct from violatedPolicies, which are fields that ARE
  // present but break a configured rule (e.g. short notice).
  missingFields: string[];
  violatedPolicies: string[];
  warnings: string[];
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export function validateMoveRequest(
  request: MoveRequest,
  resident: Resident,
  config: CommunityConfiguration
): ValidateRequestResult {
  const missingFields: string[] = [];
  const violatedPolicies: string[] = [];
  const warnings: string[] = [];

  if (request.type === 'move_in') {
    if (request.occupantCount === undefined) {
      missingFields.push('occupantCount');
    } else if (request.occupantCount > config.moveIn.maxOccupants) {
      violatedPolicies.push('max_occupants_exceeded');
    }

    if (!config.moveIn.allowedResidentTypes.includes(resident.residentType)) {
      violatedPolicies.push('resident_type_not_allowed');
    }

    const advanceDays = daysBetween(new Date().toISOString(), request.requestedDate);
    if (advanceDays < config.moveIn.minAdvanceBookingDays) {
      warnings.push('insufficient_advance_booking');
    }
  } else {
    const noticeDays = daysBetween(request.noticeGivenAt, request.requestedDate);
    if (noticeDays < config.moveOut.noticePeriodDays) {
      if (config.moveOut.allowEarlyMoveWithPenalty) {
        violatedPolicies.push('notice_period_short');
      } else {
        violatedPolicies.push('notice_period_short_not_permitted');
      }
    }
  }

  return {
    valid: missingFields.length === 0 && violatedPolicies.length === 0,
    missingFields,
    violatedPolicies,
    warnings,
  };
}

export type DocumentValidationStatus =
  'verified' | 'uploaded' | 'pending_upload' | 'rejected' | 'not_applicable';

export interface DocumentValidationItem {
  key: string;
  label: string;
  required: boolean;
  status: DocumentValidationStatus;
}

export interface ValidateDocumentsResult {
  allRequiredVerified: boolean;
  items: DocumentValidationItem[];
  missingKeys: string[];
}

function toValidationStatus(status: DocumentStatus | undefined): DocumentValidationStatus {
  return status ?? 'pending_upload';
}

export function validateMoveRequestDocuments(
  request: MoveRequest,
  resident: Resident,
  config: CommunityConfiguration,
  documents: Document[]
): ValidateDocumentsResult {
  const requirements =
    request.type === 'move_in' ? config.documents.moveIn : config.documents.moveOut;
  const byTypeKey = new Map(documents.map((doc) => [doc.typeKey, doc]));

  const items: DocumentValidationItem[] = requirements.map((requirement) => {
    const appliesToResident =
      !requirement.residentTypes || requirement.residentTypes.includes(resident.residentType);
    if (!appliesToResident) {
      return {
        key: requirement.key,
        label: requirement.label,
        required: false,
        status: 'not_applicable',
      };
    }
    const doc = byTypeKey.get(requirement.key);
    return {
      key: requirement.key,
      label: requirement.label,
      required: requirement.required,
      status: toValidationStatus(doc?.status),
    };
  });

  const missingKeys = items
    .filter((item) => item.required && item.status !== 'verified')
    .map((item) => item.key);

  return {
    allRequiredVerified: missingKeys.length === 0,
    items,
    missingKeys,
  };
}

export interface ChargeCalculationLineItem {
  key: string;
  label: string;
  // Negative = deduction
  amount: number;
  reason: string;
}

export interface ChargeCalculationResult {
  currency: string;
  securityDepositAmount: number;
  lineItems: ChargeCalculationLineItem[];
  totalDeductions: number;
  netRefundAmount: number;
}

// Computes strictly from CommunityConfiguration — there is no dues ledger
// anywhere in this domain model (consistent with plan.md §2.13: dues/
// payment systems are mocked). If dues clearance is unverified, that
// blocks progress via validateMoveRequestDocuments's missingKeys — it is
// never turned into a guessed dollar figure here.
export function calculateMoveOutCharges(
  request: MoveOutRequest,
  config: CommunityConfiguration
): ChargeCalculationResult {
  const deposit = config.charges.securityDepositAmount;
  const noticeDays = daysBetween(request.noticeGivenAt, request.requestedDate);
  const shortfallDays = Math.max(0, config.moveOut.noticePeriodDays - noticeDays);

  const lineItems: ChargeCalculationLineItem[] = [];

  if (config.charges.shortNoticePenalty.enabled && shortfallDays > 0) {
    const amount = shortfallDays * config.charges.shortNoticePenalty.perDayAmount;
    lineItems.push({
      key: 'short_notice_penalty',
      label: 'Short Notice Penalty',
      amount: -amount,
      reason: `Notice period requires ${config.moveOut.noticePeriodDays} days; only ${noticeDays} given (${shortfallDays} days short × ${config.charges.currency} ${config.charges.shortNoticePenalty.perDayAmount}/day).`,
    });
  }

  for (const deduction of config.charges.deductions) {
    if (deduction.calculation === 'flat') {
      lineItems.push({
        key: deduction.key,
        label: deduction.label,
        amount: -deduction.amount,
        reason: deduction.label,
      });
    } else if (deduction.calculation === 'percentage_of_deposit') {
      lineItems.push({
        key: deduction.key,
        label: deduction.label,
        amount: -Math.round((deposit * deduction.amount) / 100),
        reason: `${deduction.amount}% of security deposit.`,
      });
    } else if (deduction.calculation === 'per_day_short_notice' && shortfallDays > 0) {
      lineItems.push({
        key: deduction.key,
        label: deduction.label,
        amount: -(shortfallDays * deduction.amount),
        reason: `${shortfallDays} days short × ${config.charges.currency} ${deduction.amount}/day.`,
      });
    }
  }

  const totalDeductions = lineItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const netRefundAmount = Math.max(0, deposit - totalDeductions);

  return {
    currency: config.charges.currency,
    securityDepositAmount: deposit,
    lineItems,
    totalDeductions,
    netRefundAmount,
  };
}
