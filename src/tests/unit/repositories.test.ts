import { beforeEach, describe, expect, it } from 'vitest';
import { GREENFIELD_HEIGHTS_ID, RIVERSIDE_VILLAS_ID, WILLOW_CREEK_ID } from '@/config';
import type { MoveRequestStatus } from '@/domain';
import { createMockRepositories, seedData } from '@/mocks';
import type { Repositories } from '@/repositories';

describe('mock repositories', () => {
  let repositories: Repositories;

  beforeEach(() => {
    // Fresh instance per test so the slot-booking test's mutation can't
    // leak into other tests.
    repositories = createMockRepositories(seedData);
  });

  it('seeds 7 residents/units in Greenfield Heights and 4 in Riverside Villas', () => {
    expect(repositories.residents.listByCommunity(GREENFIELD_HEIGHTS_ID)).toHaveLength(7);
    expect(repositories.residents.listByCommunity(RIVERSIDE_VILLAS_ID)).toHaveLength(4);
    expect(repositories.units.listByCommunity(GREENFIELD_HEIGHTS_ID)).toHaveLength(7);
    expect(repositories.units.listByCommunity(RIVERSIDE_VILLAS_ID)).toHaveLength(4);
  });

  it('exercises every MoveRequestStatus at least once across seed data', () => {
    const allRequests = [
      ...repositories.moveRequests.listByCommunity(GREENFIELD_HEIGHTS_ID),
      ...repositories.moveRequests.listByCommunity(RIVERSIDE_VILLAS_ID),
    ];
    expect(allRequests).toHaveLength(11);

    const statuses = new Set(allRequests.map((r) => r.status));
    const expected: MoveRequestStatus[] = [
      'draft',
      'submitted',
      'under_review',
      'information_required',
      'approved',
      'rejected',
      'scheduled',
      'completed',
      'cancelled',
      'escalated',
    ];
    for (const status of expected) {
      expect(statuses.has(status)).toBe(true);
    }
  });

  it('carries a projected (not admin_confirmed) charge with a RECOMMEND-tier action for a short-notice move-out', () => {
    const vikram = repositories.moveRequests.getById('request-gh-005');
    expect(vikram).toBeDefined();

    expect(
      repositories.documents.listByRequest(vikram!.id).some((d) => d.status === 'rejected')
    ).toBe(true);
    expect(
      repositories.checklistItems.listByRequest(vikram!.id).some((c) => c.status === 'rejected')
    ).toBe(true);

    const charge = repositories.charges.getByRequest(vikram!.id);
    expect(charge?.status).toBe('projected');
    expect(charge?.netRefundAmount).toBe(29600);

    const actions = repositories.agentActions.listByRequest(vikram!.id);
    expect(actions.some((a) => a.tool === 'recommendAction' && a.tier === 'recommend')).toBe(true);
  });

  it('escalates on ambiguous policy and retains previousStatus for resumption', () => {
    const meera = repositories.moveRequests.getById('request-rv-002');
    expect(meera?.status).toBe('escalated');
    expect(meera?.previousStatus).toBe('submitted');

    const actions = repositories.agentActions.listByRequest(meera!.id);
    expect(actions.some((a) => a.tool === 'escalateToAdmin' && a.tier === 'escalate')).toBe(true);
  });

  it('preserves an admin override with a reason in the audit trail', () => {
    const reviews = repositories.adminReviews.listByRequest('request-gh-007');
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.overrodeRecommendation).toBe(true);
    expect(reviews[0]?.reason).toBeTruthy();
  });

  it('books a move slot and rejects booking past capacity', () => {
    const before = repositories.moveSlots.getById('slot-gh-elevator-0820-pm');
    expect(before?.bookedCount).toBe(0);

    const booked = repositories.moveSlots.book('slot-gh-elevator-0820-pm', 'request-gh-002');
    expect(booked.bookedCount).toBe(1);
    expect(booked.bookedByRequestIds).toContain('request-gh-002');

    expect(() => repositories.moveSlots.book('slot-gh-elevator-0820-am', 'request-gh-999')).toThrow(
      /capacity/
    );
  });

  it('creates a conversation, appends messages in order, and finds it by actor even before any request is linked', () => {
    const created = repositories.conversations.create({
      id: 'conv-fixture-test',
      requestId: null,
      actorId: 'resident-noah-becker',
      actorRole: 'resident',
      messages: [],
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    });
    expect(created.messages).toEqual([]);

    const afterFirst = repositories.conversations.appendMessage('conv-fixture-test', {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      relatedActionIds: [],
      createdAt: '2026-08-14T00:00:01.000Z',
    });
    expect(afterFirst.messages).toHaveLength(1);

    const afterSecond = repositories.conversations.appendMessage('conv-fixture-test', {
      id: 'msg-2',
      role: 'agent',
      content: 'Hi there',
      relatedActionIds: [],
      createdAt: '2026-08-14T00:00:02.000Z',
    });
    expect(afterSecond.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);

    // listByActor is what lets a workspace re-hydrate a conversation
    // started before any request existed (requestId still null here).
    const found = repositories.conversations.listByActor('resident-noah-becker');
    expect(found.some((c) => c.id === 'conv-fixture-test')).toBe(true);
    expect(repositories.conversations.getById('conv-fixture-test')?.requestId).toBeNull();
  });

  it('seeds Willow Creek with residents and units but deliberately zero move requests (cold-start community)', () => {
    expect(repositories.residents.listByCommunity(WILLOW_CREEK_ID).length).toBeGreaterThan(0);
    expect(repositories.units.listByCommunity(WILLOW_CREEK_ID).length).toBeGreaterThan(0);
    expect(repositories.moveRequests.listByCommunity(WILLOW_CREEK_ID)).toEqual([]);
    expect(repositories.communities.getConfiguration(WILLOW_CREEK_ID)).toBeDefined();
  });
});
