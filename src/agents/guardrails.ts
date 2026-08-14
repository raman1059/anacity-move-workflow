import type {
  ActorRole,
  AutonomyTier,
  CommunityConfiguration,
  MoveRequestStatus,
  PolicyTopic,
} from '../domain';
import type {
  ChargeCalculationResult,
  ValidateDocumentsResult,
  ValidateRequestResult,
} from '../lib/policy-engine';
import { canTransition, transitionTier } from './state-machine';
import type { GuardrailViolation } from './types';

// All 8 guardrail categories the orchestrator must enforce, as pure
// functions of a single input bag. Any guardrail can veto a proposed
// tier; the orchestrator never bypasses this pipeline. See plan.md §4.4.
export interface GuardrailCheckInput {
  proposedTier: AutonomyTier;
  actorRole: ActorRole;
  communityConfig?: CommunityConfiguration;
  validation?: ValidateRequestResult;
  documentValidation?: ValidateDocumentsResult;
  requestedTransition?: { from: MoveRequestStatus; to: MoveRequestStatus };
  policyLookup?: { topic: PolicyTopic; found: boolean; conflicting?: boolean };
  decisionConfidence?: number;
  chargeResult?: ChargeCalculationResult;
  isFinancialAction?: boolean;
  isExceptionRequest?: boolean;
  toolPermissionDenied?: boolean;
  exposesUnauthorizedPII?: boolean;
}

export type Guardrail = (input: GuardrailCheckInput) => GuardrailViolation | null;

const missingData: Guardrail = (input) => {
  const missing = [
    ...(input.validation?.missingFields ?? []),
    ...(input.documentValidation?.missingKeys ?? []),
  ];
  if (missing.length > 0 && input.proposedTier !== 'guide') {
    return {
      guardrail: 'missing_data',
      message: `Missing required information: ${missing.join(', ')}.`,
    };
  }
  return null;
};

const invalidStateTransition: Guardrail = (input) => {
  if (!input.requestedTransition) return null;
  const { from, to } = input.requestedTransition;
  if (transitionTier(from, to) === undefined) {
    return {
      guardrail: 'invalid_state_transition',
      message: `"${from}" -> "${to}" is not a valid transition.`,
    };
  }
  return null;
};

const unauthorizedAction: Guardrail = (input) => {
  if (input.toolPermissionDenied) {
    return {
      guardrail: 'unauthorized_action',
      message: 'The requested action is not permitted for this actor.',
    };
  }
  if (input.requestedTransition) {
    const { from, to } = input.requestedTransition;
    const exists = transitionTier(from, to) !== undefined;
    if (exists && !canTransition(from, to, input.actorRole)) {
      return {
        guardrail: 'unauthorized_action',
        message: `Role "${input.actorRole}" is not permitted to move this request from "${from}" to "${to}".`,
      };
    }
  }
  return null;
};

const policyAmbiguity: Guardrail = (input) => {
  if (input.policyLookup && !input.policyLookup.found) {
    return {
      guardrail: 'policy_ambiguity',
      message: `No policy is defined for topic "${input.policyLookup.topic}" in this community.`,
    };
  }
  if (input.policyLookup?.conflicting) {
    return {
      guardrail: 'policy_ambiguity',
      message: `Conflicting policy clauses found for topic "${input.policyLookup.topic}".`,
    };
  }
  return null;
};

const lowConfidence: Guardrail = (input) => {
  if (
    input.proposedTier === 'recommend' &&
    input.decisionConfidence !== undefined &&
    input.communityConfig &&
    input.decisionConfidence < input.communityConfig.autonomy.minRecommendationConfidence
  ) {
    return {
      guardrail: 'low_confidence',
      message: `Confidence ${input.decisionConfidence.toFixed(2)} is below this community's minimum of ${input.communityConfig.autonomy.minRecommendationConfidence}.`,
    };
  }
  return null;
};

const financialDecision: Guardrail = (input) => {
  if (!input.isFinancialAction) return null;

  if (input.proposedTier === 'decide' || input.proposedTier === 'act') {
    return {
      guardrail: 'financial_decision',
      message: 'Financial actions can never be auto-decided or auto-executed.',
    };
  }

  if (input.chargeResult && input.communityConfig) {
    const threshold = input.communityConfig.approval.financialEscalationThreshold;
    if (input.chargeResult.totalDeductions > threshold) {
      return {
        guardrail: 'financial_decision',
        message: `Deductions of ${input.chargeResult.totalDeductions} exceed the escalation threshold of ${threshold}.`,
      };
    }
  }

  return null;
};

const policyException: Guardrail = (input) => {
  if (input.isExceptionRequest) {
    return {
      guardrail: 'policy_exception',
      message: 'This request asks for an exception to policy. No tool exists to grant one.',
    };
  }
  return null;
};

const sensitiveInformation: Guardrail = (input) => {
  if (input.exposesUnauthorizedPII) {
    return {
      guardrail: 'sensitive_information',
      message: 'Response would expose information this actor is not authorized to see.',
    };
  }
  return null;
};

const GUARDRAILS: Guardrail[] = [
  missingData,
  invalidStateTransition,
  unauthorizedAction,
  policyAmbiguity,
  lowConfidence,
  financialDecision,
  policyException,
  sensitiveInformation,
];

export interface GuardrailResult {
  tier: AutonomyTier;
  violations: GuardrailViolation[];
}

// missing_data alone caps the tier at 'guide' (ask, don't act). Every
// other violated guardrail forces 'escalate' — the safe default whenever
// the orchestrator is at the edge of its authority or knowledge.
export function runGuardrails(input: GuardrailCheckInput): GuardrailResult {
  const violations = GUARDRAILS.map((guardrail) => guardrail(input)).filter(
    (violation): violation is GuardrailViolation => violation !== null
  );

  if (violations.length === 0) {
    return { tier: input.proposedTier, violations };
  }

  const onlyMissingData = violations.every((v) => v.guardrail === 'missing_data');
  return { tier: onlyMissingData ? 'guide' : 'escalate', violations };
}

export function requiresHumanReview(tier: AutonomyTier): boolean {
  return tier === 'recommend' || tier === 'escalate';
}
