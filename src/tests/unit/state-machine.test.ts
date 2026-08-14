import { describe, expect, it } from 'vitest';
import {
  canTransition,
  getAllowedTransitions,
  isReversibleTransition,
  isTerminalState,
  transitionTier,
} from '@/agents/state-machine';

describe('state machine', () => {
  it('allows a resident to submit their own draft', () => {
    expect(canTransition('draft', 'submitted', 'resident')).toBe(true);
  });

  it('the orchestrator (system) can auto-advance submitted -> under_review; a resident never can', () => {
    expect(canTransition('submitted', 'under_review', 'system')).toBe(true);
    expect(canTransition('submitted', 'under_review', 'resident')).toBe(false);
  });

  it('an admin can also move submitted -> under_review manually — for communities where the agent does not auto-advance', () => {
    expect(canTransition('submitted', 'under_review', 'admin')).toBe(true);
  });

  it('only an admin can approve or reject — never resident, never system', () => {
    expect(canTransition('under_review', 'approved', 'admin')).toBe(true);
    expect(canTransition('under_review', 'approved', 'resident')).toBe(false);
    expect(canTransition('under_review', 'approved', 'system')).toBe(false);
    expect(canTransition('under_review', 'rejected', 'admin')).toBe(true);
    expect(canTransition('under_review', 'rejected', 'system')).toBe(false);
  });

  it('rejects a structurally invalid transition regardless of role', () => {
    expect(canTransition('draft', 'completed', 'admin')).toBe(false);
    expect(transitionTier('draft', 'completed')).toBeUndefined();
  });

  it('approve/reject/complete are irreversible; draft/submitted/information_required transitions are reversible', () => {
    expect(isReversibleTransition('under_review', 'approved')).toBe(false);
    expect(isReversibleTransition('under_review', 'rejected')).toBe(false);
    expect(isReversibleTransition('scheduled', 'completed')).toBe(false);
    expect(isReversibleTransition('draft', 'submitted')).toBe(true);
    expect(isReversibleTransition('submitted', 'information_required')).toBe(true);
  });

  it('identifies terminal states', () => {
    expect(isTerminalState('rejected')).toBe(true);
    expect(isTerminalState('completed')).toBe(true);
    expect(isTerminalState('cancelled')).toBe(true);
    expect(isTerminalState('under_review')).toBe(false);
    expect(isTerminalState('escalated')).toBe(false);
  });

  it('lists only the transitions available to a given role from a given state', () => {
    const residentOptions = getAllowedTransitions('under_review', 'resident');
    expect(residentOptions).toEqual([]);

    const adminOptions = getAllowedTransitions('under_review', 'admin');
    expect(adminOptions.sort()).toEqual(
      ['approved', 'information_required', 'rejected', 'escalated'].sort()
    );
  });

  it('allows escalation directly from submitted, before a request ever reaches under_review', () => {
    expect(canTransition('submitted', 'escalated', 'system')).toBe(true);
    expect(canTransition('submitted', 'escalated', 'resident')).toBe(false);
  });

  it('escalated retains a path back to under_review or information_required, admin-only', () => {
    expect(canTransition('escalated', 'under_review', 'admin')).toBe(true);
    expect(canTransition('escalated', 'under_review', 'resident')).toBe(false);
  });

  it('lets an admin proactively escalate further from submitted, information_required, or under_review — not just the agent', () => {
    expect(canTransition('submitted', 'escalated', 'admin')).toBe(true);
    expect(canTransition('information_required', 'escalated', 'admin')).toBe(true);
    expect(canTransition('under_review', 'escalated', 'admin')).toBe(true);
    // The agent's own path is unchanged — still system-only otherwise.
    expect(canTransition('information_required', 'escalated', 'resident')).toBe(false);
  });
});
