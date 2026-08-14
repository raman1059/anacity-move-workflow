import type { CommunityPolicy, MoveRequest, RequestNote } from '../domain';
import type {
  ChargeCalculationResult,
  ValidateDocumentsResult,
  ValidateRequestResult,
} from '../lib/policy-engine';
import type { GuardrailViolation } from './types';

// Deterministic, template-driven reply text, grounded only in structured
// data already gathered this turn — never freeform LLM generation. This
// is the concrete mechanism (alongside the narrow LLMAgentProvider) that
// keeps this a governed workflow agent rather than a chatbot: the reply
// is a rendering of facts already established, not a new source of them.
export type ReplyScenario =
  | 'missing_unit'
  | 'missing_move_out_date'
  | 'missing_fields'
  | 'missing_documents'
  | 'status_escalated'
  | 'status_terminal'
  | 'status_scheduled'
  | 'status_approved_awaiting_schedule'
  | 'recommend_approve'
  | 'recommend_approve_with_charges'
  | 'escalate_policy_ambiguity'
  | 'escalate_exception'
  | 'escalate_generic'
  | 'ask_question_with_policy'
  | 'ask_question_with_charges'
  | 'ask_question_no_policy'
  | 'charge_waiver_escalated'
  | 'charge_waiver_no_request'
  | 'charge_waiver_terminal'
  | 'ready_awaiting_manual_advance'
  | 'ambiguous_occupant_count'
  | 'request_cancelled'
  | 'cannot_cancel'
  | 'nothing_to_cancel'
  | 'ambiguous';

export interface ReplyParams {
  scenario: ReplyScenario;
  request?: MoveRequest;
  validation?: ValidateRequestResult;
  documentValidation?: ValidateDocumentsResult;
  chargeResult?: ChargeCalculationResult;
  policies?: CommunityPolicy[];
  guardrailViolations?: GuardrailViolation[];
  latestNote?: RequestNote;
  occupantCountConflict?: { existing: number; incoming: number };
}

function noticePolicyLine(policies: CommunityPolicy[] | undefined): string | undefined {
  const notice = policies?.find((p) => p.topic === 'notice_period');
  return notice ? `${notice.title}: ${notice.body}` : undefined;
}

function humanizeField(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${Math.abs(Math.round(amount)).toLocaleString()}`;
}

export function buildReply(params: ReplyParams): string {
  switch (params.scenario) {
    case 'missing_unit':
      return 'Sure — which unit is this for?';

    case 'missing_move_out_date':
      return "Sure — what's your intended move-out date? (YYYY-MM-DD)";

    case 'missing_fields': {
      const fields = (params.validation?.missingFields ?? []).map(humanizeField).join(', ');
      const notice = params.request?.type === 'move_out' ? noticePolicyLine(params.policies) : undefined;
      const ask = `I still need a bit more information: ${fields}.`;
      return notice ? `${notice} ${ask}` : `Thanks — ${ask}`;
    }

    case 'missing_documents': {
      const missing = (params.documentValidation?.items ?? [])
        .filter((item) => item.required && item.status !== 'verified')
        .map((item) => item.label)
        .join(', ');
      const notice = params.request?.type === 'move_out' ? noticePolicyLine(params.policies) : undefined;
      const ask = `I still need the following before I can move this forward: ${missing}.`;
      return notice ? `${notice} ${ask}` : ask;
    }

    case 'status_escalated':
      return "This request has been flagged for a community administrator to review directly — I'll let you know as soon as there's an update.";

    case 'status_terminal': {
      if (params.request?.status === 'rejected') {
        return params.latestNote
          ? `This request was rejected. ${params.latestNote.text}`
          : 'This request was rejected. Contact your community administrator for the specific reason.';
      }
      if (params.request?.status === 'completed') {
        return 'This request has been completed.';
      }
      return 'This request has been cancelled.';
    }

    case 'status_scheduled':
      return 'This request is approved and scheduled.';

    case 'status_approved_awaiting_schedule':
      return 'This request has been approved and is awaiting a move slot.';

    case 'recommend_approve':
      return "Everything looks complete — I've recommended approval to the community admin. You'll be notified once it's confirmed.";

    case 'recommend_approve_with_charges': {
      const charge = params.chargeResult;
      if (!charge)
        return 'Your request is valid, but some charges may apply pending admin confirmation.';
      const lines = charge.lineItems
        .map((item) => `${item.label}: ${formatAmount(item.amount, charge.currency)}`)
        .join('; ');
      return `Your request is valid, but the following charges apply: ${lines}. Estimated net refund: ${formatAmount(charge.netRefundAmount, charge.currency)}. This is pending admin confirmation before it's final.`;
    }

    case 'escalate_policy_ambiguity':
      return "I don't have a defined policy for this situation in this community, so I'm not able to resolve it myself — I've flagged it for a community administrator to follow up with you directly.";

    case 'escalate_exception':
      return "This request doesn't meet the standard policy and would need an exception. I can't grant that myself, so I've flagged it for a community administrator to follow up with you.";

    case 'escalate_generic':
      return "I've flagged this request for a community administrator to review directly.";

    case 'ask_question_with_policy': {
      const policy = params.policies?.[0];
      return policy
        ? `${policy.title}: ${policy.body}`
        : "I don't have a specific policy on file for that in this community.";
    }

    case 'ask_question_with_charges': {
      const policy = params.policies?.[0];
      const charge = params.chargeResult;
      const policyLine = policy ? `${policy.title}: ${policy.body}` : '';
      if (!charge) return policyLine || "I don't have a specific policy on file for that.";
      const lines = charge.lineItems
        .map((item) => `${item.label}: ${formatAmount(item.amount, charge.currency)}`)
        .join('; ');
      const chargeLine =
        charge.lineItems.length > 0
          ? `Based on your request as it stands today, projected charges are: ${lines}, for an estimated net refund of ${formatAmount(charge.netRefundAmount, charge.currency)}.`
          : `Based on your request as it stands today, no deductions apply — your full deposit of ${formatAmount(charge.securityDepositAmount, charge.currency)} is projected to be refunded.`;
      return `${policyLine} ${chargeLine} This is only a projection and can change before final admin confirmation.`.trim();
    }

    case 'ask_question_no_policy':
      return "I don't have a defined policy for that in this community — I can flag it for an administrator if you'd like.";

    case 'charge_waiver_escalated':
      return "I'm not able to waive, reduce, or adjust charges myself — that decision can only be made by a community admin. I've flagged your request for their review.";

    case 'charge_waiver_no_request':
      return "I don't see an active move-out request to review a charge on. If you believe you've been charged in error, a community admin can look into it directly.";

    case 'charge_waiver_terminal':
      return "This request is already closed, so I can't act on it here — please reach out to a community admin directly about this charge.";

    case 'ready_awaiting_manual_advance':
      return "Everything looks complete on your end. This community has requests moved to review manually rather than automatically, so I've left it as submitted — a community admin will pick it up from here.";

    case 'ambiguous_occupant_count': {
      const conflict = params.occupantCountConflict;
      if (!conflict) {
        return "I have conflicting information on file — could you confirm the correct occupant count?";
      }
      return `You said ${conflict.incoming} occupant(s), but I have ${conflict.existing} on file for this request. I don't want to guess — which one is correct?`;
    }

    case 'request_cancelled':
      return "Done — your request has been cancelled. You're welcome to start a new one any time.";

    case 'cannot_cancel': {
      const status = params.request?.status.replace(/_/g, ' ') ?? 'its current status';
      return `This request is already ${status}, so it can't be cancelled directly — a community admin can help if you need to withdraw it at this stage.`;
    }

    case 'nothing_to_cancel':
      return "I don't see an active request to cancel.";

    case 'ambiguous':
    default:
      return "I can help with move-in and move-out requests. Tell me which one you'd like to start, or ask about a specific community policy.";
  }
}
