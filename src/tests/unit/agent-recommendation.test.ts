import { describe, expect, it } from 'vitest';
import type { AgentAction } from '@/domain';
import { findLatestRecommendation } from '@/lib/agent-recommendation';

function fullShapeAction(overrides: Partial<AgentAction> = {}): AgentAction {
  return {
    id: 'act-1',
    requestId: 'request-x',
    turnId: 'turn-1',
    tool: 'recommendAction',
    tier: 'recommend',
    actorRole: 'system',
    input: { requestId: 'request-x', action: 'approve', rationale: 'r', confidence: 0.9 },
    output: {
      action: 'approve',
      rationale: 'All checks passed.',
      confidence: 0.92,
      citedPolicyIds: ['policy-1'],
      createdAt: '2026-08-05T00:00:00.000Z',
    },
    success: true,
    createdAt: '2026-08-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('findLatestRecommendation', () => {
  it('parses a full runtime-shaped output correctly', () => {
    const result = findLatestRecommendation([fullShapeAction()]);
    expect(result).toEqual({
      action: 'approve',
      rationale: 'All checks passed.',
      confidence: 0.92,
      citedPolicyIds: ['policy-1'],
      createdAt: '2026-08-05T00:00:00.000Z',
    });
  });

  it('parses the hand-seeded narrative shape (action/createdAt missing from output)', () => {
    const seedShaped: AgentAction = {
      id: 'act-gh-005-07',
      requestId: 'request-gh-005',
      turnId: 'turn-gh-005-1',
      tool: 'recommendAction',
      tier: 'recommend',
      actorRole: 'system',
      input: { requestId: 'request-gh-005', action: 'approve_with_charges' },
      output: {
        rationale: 'Valid but short-notice penalty and outstanding dues apply per policy',
        confidence: 0.7,
        citedPolicyIds: ['policy-gh-notice-period', 'policy-gh-dues'],
      },
      success: true,
      createdAt: '2026-08-13T09:06:00.000Z',
    };

    const result = findLatestRecommendation([seedShaped]);
    expect(result?.action).toBe('approve_with_charges');
    expect(result?.rationale).toContain('short-notice penalty');
    expect(result?.createdAt).toBe('2026-08-13T09:06:00.000Z');
  });

  it('returns undefined when there is no recommendation', () => {
    expect(findLatestRecommendation([])).toBeUndefined();
  });

  it('ignores a failed recommendAction call', () => {
    const failed = fullShapeAction({ success: false, output: {} });
    expect(findLatestRecommendation([failed])).toBeUndefined();
  });

  it('picks the most recent recommendation when several exist', () => {
    const older = fullShapeAction({
      id: 'act-old',
      createdAt: '2026-08-01T00:00:00.000Z',
      output: {
        action: 'reject',
        rationale: 'old',
        confidence: 0.5,
        citedPolicyIds: [],
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    });
    const newer = fullShapeAction({
      id: 'act-new',
      createdAt: '2026-08-05T00:00:00.000Z',
    });

    const result = findLatestRecommendation([older, newer]);
    expect(result?.action).toBe('approve');
  });
});
