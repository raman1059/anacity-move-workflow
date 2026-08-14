import { describe, expect, it } from 'vitest';
import { greenfieldHeightsConfiguration } from '@/config';
import { requiresHumanReview, runGuardrails, type GuardrailCheckInput } from '@/agents/guardrails';

const baseInput: GuardrailCheckInput = {
  proposedTier: 'act',
  actorRole: 'system',
  communityConfig: greenfieldHeightsConfiguration,
};

describe('runGuardrails', () => {
  it('passes through with no violations when everything is clean', () => {
    const result = runGuardrails(baseInput);
    expect(result.tier).toBe('act');
    expect(result.violations).toEqual([]);
  });

  it('missing_data caps the tier at guide, never escalate', () => {
    const result = runGuardrails({
      ...baseInput,
      proposedTier: 'decide',
      validation: {
        valid: false,
        missingFields: ['occupantCount'],
        violatedPolicies: [],
        warnings: [],
      },
    });
    expect(result.tier).toBe('guide');
    expect(result.violations.map((v) => v.guardrail)).toEqual(['missing_data']);
  });

  it('missing_data does not fire when the proposed tier is already guide', () => {
    const result = runGuardrails({
      ...baseInput,
      proposedTier: 'guide',
      validation: {
        valid: false,
        missingFields: ['occupantCount'],
        violatedPolicies: [],
        warnings: [],
      },
    });
    expect(result.tier).toBe('guide');
    expect(result.violations).toEqual([]);
  });

  it('invalid_state_transition forces escalate for a structurally impossible transition', () => {
    const result = runGuardrails({
      ...baseInput,
      requestedTransition: { from: 'draft', to: 'completed' },
    });
    expect(result.tier).toBe('escalate');
    expect(result.violations.map((v) => v.guardrail)).toContain('invalid_state_transition');
  });

  it('unauthorized_action forces escalate when a resident attempts an admin-only transition', () => {
    const result = runGuardrails({
      ...baseInput,
      actorRole: 'resident',
      requestedTransition: { from: 'under_review', to: 'approved' },
    });
    expect(result.tier).toBe('escalate');
    expect(result.violations.map((v) => v.guardrail)).toContain('unauthorized_action');
  });

  it('unauthorized_action forces escalate on a caught tool permission denial', () => {
    const result = runGuardrails({ ...baseInput, toolPermissionDenied: true });
    expect(result.tier).toBe('escalate');
    expect(result.violations.map((v) => v.guardrail)).toContain('unauthorized_action');
  });

  it('policy_ambiguity forces escalate when a policy topic lookup finds nothing', () => {
    const result = runGuardrails({
      ...baseInput,
      policyLookup: { topic: 'notice_period_exception', found: false },
    });
    expect(result.tier).toBe('escalate');
    expect(result.violations.map((v) => v.guardrail)).toContain('policy_ambiguity');
  });

  it('low_confidence downgrades a recommend below the community threshold to escalate', () => {
    const result = runGuardrails({
      ...baseInput,
      proposedTier: 'recommend',
      decisionConfidence: 0.3, // below GH's 0.6 minimum
    });
    expect(result.tier).toBe('escalate');
    expect(result.violations.map((v) => v.guardrail)).toContain('low_confidence');
  });

  it('low_confidence does not fire when confidence meets the threshold', () => {
    const result = runGuardrails({
      ...baseInput,
      proposedTier: 'recommend',
      decisionConfidence: 0.95,
    });
    expect(result.tier).toBe('recommend');
    expect(result.violations).toEqual([]);
  });

  it('financial_decision never allows decide/act tiers for a financial action', () => {
    const result = runGuardrails({ ...baseInput, proposedTier: 'act', isFinancialAction: true });
    expect(result.tier).toBe('escalate');
    expect(result.violations.map((v) => v.guardrail)).toContain('financial_decision');
  });

  it('financial_decision escalates when deductions exceed the community threshold', () => {
    const result = runGuardrails({
      ...baseInput,
      proposedTier: 'recommend',
      isFinancialAction: true,
      chargeResult: {
        currency: 'INR',
        securityDepositAmount: 50000,
        lineItems: [],
        totalDeductions: 15000, // > GH's 10000 threshold
        netRefundAmount: 35000,
      },
    });
    expect(result.tier).toBe('escalate');
    expect(result.violations.map((v) => v.guardrail)).toContain('financial_decision');
  });

  it('financial_decision allows recommend when deductions are within threshold', () => {
    const result = runGuardrails({
      ...baseInput,
      proposedTier: 'recommend',
      isFinancialAction: true,
      chargeResult: {
        currency: 'INR',
        securityDepositAmount: 50000,
        lineItems: [],
        totalDeductions: 2000,
        netRefundAmount: 48000,
      },
    });
    expect(result.tier).toBe('recommend');
    expect(result.violations).toEqual([]);
  });

  it('policy_exception forces escalate for a waiver/exception request', () => {
    const result = runGuardrails({ ...baseInput, isExceptionRequest: true });
    expect(result.tier).toBe('escalate');
    expect(result.violations.map((v) => v.guardrail)).toContain('policy_exception');
  });

  it('sensitive_information forces escalate rather than leak unauthorized data', () => {
    const result = runGuardrails({ ...baseInput, exposesUnauthorizedPII: true });
    expect(result.tier).toBe('escalate');
    expect(result.violations.map((v) => v.guardrail)).toContain('sensitive_information');
  });
});

describe('requiresHumanReview', () => {
  it('is true only for recommend and escalate', () => {
    expect(requiresHumanReview('guide')).toBe(false);
    expect(requiresHumanReview('decide')).toBe(false);
    expect(requiresHumanReview('act')).toBe(false);
    expect(requiresHumanReview('recommend')).toBe(true);
    expect(requiresHumanReview('escalate')).toBe(true);
  });
});
