import { describe, expect, it } from 'vitest';
import { GREENFIELD_HEIGHTS_ID } from '@/config';
import type { AgentRecommendation, MoveRequest, RequestNote } from '@/domain';
import type { MockUploadResult } from '@/lib/mock-document-upload';
import { createMockRepositories, seedData } from '@/mocks';
import {
  ToolPermissionError,
  createDefaultToolRegistry,
  type AddAdminNoteInput,
  type AddRequestNoteInput,
  type CreateMoveRequestInput,
  type EscalateToAdminInput,
  type RecommendActionInput,
  type ToolContext,
  type UpdateMoveRequestInput,
  type UploadDocumentInput,
} from '@/tools';

function contextFor(actorId: string, actorRole: 'resident' | 'admin' | 'system'): ToolContext {
  return {
    repositories: createMockRepositories(seedData),
    actorId,
    actorRole,
    turnId: 'test-turn',
  };
}

// Shares one repository instance across calls within a test so mutations
// are visible to subsequent tool calls in the same scenario.
function scenario(actorId: string, actorRole: 'resident' | 'admin' | 'system') {
  const repositories = createMockRepositories(seedData);
  const context = (
    overrideRole?: 'resident' | 'admin' | 'system',
    overrideActorId?: string
  ): ToolContext => ({
    repositories,
    actorId: overrideActorId ?? actorId,
    actorRole: overrideRole ?? actorRole,
    turnId: 'test-turn',
  });
  return { repositories, context };
}

describe('createMoveRequest', () => {
  it('creates a draft request with a checklist seeded from community configuration', async () => {
    const registry = createDefaultToolRegistry();
    const request = await registry.execute<CreateMoveRequestInput, MoveRequest>(
      'createMoveRequest',
      {
        communityId: GREENFIELD_HEIGHTS_ID,
        residentId: 'resident-priya-menon',
        unitId: 'unit-gh-999',
        type: 'move_out',
        requestedDate: '2026-12-01',
        noticeGivenAt: '2026-11-01T00:00:00.000Z',
      },
      contextFor('resident-priya-menon', 'resident')
    );
    expect(request.status).toBe('draft');
    expect(request.checklistItemIds.length).toBeGreaterThan(0);
  });

  it('rejects a duplicate active request for the same resident/unit/type', async () => {
    const registry = createDefaultToolRegistry();
    // resident-priya-menon already has an active move_in for unit-gh-108 (request-gh-001)
    await expect(
      registry.execute<CreateMoveRequestInput, MoveRequest>(
        'createMoveRequest',
        {
          communityId: GREENFIELD_HEIGHTS_ID,
          residentId: 'resident-priya-menon',
          unitId: 'unit-gh-108',
          type: 'move_in',
          requestedDate: '2026-12-01',
        },
        contextFor('resident-priya-menon', 'resident')
      )
    ).rejects.toThrow(/already exists/);
  });

  it('blocks a resident from creating a request on behalf of someone else', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<CreateMoveRequestInput, MoveRequest>(
        'createMoveRequest',
        {
          communityId: GREENFIELD_HEIGHTS_ID,
          residentId: 'resident-rohan-gupta',
          unitId: 'unit-gh-999',
          type: 'move_out',
          requestedDate: '2026-12-01',
        },
        contextFor('resident-priya-menon', 'resident')
      )
    ).rejects.toThrow(/themselves/);
  });
});

describe('updateMoveRequest', () => {
  it('applies a legal, system-initiated transition', async () => {
    const registry = createDefaultToolRegistry();
    const { context } = scenario('system', 'system');
    const updated = await registry.execute<UpdateMoveRequestInput, MoveRequest>(
      'updateMoveRequest',
      { requestId: 'request-gh-006', patch: { status: 'under_review' } }, // submitted -> under_review
      context()
    );
    expect(updated.status).toBe('under_review');
  });

  it('rejects a structurally invalid transition', async () => {
    const registry = createDefaultToolRegistry();
    const { context } = scenario('system', 'system');
    await expect(
      registry.execute<UpdateMoveRequestInput, MoveRequest>(
        'updateMoveRequest',
        { requestId: 'request-gh-003', patch: { status: 'completed' } }, // draft -> completed doesn't exist
        context()
      )
    ).rejects.toThrow();
  });

  it('rejects a resident attempting an admin-only transition', async () => {
    const registry = createDefaultToolRegistry();
    const { context } = scenario('resident-vikram-shah', 'resident');
    await expect(
      registry.execute<UpdateMoveRequestInput, MoveRequest>(
        'updateMoveRequest',
        { requestId: 'request-gh-005', patch: { status: 'approved' } }, // under_review -> approved, admin-only
        context()
      )
    ).rejects.toThrow(/may not move/);
  });

  it('blocks a resident from updating a request that is not theirs', async () => {
    const registry = createDefaultToolRegistry();
    const { context } = scenario('resident-priya-menon', 'resident');
    await expect(
      registry.execute<UpdateMoveRequestInput, MoveRequest>(
        'updateMoveRequest',
        { requestId: 'request-gh-002', patch: { status: 'cancelled' } }, // belongs to resident-rohan-gupta
        context()
      )
    ).rejects.toThrow(/own requests/);
  });

  it('records previousStatus when transitioning into escalated', async () => {
    const registry = createDefaultToolRegistry();
    const { context } = scenario('system', 'system');
    const updated = await registry.execute<UpdateMoveRequestInput, MoveRequest>(
      'updateMoveRequest',
      { requestId: 'request-gh-006', patch: { status: 'escalated' } }, // submitted -> escalated
      context()
    );
    expect(updated.status).toBe('escalated');
    expect(updated.previousStatus).toBe('submitted');
  });
});

describe('uploadDocument', () => {
  it('attaches a document and verifies the matching checklist item, through the governed registry', async () => {
    const registry = createDefaultToolRegistry();
    const context = contextFor('resident-priya-menon', 'resident');

    const result = await registry.execute<UploadDocumentInput, MockUploadResult>(
      'uploadDocument',
      { requestId: 'request-gh-001', typeKey: 'society_noc' },
      context
    );
    expect(result.document.status).toBe('verified');
    expect(result.checklistItem.status).toBe('verified');
  });

  it('blocks a resident from uploading to a request that is not theirs', async () => {
    const registry = createDefaultToolRegistry();
    const context = contextFor('resident-rohan-gupta', 'resident');

    await expect(
      registry.execute<UploadDocumentInput, MockUploadResult>(
        'uploadDocument',
        { requestId: 'request-gh-001', typeKey: 'society_noc' }, // belongs to resident-priya-menon
        context
      )
    ).rejects.toThrow(/own requests/);
  });
});

describe('addRequestNote', () => {
  it('appends a note authored by the acting role', async () => {
    const registry = createDefaultToolRegistry();
    const note = await registry.execute<AddRequestNoteInput, RequestNote>(
      'addRequestNote',
      { requestId: 'request-gh-001', text: 'test note', category: 'test' },
      contextFor('system', 'system')
    );
    expect(note.authorType).toBe('agent');
    expect(note.text).toBe('test note');
  });
});

describe('recommendAction', () => {
  it('records a recommendation and a corresponding note, without changing status', async () => {
    const registry = createDefaultToolRegistry();
    const { repositories, context } = scenario('system', 'system');
    const before = repositories.moveRequests.getById('request-gh-002')!.status;

    const recommendation = await registry.execute<RecommendActionInput, AgentRecommendation>(
      'recommendAction',
      {
        requestId: 'request-gh-002',
        action: 'approve',
        rationale: 'All required documents verified.',
        confidence: 0.95,
        citedPolicyIds: ['policy-gh-move-in-documents'],
      },
      context()
    );

    expect(recommendation.action).toBe('approve');
    const after = repositories.moveRequests.getById('request-gh-002')!.status;
    expect(after).toBe(before); // recommending never mutates status

    const notes = repositories.requestNotes.listByRequest('request-gh-002');
    expect(notes.some((n) => n.category === 'recommendation')).toBe(true);
  });

  it('is only callable by the system, never a resident or admin directly', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<RecommendActionInput, AgentRecommendation>(
        'recommendAction',
        {
          requestId: 'request-gh-002',
          action: 'approve',
          rationale: 'x',
          confidence: 0.9,
          citedPolicyIds: [],
        },
        contextFor('admin-gh-facility-manager', 'admin')
      )
    ).rejects.toThrow();
  });
});

describe('escalateToAdmin', () => {
  it('transitions the request to escalated and records previousStatus', async () => {
    const registry = createDefaultToolRegistry();
    const { repositories, context } = scenario('system', 'system');

    const updated = await registry.execute<EscalateToAdminInput, MoveRequest>(
      'escalateToAdmin',
      { requestId: 'request-gh-005', reason: 'test escalation', urgency: 'medium' },
      context()
    );
    expect(updated.status).toBe('escalated');
    expect(updated.previousStatus).toBe('under_review');

    const notes = repositories.requestNotes.listByRequest('request-gh-005');
    expect(notes.some((n) => n.category === 'escalation')).toBe(true);
  });

  it('is idempotent — escalating an already-escalated request just adds a note', async () => {
    const registry = createDefaultToolRegistry();
    const { repositories, context } = scenario('system', 'system');

    await registry.execute<EscalateToAdminInput, MoveRequest>(
      'escalateToAdmin',
      { requestId: 'request-rv-002', reason: 'first', urgency: 'low' }, // already escalated in seed data
      context()
    );
    const updated = await registry.execute<EscalateToAdminInput, MoveRequest>(
      'escalateToAdmin',
      { requestId: 'request-rv-002', reason: 'second', urgency: 'low' },
      context()
    );
    expect(updated.status).toBe('escalated');

    const escalationNotes = repositories.requestNotes
      .listByRequest('request-rv-002')
      .filter((n) => n.category === 'escalation');
    expect(escalationNotes.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects a resident escalating a request that is not their own', async () => {
    const registry = createDefaultToolRegistry();
    // request-gh-005 belongs to resident-vikram-shah, not this actor.
    const context = contextFor('resident-priya-menon', 'resident');

    await expect(
      registry.execute<EscalateToAdminInput, MoveRequest>(
        'escalateToAdmin',
        { requestId: 'request-gh-005', reason: 'not mine', urgency: 'low' },
        context
      )
    ).rejects.toThrow(ToolPermissionError);
  });

  it('allows a resident to escalate their own request', async () => {
    const registry = createDefaultToolRegistry();
    const context = contextFor('resident-vikram-shah', 'resident');

    const updated = await registry.execute<EscalateToAdminInput, MoveRequest>(
      'escalateToAdmin',
      { requestId: 'request-gh-005', reason: 'my own dispute', urgency: 'low' },
      context
    );
    expect(updated.status).toBe('escalated');
  });
});

describe('addAdminNote — ADMIN_ONLY tool', () => {
  it('lets an admin append a note', async () => {
    const registry = createDefaultToolRegistry();
    const note = await registry.execute<AddAdminNoteInput, RequestNote>(
      'addAdminNote',
      { requestId: 'request-gh-007', text: 'Name mismatch verified by phone.' },
      contextFor('admin-gh-facility-manager', 'admin')
    );
    expect(note.authorType).toBe('admin');
    expect(note.category).toBe('admin_note');
  });

  it('cannot be invoked from a resident context', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<AddAdminNoteInput, RequestNote>(
        'addAdminNote',
        { requestId: 'request-gh-001', text: 'trying to self-annotate' },
        contextFor('resident-priya-menon', 'resident')
      )
    ).rejects.toBeInstanceOf(ToolPermissionError);
  });

  it('cannot be invoked by the orchestrator itself (system) — admin-only means the human admin only', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<AddAdminNoteInput, RequestNote>(
        'addAdminNote',
        { requestId: 'request-gh-001', text: 'system trying to annotate' },
        contextFor('system', 'system')
      )
    ).rejects.toBeInstanceOf(ToolPermissionError);
  });

  it('throws a clear error for a request that does not exist (missing entity)', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<AddAdminNoteInput, RequestNote>(
        'addAdminNote',
        { requestId: 'request-does-not-exist', text: 'note' },
        contextFor('admin-gh-facility-manager', 'admin')
      )
    ).rejects.toThrow(/not found/);
  });
});
