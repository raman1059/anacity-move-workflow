import { describe, expect, it } from 'vitest';
import { MockAgentProvider } from '@/agents';
import type { AgentContext } from '@/agents';

function baseContext(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    session: {
      communityId: 'community-greenfield-heights',
      actorId: 'resident-priya-menon',
      actorRole: 'resident',
      turnId: 'test-turn',
    },
    workflowState: { current: 'not_started', allowedTransitions: [] },
    checklist: [],
    documents: [],
    conversation: [],
    policies: [],
    notes: [],
    ...overrides,
  };
}

describe('MockAgentProvider', () => {
  const provider = new MockAgentProvider();

  it('is deterministic — the same message and context always classify the same way', async () => {
    const context = baseContext();
    const first = await provider.classifyIntent("I'd like to move in next month", context);
    const second = await provider.classifyIntent("I'd like to move in next month", context);
    expect(first).toEqual(second);
  });

  it('requires no network access or API key to run', () => {
    expect(provider.name).toBe('mock-deterministic');
  });

  it('classifies a move-in request and best-effort extracts fields', async () => {
    const result = await provider.classifyIntent(
      'I want to move in with 3 occupants on 2026-09-01',
      baseContext()
    );
    expect(result.intent).toBe('start_move_in');
    expect(result.extractedFields?.occupantCount).toBe(3);
    expect(result.extractedFields?.requestedDate).toBe('2026-09-01');
  });

  it('classifies a move-out request', async () => {
    const result = await provider.classifyIntent('I need to move out by 2026-08-20', baseContext());
    expect(result.intent).toBe('start_move_out');
  });

  it('classifies a cancellation request', async () => {
    const result = await provider.classifyIntent('please cancel my request', baseContext());
    expect(result.intent).toBe('cancel_request');
  });

  it('does not classify a negated mention of "cancel" as a cancellation request', async () => {
    const result = await provider.classifyIntent(
      "I don't want to cancel, I just have a question",
      baseContext()
    );
    expect(result.intent).not.toBe('cancel_request');
  });

  it('classifies a status check', async () => {
    const result = await provider.classifyIntent(
      'what is the status of my request?',
      baseContext()
    );
    expect(result.intent).toBe('request_status');
  });

  it('classifies an admin approval action only when the actor is an admin', async () => {
    const adminResult = await provider.classifyIntent(
      'approve this request',
      baseContext({ session: { ...baseContext().session, actorRole: 'admin' } })
    );
    expect(adminResult.intent).toBe('admin_review_action');
  });

  it('treats a bare number as provide_info only when a request is already in context', async () => {
    const withRequest = baseContext({
      request: {
        id: 'request-x',
        type: 'move_in',
        communityId: 'community-greenfield-heights',
        residentId: 'resident-priya-menon',
        unitId: 'unit-x',
        status: 'information_required',
        requestedDate: '2026-09-01',
        documentIds: [],
        checklistItemIds: [],
        createdBy: { actorId: 'resident-priya-menon', actorRole: 'resident' },
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    });
    const result = await provider.classifyIntent('2', withRequest);
    expect(result.intent).toBe('provide_info');
  });

  it('falls back to ambiguous for text it genuinely cannot classify', async () => {
    const result = await provider.classifyIntent('hello there', baseContext());
    expect(result.intent).toBe('ambiguous');
    expect(result.intentConfidence).toBeLessThan(0.5);
  });

  it('classifies a policy question', async () => {
    const result = await provider.classifyIntent(
      'what is the notice period policy?',
      baseContext()
    );
    expect(result.intent).toBe('ask_question');
    expect(result.extractedFields?.policyTopic).toBe('notice_period');
  });

  it('classifies a question ABOUT move-in as ask_question, not a command to start one', async () => {
    const result = await provider.classifyIntent(
      'What documents do I need for move-in?',
      baseContext()
    );
    expect(result.intent).toBe('ask_question');
    expect(result.extractedFields?.policyTopic).toBe('move_in_documents');
  });

  it('still classifies a plain move-in statement as start_move_in', async () => {
    const result = await provider.classifyIntent("I'd like to move in next month", baseContext());
    expect(result.intent).toBe('start_move_in');
  });

  it('infers a NOC policy topic from a question about the NOC', async () => {
    const result = await provider.classifyIntent('Do I need a NOC?', baseContext());
    expect(result.intent).toBe('ask_question');
    expect(result.extractedFields?.policyTopic).toBe('noc_requirement');
  });

  it('extracts a bare-number occupant count as provide_info', async () => {
    const withRequest = baseContext({
      request: {
        id: 'request-x',
        type: 'move_in',
        communityId: 'community-greenfield-heights',
        residentId: 'resident-priya-menon',
        unitId: 'unit-x',
        status: 'draft',
        requestedDate: '2026-09-01',
        documentIds: [],
        checklistItemIds: [],
        createdBy: { actorId: 'resident-priya-menon', actorRole: 'resident' },
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    });
    const result = await provider.classifyIntent('3', withRequest);
    expect(result.intent).toBe('provide_info');
    expect(result.extractedFields?.occupantCount).toBe(3);
  });

  it('classifies a charge waiver ask as dispute_charge, not a plain question', async () => {
    const result = await provider.classifyIntent('Can you waive this charge?', baseContext());
    expect(result.intent).toBe('dispute_charge');
  });

  it('classifies a dispute over a specific fee as dispute_charge', async () => {
    const result = await provider.classifyIntent(
      'I want to dispute the cleaning fee',
      baseContext()
    );
    expect(result.intent).toBe('dispute_charge');
  });

  it('does not classify a plain charges question as dispute_charge', async () => {
    const result = await provider.classifyIntent('Can you explain this charge?', baseContext());
    expect(result.intent).not.toBe('dispute_charge');
    expect(result.intent).toBe('ask_question');
    expect(result.extractedFields?.policyTopic).toBe('security_deposit');
  });

  it('does not classify a plain notice-period exception ask as dispute_charge', async () => {
    const result = await provider.classifyIntent(
      'family emergency, can you waive the notice requirement?',
      baseContext()
    );
    expect(result.intent).not.toBe('dispute_charge');
  });

  it('infers move_out_documents (not move_in_documents) for a document question on an active move-out', async () => {
    const withMoveOut = baseContext({
      request: {
        id: 'request-x',
        type: 'move_out',
        communityId: 'community-greenfield-heights',
        residentId: 'resident-priya-menon',
        unitId: 'unit-x',
        status: 'submitted',
        requestedDate: '2026-09-01',
        noticeGivenAt: '2026-08-01T00:00:00.000Z',
        documentIds: [],
        checklistItemIds: [],
        createdBy: { actorId: 'resident-priya-menon', actorRole: 'resident' },
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    });
    const result = await provider.classifyIntent(
      'What documents do I need for move-out?',
      withMoveOut
    );
    expect(result.intent).toBe('ask_question');
    expect(result.extractedFields?.policyTopic).toBe('move_out_documents');
  });
});
