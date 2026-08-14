import { describe, expect, it } from 'vitest';
import { getMoveStepper, MOVE_STATUS_COPY } from '@/features/shared/status-copy';
import type { MoveRequestStatus } from '@/domain';

describe('getMoveStepper', () => {
  it('shows all steps upcoming for a draft', () => {
    const steps = getMoveStepper('draft');
    expect(steps.every((s) => s.state === 'upcoming')).toBe(true);
  });

  it('marks the current step active and later steps upcoming for under_review', () => {
    const steps = getMoveStepper('under_review');
    expect(steps.at(0)?.state).toBe('complete');
    expect(steps.at(1)?.state).toBe('active');
    expect(steps.at(2)?.state).toBe('upcoming');
  });

  it('flags information_required as needing attention without breaking the stepper', () => {
    const steps = getMoveStepper('information_required');
    expect(steps.at(0)?.state).toBe('attention');
  });

  it('flags escalated as needing attention at the review step', () => {
    const steps = getMoveStepper('escalated');
    expect(steps.at(1)?.state).toBe('attention');
  });

  it('marks everything up to and including the final step complete once completed', () => {
    const steps = getMoveStepper('completed');
    expect(steps.every((s) => s.state === 'complete')).toBe(true);
  });

  it('shows a negative marker for rejected', () => {
    const steps = getMoveStepper('rejected');
    expect(steps.some((s) => s.state === 'negative')).toBe(true);
  });

  it('has copy defined for every possible status', () => {
    const statuses: MoveRequestStatus[] = [
      'draft',
      'submitted',
      'information_required',
      'under_review',
      'escalated',
      'approved',
      'rejected',
      'scheduled',
      'completed',
      'cancelled',
    ];
    for (const status of statuses) {
      expect(MOVE_STATUS_COPY[status].label.length).toBeGreaterThan(0);
    }
  });
});
