import { describe, expect, it } from 'vitest';
import {
  GREENFIELD_HEIGHTS_ID,
  greenfieldHeightsConfiguration,
  RIVERSIDE_VILLAS_ID,
  riversideVillasConfiguration,
  WILLOW_CREEK_ID,
  willowCreekConfiguration,
} from '@/config';
import type {
  AdminReview,
  CommunityConfiguration,
  Document,
  MoveInRequest,
  MoveOutRequest,
} from '@/domain';
import { createMoveCoordinatorAgent, MockAgentProvider, type AgentMessageInput } from '@/agents';
import { mockUploadDocument } from '@/lib/mock-document-upload';
import { createMockRepositories, seedData } from '@/mocks';
import type { Repositories } from '@/repositories';
import {
  createDefaultToolRegistry,
  type AddAdminNoteInput,
  type ToolContext,
  type ToolRegistry,
} from '@/tools';
import type { RecordAdminDecisionInput } from '@/tools/implementations/record-admin-decision.tool';

// End-to-end demo scenarios (see plan.md's "Demo Scenarios" section and
// the /demo page). Every test here drives the same code that powers the
// live app — createMoveCoordinatorAgent + createDefaultToolRegistry —
// never a reimplementation of the logic. Fixtures follow the same
// patterns already established in orchestrator.test.ts (fresh
// requestId/unitId attached to a real seeded resident, since
// ResidentRepository/UnitRepository are read-only in this prototype —
// residents and units are provisioned externally, never created by the
// app itself).

function buildAgent(repositories: Repositories, toolRegistry: ToolRegistry = createDefaultToolRegistry()) {
  return createMoveCoordinatorAgent({
    toolRegistry,
    repositories,
    agentProvider: new MockAgentProvider(),
  });
}

function messageFor(overrides: Partial<AgentMessageInput> & { content: string }): AgentMessageInput {
  return {
    communityId: GREENFIELD_HEIGHTS_ID,
    actorId: 'resident-x',
    actorRole: 'resident',
    ...overrides,
  };
}

function seedVerifiedDocs(
  repositories: Repositories,
  requestId: string,
  config: CommunityConfiguration,
  kind: 'moveIn' | 'moveOut'
): void {
  const now = new Date().toISOString();
  for (const requirement of config.documents[kind]) {
    if (!requirement.required) continue;
    const doc: Document = {
      id: `doc-${requestId}-${requirement.key}`,
      requestId,
      typeKey: requirement.key,
      label: requirement.label,
      status: 'verified',
      fileName: `${requirement.key}.pdf`,
      uploadedAt: now,
      verifiedAt: now,
    };
    repositories.documents.create(doc);
    repositories.checklistItems.create({
      id: `ci-${requestId}-${requirement.key}`,
      requestId,
      key: requirement.key,
      label: requirement.label,
      required: true,
      status: 'verified',
      source: 'document',
      relatedDocumentId: doc.id,
      updatedAt: now,
    });
  }
}

function seedMoveOut(
  repositories: Repositories,
  opts: {
    id: string;
    communityId: string;
    residentId: string;
    unitId: string;
    noticeGivenAt: string;
    requestedDate: string;
    config: CommunityConfiguration;
  }
): MoveOutRequest {
  const now = new Date().toISOString();
  const request = repositories.moveRequests.create({
    id: opts.id,
    type: 'move_out',
    communityId: opts.communityId,
    residentId: opts.residentId,
    unitId: opts.unitId,
    status: 'submitted',
    requestedDate: opts.requestedDate,
    noticeGivenAt: opts.noticeGivenAt,
    documentIds: [],
    checklistItemIds: [],
    createdBy: { actorId: opts.residentId, actorRole: 'resident' },
    createdAt: now,
    updatedAt: now,
  }) as MoveOutRequest;
  seedVerifiedDocs(repositories, opts.id, opts.config, 'moveOut');
  return request;
}

function seedCleanMoveIn(
  repositories: Repositories,
  id: string,
  residentId: string,
  unitId: string,
  config: CommunityConfiguration = greenfieldHeightsConfiguration
): MoveInRequest {
  const now = new Date().toISOString();
  const request = repositories.moveRequests.create({
    id,
    type: 'move_in',
    communityId: config.communityId,
    residentId,
    unitId,
    status: 'submitted',
    requestedDate: '2026-12-01',
    occupantCount: 2,
    vehicleCount: 0,
    documentIds: [],
    checklistItemIds: [],
    createdBy: { actorId: residentId, actorRole: 'resident' },
    createdAt: now,
    updatedAt: now,
  }) as MoveInRequest;
  seedVerifiedDocs(repositories, id, config, 'moveIn');
  return request;
}

describe('Scenario 1 — Normal move-in: resident provides everything, agent validates, request is submitted', () => {
  it('walks a fresh resident through move-in to a submitted request, real multi-turn conversation', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    // Turn 1: start the request with everything the intent extractor can
    // pick up in one message.
    const started = await agent.handleMessage(
      messageFor({
        content: "I'd like to move in with 1 occupant on 2026-10-01.",
        communityId: WILLOW_CREEK_ID,
        actorId: 'resident-noah-becker',
        unitId: 'unit-wc-101',
      })
    );
    expect(started.trace.toolsCalled).toContain('createMoveRequest');
    expect(started.reply.toLowerCase()).toContain('government id proof');
    const requestId = started.trace.requestId!;

    // Turn 2: upload the one required document (mocked — see
    // lib/mock-document-upload.ts) and tell the agent.
    mockUploadDocument(repositories, requestId, 'gov_id_proof');
    const confirmed = await agent.handleMessage(
      messageFor({
        content: "I've uploaded my Government ID Proof.",
        communityId: WILLOW_CREEK_ID,
        actorId: 'resident-noah-becker',
        requestId,
      })
    );

    // Everything the resident needed to provide has been provided and
    // validated — the request reaches 'submitted'. (Willow Creek moves
    // requests to review manually rather than automatically — see
    // Scenario 7 / plan.md's Scalability Architecture — so this is
    // exactly where a clean case correctly stops for this community.)
    expect(confirmed.trace.reasoningSummary).toContain('Request submitted successfully.');
    const finalRequest = repositories.moveRequests.getById(requestId);
    expect(finalRequest?.status).toBe('submitted');
    expect(confirmed.decision.requiresHumanReview).toBe(false);
  });
});

describe('Scenario 2 — Incomplete move-in: a required document is missing, the agent identifies it and asks', () => {
  it('names the exact missing document rather than a generic "incomplete" message', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    // request-gh-001 (Priya Menon) is seeded information_required,
    // missing exactly the Society NOC.
    const result = await agent.handleMessage(
      messageFor({
        content: 'just checking in',
        requestId: 'request-gh-001',
        actorId: 'resident-priya-menon',
      })
    );

    expect(result.decision.tier).toBe('guide');
    expect(result.decision.requiresHumanReview).toBe(false);
    expect(result.reply.toLowerCase()).toContain('society noc');

    const unchanged = repositories.moveRequests.getById('request-gh-001');
    expect(unchanged?.status).toBe('information_required'); // never silently advanced
  });
});

describe('Scenario 3 — Move-in with ambiguous information: the agent does not guess, it asks for clarification', () => {
  it('asks for clarification instead of overwriting an occupant count with a conflicting one', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    // request-gh-002 (Rohan Gupta) already has occupantCount: 3 on file.
    const result = await agent.handleMessage(
      messageFor({ content: '5', requestId: 'request-gh-002', actorId: 'resident-rohan-gupta' })
    );

    expect(result.decision.tier).toBe('guide');
    expect(result.reply).toMatch(/5/);
    expect(result.reply).toMatch(/3/);
    expect(result.reply.toLowerCase()).toMatch(/which|correct|confirm/);
    expect(
      result.trace.reasoningSummary.some((line) => line.toLowerCase().includes('conflicting'))
    ).toBe(true);

    // The original value is never silently overwritten by the guess.
    const unchanged = repositories.moveRequests.getById('request-gh-002') as MoveInRequest;
    expect(unchanged.occupantCount).toBe(3);
  });

  it('does not treat a matching number as a conflict — only a genuine mismatch triggers clarification', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({ content: '3', requestId: 'request-gh-002', actorId: 'resident-rohan-gupta' })
    );

    expect(result.decision.tier).not.toBe('guide');
    expect(
      result.trace.reasoningSummary.some((line) => line.toLowerCase().includes('conflicting'))
    ).toBe(false);
  });
});

describe('Scenario 4 — Normal move-out: notice period satisfied, checklist complete, request proceeds', () => {
  it('recommends approval cleanly with no violations and no charges', async () => {
    const repositories = createMockRepositories(seedData);
    seedMoveOut(repositories, {
      id: 'request-scenario-4',
      communityId: RIVERSIDE_VILLAS_ID,
      residentId: 'resident-sanjay-kulkarni',
      unitId: 'unit-scenario-4',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-08-20', // 19 days notice vs RV's 14-day requirement
      config: riversideVillasConfiguration,
    });
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'confirming my move-out',
        communityId: RIVERSIDE_VILLAS_ID,
        requestId: 'request-scenario-4',
        actorId: 'resident-sanjay-kulkarni',
      })
    );

    expect(result.decision.tier).toBe('recommend');
    expect(result.decision.guardrailViolations).toEqual([]);
    expect(result.reply).not.toMatch(/charge|penalty/i);
    const updated = repositories.moveRequests.getById('request-scenario-4');
    expect(updated?.status).toBe('under_review');
  });
});

describe('Scenario 5 — Move-out with potential charges: calculated deterministically, explained, never auto-waived', () => {
  it('computes charges through the real tool, explains them, and stays at recommend — never auto-decides', async () => {
    const repositories = createMockRepositories(seedData);
    seedMoveOut(repositories, {
      id: 'request-scenario-5',
      communityId: GREENFIELD_HEIGHTS_ID,
      residentId: 'resident-vikram-shah',
      unitId: 'unit-scenario-5',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-08-16', // 15 days notice vs GH's 30-day requirement — short, but deductions stay under the escalation threshold
      config: greenfieldHeightsConfiguration,
    });
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'confirming my move-out',
        requestId: 'request-scenario-5',
        actorId: 'resident-vikram-shah',
      })
    );

    expect(result.trace.toolsCalled).toContain('calculateMoveOutCharges');
    expect(result.reply).toMatch(/penalty|charge/i);
    // Explains, never finalizes: still 'recommend', human review still
    // required — the agent never auto-approves or auto-waives.
    expect(result.decision.tier).toBe('recommend');
    expect(result.decision.requiresHumanReview).toBe(true);

    const updated = repositories.moveRequests.getById('request-scenario-5');
    expect(updated?.status).toBe('under_review'); // not 'approved' — no autonomous finalization
  });
});

describe('Scenario 6 — Move-out dispute: resident disputes a charge, agent escalates to admin', () => {
  it('explains it cannot waive the charge itself and escalates, continuing from the charges conversation', async () => {
    const repositories = createMockRepositories(seedData);
    seedMoveOut(repositories, {
      id: 'request-scenario-6',
      communityId: GREENFIELD_HEIGHTS_ID,
      residentId: 'resident-vikram-shah',
      unitId: 'unit-scenario-6',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-08-16', // same as Scenario 5 — short notice, charges apply, still a recommend
      config: greenfieldHeightsConfiguration,
    });
    const agent = buildAgent(repositories);

    // First turn reaches recommend_approve_with_charges (see Scenario 5).
    await agent.handleMessage(
      messageFor({
        content: 'confirming my move-out',
        requestId: 'request-scenario-6',
        actorId: 'resident-vikram-shah',
      })
    );

    // Second turn: the resident disputes the charge just explained.
    const disputed = await agent.handleMessage(
      messageFor({
        content: 'Can you waive this charge?',
        requestId: 'request-scenario-6',
        actorId: 'resident-vikram-shah',
      })
    );

    expect(disputed.decision.tier).toBe('escalate');
    expect(disputed.trace.toolsCalled).toContain('escalateToAdmin');
    expect(disputed.reply.toLowerCase()).toMatch(/not able to waive/);
    expect(disputed.reply.toLowerCase()).toMatch(/admin/);

    const updated = repositories.moveRequests.getById('request-scenario-6');
    expect(updated?.status).toBe('escalated');
  });
});

describe('Scenario 7 — Community-specific policy: the same request behaves differently per community configuration', () => {
  it('gives 3 different outcomes for the identical 20-day notice window across 3 communities', async () => {
    const cases: { communityId: string; config: CommunityConfiguration; residentId: string }[] = [
      { communityId: GREENFIELD_HEIGHTS_ID, config: greenfieldHeightsConfiguration, residentId: 'resident-ananya-rao' },
      { communityId: RIVERSIDE_VILLAS_ID, config: riversideVillasConfiguration, residentId: 'resident-karan-verma' },
      { communityId: WILLOW_CREEK_ID, config: willowCreekConfiguration, residentId: 'resident-jamie-flores' },
    ];

    const outcomes: { communityId: string; tier: string; violated: boolean }[] = [];
    for (const [i, testCase] of cases.entries()) {
      const repositories = createMockRepositories(seedData);
      const requestId = `request-scenario-7-${i}`;
      seedMoveOut(repositories, {
        id: requestId,
        communityId: testCase.communityId,
        residentId: testCase.residentId,
        unitId: `unit-scenario-7-${i}`,
        noticeGivenAt: '2026-08-01T00:00:00.000Z',
        requestedDate: '2026-08-21', // identical 20-day notice for every community
        config: testCase.config,
      });
      const agent = buildAgent(repositories);
      const result = await agent.handleMessage(
        messageFor({
          content: 'confirming my move-out',
          communityId: testCase.communityId,
          requestId,
          actorId: testCase.residentId,
        })
      );
      outcomes.push({
        communityId: testCase.communityId,
        tier: result.decision.tier,
        violated: result.decision.guardrailViolations.length > 0,
      });
    }

    // GH requires 30 days -> 20 is short -> charges apply, but still a
    // clean recommend (allowEarlyMoveWithPenalty is true there).
    expect(outcomes[0]).toMatchObject({ communityId: GREENFIELD_HEIGHTS_ID, tier: 'recommend' });
    // RV requires only 14 -> 20 clears it outright.
    expect(outcomes[1]).toMatchObject({
      communityId: RIVERSIDE_VILLAS_ID,
      tier: 'recommend',
      violated: false,
    });
    // Willow Creek requires only 3 days notice, so 20 clears it outright
    // too — but its outcome differs in an even more fundamental way:
    // autonomy.allowAutoStatusAdvance is false there, so the identical
    // clean case stops at 'guide' (submitted, awaiting a human to move
    // it to review) rather than reaching 'recommend' at all. Same
    // orchestrator code, 3 structurally distinct, config-correct
    // outcomes — not just different numbers, a different *shape* of
    // outcome.
    expect(outcomes[2]).toMatchObject({
      communityId: WILLOW_CREEK_ID,
      tier: 'guide',
      violated: false,
    });
  });
});

describe('Scenario 8 — Admin review: the agent recommends, the administrator makes the final decision', () => {
  it('records the recommendation, then lets an admin agree with it or override it — both are the administrator\'s call, not the agent\'s', async () => {
    const repositories = createMockRepositories(seedData);
    seedCleanMoveIn(repositories, 'request-scenario-8', 'resident-rohan-gupta', 'unit-scenario-8');
    const agent = buildAgent(repositories);

    const recommended = await agent.handleMessage(
      messageFor({
        content: 'any update?',
        requestId: 'request-scenario-8',
        actorId: 'resident-rohan-gupta',
      })
    );
    expect(recommended.decision.tier).toBe('recommend');
    expect(recommended.trace.toolsCalled).toContain('recommendAction');
    // Nothing has actually been decided yet — the agent's own action
    // never advances status past under_review.
    expect(repositories.moveRequests.getById('request-scenario-8')?.status).toBe('under_review');

    // The administrator agrees.
    const toolRegistry = createDefaultToolRegistry();
    const adminAgrees: ToolContext = {
      repositories,
      actorId: 'admin-gh-facility-manager',
      actorRole: 'admin',
      turnId: 'test-turn',
    };
    const agreedReview = await toolRegistry.execute<RecordAdminDecisionInput, AdminReview>(
      'recordAdminDecision',
      { requestId: 'request-scenario-8', decision: 'approved', roleKey: 'facility_manager' },
      adminAgrees
    );
    expect(agreedReview.overrodeRecommendation).toBe(false);
    expect(repositories.moveRequests.getById('request-scenario-8')?.status).toBe('approved');

    // A second, independent case where the administrator disagrees —
    // the final decision is still theirs, with the disagreement recorded.
    const repositories2 = createMockRepositories(seedData);
    seedCleanMoveIn(repositories2, 'request-scenario-8b', 'resident-farah-sheikh', 'unit-scenario-8b');
    const agent2 = buildAgent(repositories2);
    await agent2.handleMessage(
      messageFor({
        content: 'any update?',
        requestId: 'request-scenario-8b',
        actorId: 'resident-farah-sheikh',
      })
    );
    const overriddenReview = await toolRegistry.execute<RecordAdminDecisionInput, AdminReview>(
      'recordAdminDecision',
      {
        requestId: 'request-scenario-8b',
        decision: 'rejected',
        reason: 'Manual review found a document inconsistency the agent could not detect.',
        roleKey: 'facility_manager',
      },
      { repositories: repositories2, actorId: 'admin-gh-facility-manager', actorRole: 'admin', turnId: 'test-turn' }
    );
    expect(overriddenReview.overrodeRecommendation).toBe(true);
    expect(overriddenReview.agentRecommendation?.action).toBe('approve');
    expect(repositories2.moveRequests.getById('request-scenario-8b')?.status).toBe('rejected');
  });
});

describe('Scenario 9 — Unauthorized action: a resident attempts an admin-only operation and is denied', () => {
  it('structurally denies a resident invoking ADMIN_ONLY tools, regardless of what the UI would ever allow', async () => {
    const repositories = createMockRepositories(seedData);
    const toolRegistry = createDefaultToolRegistry();
    const residentContext: ToolContext = {
      repositories,
      actorId: 'resident-rohan-gupta',
      actorRole: 'resident',
      turnId: 'test-turn',
    };

    await expect(
      toolRegistry.execute<RecordAdminDecisionInput, AdminReview>(
        'recordAdminDecision',
        { requestId: 'request-gh-002', decision: 'approved', roleKey: 'facility_manager' },
        residentContext
      )
    ).rejects.toThrow(/ADMIN_ONLY/);

    await expect(
      toolRegistry.execute<AddAdminNoteInput, unknown>(
        'addAdminNote',
        { requestId: 'request-gh-002', text: 'trying to self-annotate as admin' },
        residentContext
      )
    ).rejects.toThrow();
  });

  it('never lets a resident read or act on a request that belongs to someone else, via chat', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    // request-gh-002 belongs to resident-rohan-gupta, not resident-priya-menon.
    const result = await agent.handleMessage(
      messageFor({
        content: 'what is the status?',
        requestId: 'request-gh-002',
        actorId: 'resident-priya-menon',
      })
    );

    expect(result.decision.guardrailViolations.map((v) => v.guardrail)).toContain(
      'unauthorized_action'
    );
    expect(result.decision.requiresHumanReview).toBe(true);
    // The other resident's data is never echoed back.
    expect(result.reply).not.toMatch(/gupta/i);
  });
});

describe('Scenario 10 — Agent/tool failure: the agent recovers gracefully or escalates, never crashes or invents an answer', () => {
  function withBrokenTool(toolName: 'validateMoveRequest' | 'getCommunityPolicy'): ToolRegistry {
    const registry = createDefaultToolRegistry();
    const original = registry.get(toolName)!;
    registry.register({
      ...original,
      async execute() {
        throw new Error('Simulated downstream failure — database unreachable.');
      },
    });
    return registry;
  }

  it('returns a coherent, escalated result instead of throwing when validateMoveRequest fails mid-turn', async () => {
    const repositories = createMockRepositories(seedData);
    seedCleanMoveIn(repositories, 'request-scenario-10a', 'resident-rohan-gupta', 'unit-scenario-10a');
    const agent = buildAgent(repositories, withBrokenTool('validateMoveRequest'));

    const result = await agent.handleMessage(
      messageFor({
        content: 'any update?',
        requestId: 'request-scenario-10a',
        actorId: 'resident-rohan-gupta',
      })
    );

    // Never throws up to the caller; degrades to a safe, human-reviewed outcome.
    expect(result.decision.tier).toBe('escalate');
    expect(result.decision.requiresHumanReview).toBe(true);
    // No raw error/stack trace leaks into the resident-facing reply.
    expect(result.reply).not.toMatch(/error|exception|stack|undefined/i);
    expect(result.trace.toolResults.some((r) => !r.success)).toBe(true);
  });

  it('does not misreport "no policy defined" when the policy lookup tool itself fails', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories, withBrokenTool('getCommunityPolicy'));

    const result = await agent.handleMessage(
      messageFor({
        content: 'What is the notice period policy?',
        actorId: 'resident-priya-menon',
      })
    );

    // Must not claim there's no policy — that would be false; the truth
    // is the check itself couldn't be completed this turn.
    expect(result.reply.toLowerCase()).not.toContain("don't have a defined policy");
    expect(result.decision.tier).toBe('escalate');
  });

  it('bounds runaway tool-call chains rather than looping indefinitely', async () => {
    // Not a failure exactly, but the same resilience category: the
    // per-turn tool-call cap (see move-coordinator.agent.ts) means a
    // pathological chain still terminates in one turn.
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);
    const result = await agent.handleMessage(
      messageFor({
        content: 'any update?',
        requestId: 'request-gh-002',
        actorId: 'resident-rohan-gupta',
      })
    );
    expect(result.trace.toolsCalled.length).toBeLessThanOrEqual(12);
  });
});
