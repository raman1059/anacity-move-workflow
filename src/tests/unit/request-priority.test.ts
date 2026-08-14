import { describe, expect, it } from 'vitest';
import type { AgentAction, CommunityConfiguration, MoveInRequest } from '@/domain';
import { greenfieldHeightsConfiguration } from '@/config';
import { computeRequestPriority } from '@/lib/request-priority';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function configWithIdleThreshold(days: number): CommunityConfiguration {
  return {
    ...greenfieldHeightsConfiguration,
    autonomy: { ...greenfieldHeightsConfiguration.autonomy, idleDaysBeforeEscalate: days },
  };
}

function baseRequest(overrides: Partial<MoveInRequest> = {}): MoveInRequest {
  return {
    id: 'request-x',
    type: 'move_in',
    communityId: 'community-greenfield-heights',
    residentId: 'resident-x',
    unitId: 'unit-x',
    status: 'draft',
    requestedDate: '2026-09-01',
    documentIds: [],
    checklistItemIds: [],
    createdBy: { actorId: 'resident-x', actorRole: 'resident' },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function escalateAction(urgency?: 'low' | 'medium' | 'high'): AgentAction {
  return {
    id: 'act-1',
    requestId: 'request-x',
    turnId: 'turn-1',
    tool: 'escalateToAdmin',
    tier: 'escalate',
    actorRole: 'system',
    input: urgency ? { requestId: 'request-x', reason: 'test', urgency } : { requestId: 'request-x' },
    output: { escalated: true },
    success: true,
    createdAt: '2026-08-02T00:00:00.000Z',
  };
}

describe('computeRequestPriority', () => {
  it('uses the real recorded urgency when escalated', () => {
    expect(computeRequestPriority(baseRequest({ status: 'escalated' }), [escalateAction('low')])).toBe(
      'low'
    );
    expect(
      computeRequestPriority(baseRequest({ status: 'escalated' }), [escalateAction('medium')])
    ).toBe('medium');
    expect(
      computeRequestPriority(baseRequest({ status: 'escalated' }), [escalateAction('high')])
    ).toBe('high');
  });

  it('defaults to high when escalated but no urgency was recorded', () => {
    expect(
      computeRequestPriority(baseRequest({ status: 'escalated' }), [escalateAction(undefined)])
    ).toBe('high');
  });

  it('defaults to high when escalated with no escalation action at all', () => {
    expect(computeRequestPriority(baseRequest({ status: 'escalated' }), [])).toBe('high');
  });

  it('picks the most recent escalation when several exist', () => {
    const older = { ...escalateAction('low'), id: 'act-old', createdAt: '2026-08-01T00:00:00.000Z' };
    const newer = {
      ...escalateAction('high'),
      id: 'act-new',
      createdAt: '2026-08-03T00:00:00.000Z',
    };
    expect(computeRequestPriority(baseRequest({ status: 'escalated' }), [older, newer])).toBe(
      'high'
    );
  });

  it('ranks information_required and under_review as medium', () => {
    expect(computeRequestPriority(baseRequest({ status: 'information_required' }), [])).toBe(
      'medium'
    );
    expect(computeRequestPriority(baseRequest({ status: 'under_review' }), [])).toBe('medium');
  });

  it('ranks everything else as low', () => {
    for (const status of [
      'draft',
      'submitted',
      'approved',
      'scheduled',
      'completed',
      'cancelled',
      'rejected',
    ] as const) {
      expect(computeRequestPriority(baseRequest({ status }), [])).toBe('low');
    }
  });

  describe('idle-days elevation — config-driven, not hardcoded', () => {
    it('leaves a fresh submitted request at low', () => {
      const request = baseRequest({ status: 'submitted', updatedAt: daysAgo(1) });
      expect(computeRequestPriority(request, [], configWithIdleThreshold(5))).toBe('low');
    });

    it('elevates a submitted request past the community idle threshold to medium', () => {
      const request = baseRequest({ status: 'submitted', updatedAt: daysAgo(6) });
      expect(computeRequestPriority(request, [], configWithIdleThreshold(5))).toBe('medium');
    });

    it('elevates a stale under_review/information_required request from medium to high', () => {
      const stale = daysAgo(10);
      expect(
        computeRequestPriority(
          baseRequest({ status: 'under_review', updatedAt: stale }),
          [],
          configWithIdleThreshold(5)
        )
      ).toBe('high');
      expect(
        computeRequestPriority(
          baseRequest({ status: 'information_required', updatedAt: stale }),
          [],
          configWithIdleThreshold(5)
        )
      ).toBe('high');
    });

    it('the identical age and status ranks differently purely from the community idle threshold', () => {
      const request = baseRequest({ status: 'submitted', updatedAt: daysAgo(3) });
      // A strict community (threshold 2 days) already considers this stale...
      expect(computeRequestPriority(request, [], configWithIdleThreshold(2))).toBe('medium');
      // ...while a lenient community (threshold 10 days) does not — no
      // branching on which community it is, just a different config in.
      expect(computeRequestPriority(request, [], configWithIdleThreshold(10))).toBe('low');
    });

    it('has no effect when no communityConfig is supplied (backward compatible)', () => {
      const request = baseRequest({ status: 'submitted', updatedAt: daysAgo(100) });
      expect(computeRequestPriority(request, [])).toBe('low');
    });
  });
});
