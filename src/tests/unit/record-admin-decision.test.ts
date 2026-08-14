import { describe, expect, it } from 'vitest';
import {
  greenfieldHeightsConfiguration,
  riversideVillasConfiguration,
  willowCreekConfiguration,
} from '@/config';
import type { AdminReview, CommunityConfiguration, MoveRequest, RequestNote } from '@/domain';
import { createMockRepositories, seedData } from '@/mocks';
import { createDefaultToolRegistry, type ToolContext } from '@/tools';
import type { RecordAdminDecisionInput } from '@/tools/implementations/record-admin-decision.tool';

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

describe('recordAdminDecision', () => {
  it('approves a request whose decision matches the agent recommendation, no reason required', async () => {
    const registry = createDefaultToolRegistry();
    const { repositories, context } = scenario('admin-gh-facility-manager', 'admin');

    // request-gh-002 (under_review) has a real seeded recommendation: 'approve'.
    const review = await registry.execute<RecordAdminDecisionInput, AdminReview>(
      'recordAdminDecision',
      { requestId: 'request-gh-002', decision: 'approved', roleKey: 'facility_manager' },
      context()
    );

    expect(review.decision).toBe('approved');
    expect(review.overrodeRecommendation).toBe(false);
    expect(review.agentRecommendation?.action).toBe('approve');
    expect(review.adminId).toBe('admin-gh-facility-manager');

    const updated = repositories.moveRequests.getById('request-gh-002') as MoveRequest;
    expect(updated.status).toBe('approved');

    const notes = repositories.requestNotes.listByRequest('request-gh-002');
    expect(notes.some((n) => n.category === 'approval' && n.authorType === 'admin')).toBe(true);
  });

  it('requires a reason when the decision overrides the agent recommendation, and records it when given', async () => {
    const registry = createDefaultToolRegistry();
    const { repositories, context } = scenario('admin-gh-treasurer', 'admin');

    // request-gh-005 (under_review) has a real seeded recommendation: 'approve_with_charges'.
    await expect(
      registry.execute<RecordAdminDecisionInput, AdminReview>(
        'recordAdminDecision',
        { requestId: 'request-gh-005', decision: 'rejected', roleKey: 'treasurer' },
        context()
      )
    ).rejects.toThrow(/reason is required/);

    const review = await registry.execute<RecordAdminDecisionInput, AdminReview>(
      'recordAdminDecision',
      {
        requestId: 'request-gh-005',
        decision: 'rejected',
        reason: 'Dues remain unresolved after two follow-ups.',
        roleKey: 'treasurer',
      },
      context()
    );

    expect(review.overrodeRecommendation).toBe(true);
    expect(review.reason).toContain('Dues remain unresolved');

    const notes = repositories.requestNotes.listByRequest('request-gh-005') as RequestNote[];
    expect(notes.some((n) => n.category === 'override')).toBe(true);

    const updated = repositories.moveRequests.getById('request-gh-005') as MoveRequest;
    expect(updated.status).toBe('rejected');
  });

  it('requires a reason when rejecting even without an existing recommendation', async () => {
    const registry = createDefaultToolRegistry();
    const { context } = scenario('admin-rv-community-manager', 'admin');

    // request-rv-002 is escalated with no recommendation on file.
    await expect(
      registry.execute<RecordAdminDecisionInput, AdminReview>(
        'recordAdminDecision',
        { requestId: 'request-rv-002', decision: 'rejected', roleKey: 'community_manager' },
        context()
      )
    ).rejects.toThrow(/reason is required/);
  });

  it('requests more info without requiring a reason when there is no recommendation to override', async () => {
    const registry = createDefaultToolRegistry();
    const { repositories, context } = scenario('admin-rv-community-manager', 'admin');

    const review = await registry.execute<RecordAdminDecisionInput, AdminReview>(
      'recordAdminDecision',
      { requestId: 'request-rv-002', decision: 'requested_info', roleKey: 'community_manager' },
      context()
    );

    expect(review.overrodeRecommendation).toBe(false);
    expect(review.agentRecommendation).toBeUndefined();

    const updated = repositories.moveRequests.getById('request-rv-002') as MoveRequest;
    expect(updated.status).toBe('information_required');
  });

  it('escalates further and records previousStatus', async () => {
    const registry = createDefaultToolRegistry();
    const { repositories, context } = scenario('admin-gh-facility-manager', 'admin');

    const review = await registry.execute<RecordAdminDecisionInput, AdminReview>(
      'recordAdminDecision',
      { requestId: 'request-gh-006', decision: 'escalated_further', roleKey: 'facility_manager' }, // submitted
      context()
    );

    expect(review.decision).toBe('escalated_further');
    const updated = repositories.moveRequests.getById('request-gh-006') as MoveRequest;
    expect(updated.status).toBe('escalated');
    expect(updated.previousStatus).toBe('submitted');
  });

  it('rejects an illegal transition (e.g. deciding on a draft request)', async () => {
    const registry = createDefaultToolRegistry();
    const { context } = scenario('admin-gh-facility-manager', 'admin');

    await expect(
      registry.execute<RecordAdminDecisionInput, AdminReview>(
        'recordAdminDecision',
        { requestId: 'request-gh-003', decision: 'approved', roleKey: 'facility_manager' }, // draft, no such transition
        context()
      )
    ).rejects.toThrow();
  });

  it('is ADMIN_ONLY — never invocable by a resident or the agent itself', async () => {
    const registry = createDefaultToolRegistry();
    const { context } = scenario('resident-rohan-gupta', 'resident');

    await expect(
      registry.execute<RecordAdminDecisionInput, AdminReview>(
        'recordAdminDecision',
        { requestId: 'request-gh-002', decision: 'approved', roleKey: 'facility_manager' },
        context()
      )
    ).rejects.toThrow();

    await expect(
      registry.execute<RecordAdminDecisionInput, AdminReview>(
        'recordAdminDecision',
        { requestId: 'request-gh-002', decision: 'approved', roleKey: 'facility_manager' },
        context('system', 'system')
      )
    ).rejects.toThrow();
  });

  describe('role-based permissions — config-driven, not hardcoded', () => {
    it('blocks an approval the role is not authorized to make for this request type', async () => {
      const registry = createDefaultToolRegistry();
      const { context } = scenario('admin-gh-treasurer', 'admin');

      // Greenfield Heights' Treasurer role has canApproveMoveIn: false;
      // request-gh-002 is a move_in request.
      await expect(
        registry.execute<RecordAdminDecisionInput, AdminReview>(
          'recordAdminDecision',
          { requestId: 'request-gh-002', decision: 'approved', roleKey: 'treasurer' },
          context()
        )
      ).rejects.toThrow(/not authorized to approve move-in/);
    });

    it('allows the same approval when the role key is authorized for this request type', async () => {
      const registry = createDefaultToolRegistry();
      const { context } = scenario('admin-gh-facility-manager', 'admin');

      const review = await registry.execute<RecordAdminDecisionInput, AdminReview>(
        'recordAdminDecision',
        { requestId: 'request-gh-002', decision: 'approved', roleKey: 'facility_manager' },
        context()
      );
      expect(review.decision).toBe('approved');
    });

    it('blocks an override the role is not authorized to make', async () => {
      // A role with every other permission except canOverrideAgent —
      // none of the seeded roles happen to lack it, so this is
      // constructed the same way orchestrator.test.ts's "downgrades a
      // recommendation" test builds a one-off community configuration.
      const restrictedConfig: CommunityConfiguration = {
        ...greenfieldHeightsConfiguration,
        adminPermissions: {
          roles: [
            {
              key: 'junior_reviewer',
              label: 'Junior Reviewer',
              canApproveMoveIn: true,
              canApproveMoveOut: true,
              canApproveFinancialException: false,
              canOverrideAgent: false,
            },
          ],
        },
      };
      const repositories = createMockRepositories({
        ...seedData,
        communityConfigurations: [
          restrictedConfig,
          riversideVillasConfiguration,
          willowCreekConfiguration,
        ],
      });
      const registry = createDefaultToolRegistry();
      const context: ToolContext = {
        repositories,
        actorId: 'admin-gh-junior-reviewer',
        actorRole: 'admin',
        turnId: 'test-turn',
      };

      // request-gh-005 has a real seeded recommendation of
      // 'approve_with_charges'; rejecting it is an override.
      await expect(
        registry.execute<RecordAdminDecisionInput, AdminReview>(
          'recordAdminDecision',
          {
            requestId: 'request-gh-005',
            decision: 'rejected',
            reason: 'Disagree with the recommendation.',
            roleKey: 'junior_reviewer',
          },
          context
        )
      ).rejects.toThrow(/not authorized to override/);
    });

    it('fails closed when roleKey does not resolve to any role defined for the request\'s own community', async () => {
      const registry = createDefaultToolRegistry();
      const { context } = scenario('admin-rv-community-manager', 'admin');

      // 'community_manager' is a real role key — just not one Greenfield
      // Heights defines (only Riverside Villas does). Previously this
      // silently skipped every permission check instead of denying; see
      // plan.md's Security & Agent-Safety Review, gap 5.
      await expect(
        registry.execute<RecordAdminDecisionInput, AdminReview>(
          'recordAdminDecision',
          { requestId: 'request-gh-002', decision: 'approved', roleKey: 'community_manager' },
          context()
        )
      ).rejects.toThrow(/no authority defined/);
    });

    it('idempotency: a repeated identical decision returns the existing review instead of duplicating it', async () => {
      const registry = createDefaultToolRegistry();
      const { repositories, context } = scenario('admin-gh-facility-manager', 'admin');

      // request-gh-006 (submitted, no recommendation, no prior review) —
      // a clean slate, unlike request-gh-002 which already carries a
      // pre-seeded review from mocks/data/adminReviews.ts.
      expect(repositories.adminReviews.listByRequest('request-gh-006')).toHaveLength(0);

      const first = await registry.execute<RecordAdminDecisionInput, AdminReview>(
        'recordAdminDecision',
        { requestId: 'request-gh-006', decision: 'escalated_further', roleKey: 'facility_manager' },
        context()
      );
      const second = await registry.execute<RecordAdminDecisionInput, AdminReview>(
        'recordAdminDecision',
        { requestId: 'request-gh-006', decision: 'escalated_further', roleKey: 'facility_manager' },
        context()
      );

      expect(second.id).toBe(first.id);
      expect(repositories.adminReviews.listByRequest('request-gh-006')).toHaveLength(1);
      expect(
        repositories.requestNotes
          .listByRequest('request-gh-006')
          .filter((n) => n.category === 'escalation')
      ).toHaveLength(1);
    });
  });
});
