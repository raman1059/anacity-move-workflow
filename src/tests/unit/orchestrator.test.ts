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
  CommunityConfiguration,
  Document,
  MoveInRequest,
  MoveOutRequest,
  MoveRequest,
} from '@/domain';
import { createMoveCoordinatorAgent, MockAgentProvider, type AgentMessageInput } from '@/agents';
import { createMockRepositories, seedData } from '@/mocks';
import type { Repositories } from '@/repositories';
import { createDefaultToolRegistry } from '@/tools';
import type { UpdateMoveRequestInput } from '@/tools';

function buildAgent(repositories: Repositories) {
  return createMoveCoordinatorAgent({
    toolRegistry: createDefaultToolRegistry(),
    repositories,
    agentProvider: new MockAgentProvider(),
  });
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

function seedCleanMoveIn(
  repositories: Repositories,
  id: string,
  residentId: string,
  unitId: string
): MoveInRequest {
  const now = new Date().toISOString();
  const request = repositories.moveRequests.create({
    id,
    type: 'move_in',
    communityId: GREENFIELD_HEIGHTS_ID,
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
  seedVerifiedDocs(repositories, id, greenfieldHeightsConfiguration, 'moveIn');
  return request;
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

function messageFor(
  overrides: Partial<AgentMessageInput> & { content: string }
): AgentMessageInput {
  return {
    communityId: GREENFIELD_HEIGHTS_ID,
    actorId: 'resident-x',
    actorRole: 'resident',
    ...overrides,
  };
}

describe('orchestrator — starting a request from scratch', () => {
  it('creates a draft request via createMoveRequest when none exists yet, and asks for what is still missing', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: "I'd like to start my move-in request.",
        actorId: 'resident-rohan-gupta',
        unitId: 'unit-gh-test-fresh',
      })
    );

    expect(result.trace.toolsCalled).toContain('createMoveRequest');
    expect(result.trace.requestId).toBeDefined();
    expect(result.decision.tier).toBe('guide');
    expect(result.reply.toLowerCase()).toContain('occupant count');

    const created = repositories.moveRequests.getById(result.trace.requestId!);
    expect(created?.status).toBe('draft');
    expect(created?.type).toBe('move_in');
  });

  it('asks for a unit before creating anything, when none was supplied', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({ content: "I'd like to start my move-in.", actorId: 'resident-rohan-gupta' })
    );

    expect(result.trace.toolsCalled).not.toContain('createMoveRequest');
    expect(result.decision.tier).toBe('guide');
    expect(result.reply.toLowerCase()).toContain('unit');
  });
});

describe('orchestrator — trace (a) clean move-in', () => {
  it('chains draft-adjacent (submitted) all the way to under_review and recommends approval in one turn', async () => {
    const repositories = createMockRepositories(seedData);
    seedCleanMoveIn(
      repositories,
      'request-fixture-clean-movein',
      'resident-rohan-gupta',
      'unit-gh-fixture'
    );
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'any update on my move-in?',
        requestId: 'request-fixture-clean-movein',
        actorId: 'resident-rohan-gupta',
      })
    );

    expect(result.decision.tier).toBe('recommend');
    expect(result.decision.requiresHumanReview).toBe(true);
    expect(result.trace.toolsCalled).toContain('validateMoveRequest');
    expect(result.trace.toolsCalled).toContain('validateDocuments');
    expect(result.trace.toolsCalled).toContain('recommendAction');

    const updated = repositories.moveRequests.getById('request-fixture-clean-movein');
    expect(updated?.status).toBe('under_review');
  });

  it('recommends directly on a request already sitting clean in under_review (request-gh-002)', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'any update?',
        requestId: 'request-gh-002',
        actorId: 'resident-rohan-gupta',
      })
    );

    expect(result.decision.tier).toBe('recommend');
    expect(result.decision.decisionConfidence).toBeGreaterThan(0.9);
  });

  it('cites the community move-in policy it actually retrieved, not an empty citation', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'any update?',
        requestId: 'request-gh-002',
        actorId: 'resident-rohan-gupta',
      })
    );

    expect(result.decision.citedPolicyIds.length).toBeGreaterThan(0);
    expect(result.trace.contextUsed.policyTopicsRetrieved).toContain('move_in_documents');
    expect(result.trace.reasoningSummary).toContain('Checked community move-in policy.');
  });
});

describe('orchestrator — providing information mid-conversation', () => {
  it('asks for the occupant count when missing, then records it and advances once supplied', async () => {
    const repositories = createMockRepositories(seedData);
    const request = seedCleanMoveIn(
      repositories,
      'request-fixture-occupants',
      'resident-rohan-gupta',
      'unit-gh-fixture-occupants'
    );
    // seedCleanMoveIn sets occupantCount; blank it so there is something
    // genuinely missing for the resident to supply via chat.
    repositories.moveRequests.update(request.id, { occupantCount: undefined });
    const agent = buildAgent(repositories);

    const asked = await agent.handleMessage(
      messageFor({
        content: 'checking on my request',
        requestId: request.id,
        actorId: 'resident-rohan-gupta',
      })
    );
    expect(asked.decision.tier).toBe('guide');
    expect(asked.reply.toLowerCase()).toContain('occupant count');

    const provided = await agent.handleMessage(
      messageFor({ content: '3', requestId: request.id, actorId: 'resident-rohan-gupta' })
    );

    expect(provided.trace.reasoningSummary.some((line) => line.includes('occupant count'))).toBe(
      true
    );
    expect(provided.decision.tier).toBe('recommend'); // everything else was already clean
    const updated = repositories.moveRequests.getById(request.id) as MoveInRequest;
    expect(updated.occupantCount).toBe(3);
    expect(updated.status).toBe('under_review');
  });
});

describe('orchestrator — answering resident questions', () => {
  it('answers a policy question with the real, cited policy text', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'What is the notice period policy?',
        actorId: 'resident-priya-menon',
      })
    );

    expect(result.decision.tier).toBe('guide');
    expect(result.decision.citedPolicyIds.length).toBeGreaterThan(0);
    expect(result.reply).toMatch(/30 days/i);
    expect(
      result.trace.reasoningSummary.some((line) => line.includes('Checked community policy'))
    ).toBe(true);
  });

  it('answers honestly, without inventing a policy, when nothing is on file for the topic', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'Is there an emergency exception to the notice period?',
        communityId: RIVERSIDE_VILLAS_ID,
        actorId: 'resident-meera-iyer',
      })
    );

    expect(result.decision.tier).toBe('guide');
    expect(result.decision.citedPolicyIds).toEqual([]);
    expect(result.reply.toLowerCase()).toContain("don't have a defined policy");
  });

  it('does not misclassify a question ABOUT move-in as a command to start one', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'What documents do I need for move-in?',
        actorId: 'resident-divya-nair', // has no move-in request created via this flow yet
        unitId: 'unit-gh-501',
      })
    );

    expect(result.trace.toolsCalled).not.toContain('createMoveRequest');
    expect(result.decision.tier).toBe('guide');
  });
});

describe('orchestrator — trace (b) incomplete move-in', () => {
  it('stays in guide tier and asks for the missing document, without advancing status', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

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
    expect(unchanged?.status).toBe('information_required'); // never advanced
  });
});

describe('orchestrator — trace (d) move-out with charges', () => {
  it('recommends approval with charges when deductions stay within the escalation threshold', async () => {
    const repositories = createMockRepositories(seedData);
    seedMoveOut(repositories, {
      id: 'request-fixture-short-notice-small',
      communityId: GREENFIELD_HEIGHTS_ID,
      residentId: 'resident-vikram-shah',
      unitId: 'unit-gh-fixture-2',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-08-26', // 25 days notice vs 30 required -> 5 day shortfall
      config: greenfieldHeightsConfiguration,
    });
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'confirming my move-out',
        requestId: 'request-fixture-short-notice-small',
        actorId: 'resident-vikram-shah',
      })
    );

    expect(result.decision.tier).toBe('recommend');
    expect(result.decision.requiresHumanReview).toBe(true);
    expect(result.trace.toolsCalled).toContain('calculateMoveOutCharges');
    expect(result.reply).toMatch(/charge|penalty/i);
    // Grounding: a policy claim is backed by an actual citation, not asserted for free.
    expect(result.decision.citedPolicyIds.length).toBeGreaterThan(0);
    expect(result.trace.contextUsed.policyTopicsRetrieved).toContain('notice_period');
  });

  it('escalates instead of recommending when deductions exceed the community financial threshold', async () => {
    const repositories = createMockRepositories(seedData);
    seedMoveOut(repositories, {
      id: 'request-fixture-short-notice-large',
      communityId: GREENFIELD_HEIGHTS_ID,
      residentId: 'resident-vikram-shah',
      unitId: 'unit-gh-fixture-3',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-08-11', // 10 days notice vs 30 required -> 20 day shortfall = 10,000+ deductions
      config: greenfieldHeightsConfiguration,
    });
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'confirming my move-out',
        requestId: 'request-fixture-short-notice-large',
        actorId: 'resident-vikram-shah',
      })
    );

    expect(result.decision.tier).toBe('escalate');
    expect(result.decision.requiresHumanReview).toBe(true);
    expect(result.decision.guardrailViolations.map((v) => v.guardrail)).toContain(
      'financial_decision'
    );

    const updated = repositories.moveRequests.getById('request-fixture-short-notice-large');
    expect(updated?.status).toBe('escalated');
  });
});

describe('orchestrator — trace (e) ambiguous policy', () => {
  it('escalates a move-out that violates a notice period the community does not permit waiving, citing the missing policy', async () => {
    const repositories = createMockRepositories(seedData);
    seedMoveOut(repositories, {
      id: 'request-fixture-rv-emergency',
      communityId: RIVERSIDE_VILLAS_ID,
      residentId: 'resident-meera-iyer',
      unitId: 'unit-rv-fixture',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-08-06', // 5 days notice vs 14 required, RV disallows early move
      config: riversideVillasConfiguration,
    });
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'family emergency, can you waive the notice requirement?',
        communityId: RIVERSIDE_VILLAS_ID,
        requestId: 'request-fixture-rv-emergency',
        actorId: 'resident-meera-iyer',
      })
    );

    expect(result.decision.tier).toBe('escalate');
    expect(result.decision.requiresHumanReview).toBe(true);
    expect(result.decision.guardrailViolations.map((v) => v.guardrail)).toContain(
      'policy_ambiguity'
    );
    expect(result.reply.toLowerCase()).toContain("don't have a defined policy");

    const updated = repositories.moveRequests.getById('request-fixture-rv-emergency');
    expect(updated?.status).toBe('escalated');
  });
});

describe('orchestrator — guardrails surfaced end to end', () => {
  it('never lets a resident access a request that is not theirs, and never guesses that it might not exist', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'what is the status?',
        requestId: 'request-gh-002', // belongs to resident-rohan-gupta
        actorId: 'resident-priya-menon',
      })
    );

    expect(result.decision.guardrailViolations.map((v) => v.guardrail)).toContain(
      'unauthorized_action'
    );
    expect(result.decision.requiresHumanReview).toBe(true);
  });

  it('downgrades a recommendation to escalate when confidence falls below the community minimum', async () => {
    // Same clean move-in as trace (a), but against a community configuration
    // whose bar for autonomous recommendation is set unreachably high —
    // proves the threshold is genuinely config-driven, not hardcoded.
    const strictConfig: CommunityConfiguration = {
      ...greenfieldHeightsConfiguration,
      autonomy: { ...greenfieldHeightsConfiguration.autonomy, minRecommendationConfidence: 0.99 },
    };
    const repositories = createMockRepositories({
      ...seedData,
      communityConfigurations: [strictConfig, riversideVillasConfiguration],
    });
    seedCleanMoveIn(
      repositories,
      'request-fixture-strict',
      'resident-rohan-gupta',
      'unit-gh-fixture-strict'
    );
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'any update?',
        requestId: 'request-fixture-strict',
        actorId: 'resident-rohan-gupta',
      })
    );

    expect(result.decision.tier).toBe('escalate');
    expect(result.decision.guardrailViolations.map((v) => v.guardrail)).toContain('low_confidence');
  });

  it('bounds the number of tool calls in a single turn', async () => {
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

describe('orchestrator — cross-community scalability', () => {
  it('produces different outcomes for the identical notice window purely from community configuration', async () => {
    // 20 days notice: short of GH's 30-day requirement (charges apply),
    // but clears RV's 14-day requirement outright (no violation at all).
    // Same core code path, same amount of notice — different outcome
    // driven entirely by config, not by branching in orchestrator logic.
    const repositoriesGH = createMockRepositories(seedData);
    seedMoveOut(repositoriesGH, {
      id: 'request-fixture-cross-gh',
      communityId: GREENFIELD_HEIGHTS_ID,
      residentId: 'resident-ananya-rao',
      unitId: 'unit-gh-fixture-cross',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-08-21',
      config: greenfieldHeightsConfiguration,
    });

    const repositoriesRV = createMockRepositories(seedData);
    seedMoveOut(repositoriesRV, {
      id: 'request-fixture-cross-rv',
      communityId: RIVERSIDE_VILLAS_ID,
      residentId: 'resident-karan-verma',
      unitId: 'unit-rv-fixture-cross',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-08-21',
      config: riversideVillasConfiguration,
    });

    const ghResult = await buildAgent(repositoriesGH).handleMessage(
      messageFor({
        content: 'confirming my move-out',
        requestId: 'request-fixture-cross-gh',
        actorId: 'resident-ananya-rao',
      })
    );
    const rvResult = await buildAgent(repositoriesRV).handleMessage(
      messageFor({
        content: 'confirming my move-out',
        communityId: RIVERSIDE_VILLAS_ID,
        requestId: 'request-fixture-cross-rv',
        actorId: 'resident-karan-verma',
      })
    );

    // GH: notice is short of its 30-day requirement -> charges apply.
    expect(ghResult.decision.tier).toBe('recommend');
    expect(ghResult.reply).toMatch(/charge|penalty/i);

    // RV: the identical 20-day notice clears its lower 14-day requirement
    // outright -> clean recommend, no violation, no charges mentioned.
    expect(rvResult.decision.tier).toBe('recommend');
    expect(rvResult.decision.guardrailViolations).toEqual([]);
    expect(rvResult.reply).not.toMatch(/charge|penalty/i);
  });
});

describe('orchestrator — starting a move-out from scratch', () => {
  it('asks for an intended move-out date before creating anything, when none was given', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: "I'd like to start my move-out request.",
        actorId: 'resident-vikram-shah',
        unitId: 'unit-gh-310',
      })
    );

    expect(result.trace.toolsCalled).not.toContain('createMoveRequest');
    expect(result.decision.tier).toBe('guide');
    expect(result.reply.toLowerCase()).toContain('date');
  });

  it('creates the request and explains the notice-period policy in the same turn once a date is given', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: "I'd like to move out on 2026-12-01.",
        actorId: 'resident-farah-sheikh',
        unitId: 'unit-gh-moveout-fresh',
      })
    );

    expect(result.trace.toolsCalled).toContain('createMoveRequest');
    expect(result.trace.contextUsed.policyTopicsRetrieved).toContain('notice_period');
    expect(
      result.trace.reasoningSummary.some((line) => line.includes('move-out policy'))
    ).toBe(true);
    expect(result.reply).toMatch(/30 days/i);

    const created = repositories.moveRequests.getById(result.trace.requestId!);
    expect(created?.type).toBe('move_out');
  });
});

describe('orchestrator — charge waiver disputes', () => {
  it('explains it cannot waive a charge and escalates to admin on an active move-out', async () => {
    const repositories = createMockRepositories(seedData);
    seedMoveOut(repositories, {
      id: 'request-fixture-waiver',
      communityId: GREENFIELD_HEIGHTS_ID,
      residentId: 'resident-vikram-shah',
      unitId: 'unit-gh-fixture-waiver',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-09-01', // clean notice — isolates the waiver behavior
      config: greenfieldHeightsConfiguration,
    });
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'Can you waive this charge?',
        requestId: 'request-fixture-waiver',
        actorId: 'resident-vikram-shah',
      })
    );

    expect(result.decision.tier).toBe('escalate');
    expect(result.decision.requiresHumanReview).toBe(true);
    expect(result.decision.guardrailViolations.map((v) => v.guardrail)).toContain(
      'policy_exception'
    );
    expect(result.trace.toolsCalled).toContain('escalateToAdmin');
    expect(result.reply.toLowerCase()).toMatch(/not able to waive/);
    expect(result.reply.toLowerCase()).toMatch(/admin/);

    const updated = repositories.moveRequests.getById('request-fixture-waiver');
    expect(updated?.status).toBe('escalated');
  });

  it('says so honestly when there is no active request to review a charge on', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'Can you waive this charge?',
        actorId: 'resident-rohan-gupta',
      })
    );

    expect(result.trace.toolsCalled).not.toContain('escalateToAdmin');
    expect(result.decision.tier).toBe('guide');
    expect(result.reply.toLowerCase()).toContain("don't see an active");
  });

  it('does not attempt to re-escalate an already-escalated request', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'Can you waive this charge?',
        communityId: RIVERSIDE_VILLAS_ID,
        requestId: 'request-rv-002', // already escalated in seed data
        actorId: 'resident-meera-iyer',
      })
    );

    expect(result.decision.tier).toBe('guide');
    expect(result.reply.toLowerCase()).toContain('administrator');
  });

  it('declines to act on a charge dispute for a closed request', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'I want to dispute this charge',
        communityId: RIVERSIDE_VILLAS_ID,
        requestId: 'request-rv-004', // cancelled (terminal) in seed data
        actorId: 'resident-sanjay-kulkarni',
      })
    );

    expect(result.trace.toolsCalled).not.toContain('escalateToAdmin');
    expect(result.decision.tier).toBe('guide');
    expect(result.reply.toLowerCase()).toContain('closed');
  });
});

describe('orchestrator — withholds internal admin notes from resident-facing replies', () => {
  it('does not echo an admin-authored rejection note verbatim to the resident', async () => {
    const repositories = createMockRepositories(seedData);
    const request = seedCleanMoveIn(
      repositories,
      'request-fixture-rejected-with-admin-note',
      'resident-x',
      'unit-fixture-rejected'
    );
    repositories.moveRequests.update(request.id, { status: 'rejected' });
    repositories.requestNotes.create({
      id: 'note-fixture-internal-reason',
      requestId: request.id,
      authorType: 'admin',
      authorId: 'admin-x',
      text: 'Internal: prior lease dispute flagged by legal, do not disclose specifics to resident.',
      category: 'rejection',
      createdAt: new Date().toISOString(),
    });
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({ content: 'What is the status of my request?', requestId: request.id })
    );

    expect(result.reply).not.toContain('legal');
    expect(result.reply).not.toContain('lease dispute');
    expect(result.reply.toLowerCase()).toContain('rejected');
    expect(result.trace.decision.guardrailViolations.some((v) => v.guardrail === 'sensitive_information')).toBe(
      true
    );
  });

  it('still shows a resident-authored or system-authored note on a terminal request', async () => {
    const repositories = createMockRepositories(seedData);
    const request = seedCleanMoveIn(
      repositories,
      'request-fixture-cancelled-with-own-note',
      'resident-x',
      'unit-fixture-cancelled'
    );
    repositories.moveRequests.update(request.id, { status: 'cancelled' });
    repositories.requestNotes.create({
      id: 'note-fixture-resident-own',
      requestId: request.id,
      authorType: 'resident',
      authorId: 'resident-x',
      text: 'Cancelled because I found another place.',
      category: 'general',
      createdAt: new Date().toISOString(),
    });
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({ content: 'What is the status of my request?', requestId: request.id })
    );

    expect(
      result.trace.decision.guardrailViolations.some((v) => v.guardrail === 'sensitive_information')
    ).toBe(false);
  });
});

describe('orchestrator — explaining charges on request', () => {
  it('answers a charges question with a real, tool-computed projection', async () => {
    const repositories = createMockRepositories(seedData);
    seedMoveOut(repositories, {
      id: 'request-fixture-charges-qa',
      communityId: GREENFIELD_HEIGHTS_ID,
      residentId: 'resident-vikram-shah',
      unitId: 'unit-gh-fixture-charges-qa',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-08-26', // 25 days notice vs 30 required -> short-notice charge
      config: greenfieldHeightsConfiguration,
    });
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'What charges apply to my move-out?',
        requestId: 'request-fixture-charges-qa',
        actorId: 'resident-vikram-shah',
      })
    );

    expect(result.trace.toolsCalled).toContain('calculateMoveOutCharges');
    expect(result.decision.tier).toBe('guide');
    expect(result.reply).toMatch(/penalty|charge/i);
    expect(result.reply).toMatch(/projection/i);
  });
});

describe('orchestrator — workflow variation: autonomy.allowAutoStatusAdvance', () => {
  it('stops at submitted (not under_review) for a community that disables automatic advancement, and an admin can still move it forward manually', async () => {
    const repositories = createMockRepositories(seedData);
    const now = new Date().toISOString();
    const request = repositories.moveRequests.create({
      id: 'request-fixture-wc-manual',
      type: 'move_in',
      communityId: WILLOW_CREEK_ID,
      residentId: 'resident-noah-becker',
      unitId: 'unit-wc-101',
      status: 'submitted',
      requestedDate: '2026-09-01',
      occupantCount: 1,
      vehicleCount: 0,
      documentIds: [],
      checklistItemIds: [],
      createdBy: { actorId: 'resident-noah-becker', actorRole: 'resident' },
      createdAt: now,
      updatedAt: now,
    }) as MoveInRequest;
    seedVerifiedDocs(repositories, request.id, willowCreekConfiguration, 'moveIn');

    const agent = buildAgent(repositories);
    const result = await agent.handleMessage(
      messageFor({
        content: 'checking in',
        communityId: WILLOW_CREEK_ID,
        requestId: request.id,
        actorId: 'resident-noah-becker',
      })
    );

    expect(result.decision.tier).toBe('guide');
    expect(result.reply.toLowerCase()).toContain('manually');

    const stillSubmitted = repositories.moveRequests.getById(request.id);
    expect(stillSubmitted?.status).toBe('submitted');

    // Never dead-ends: state-machine.ts allows 'admin' on this exact
    // transition precisely for this case (see plan.md's Scalability
    // Architecture section).
    const registry = createDefaultToolRegistry();
    const advanced = await registry.execute<UpdateMoveRequestInput, MoveRequest>(
      'updateMoveRequest',
      { requestId: request.id, patch: { status: 'under_review' } },
      { repositories, actorId: 'admin-wc-site-manager', actorRole: 'admin', turnId: 'test-turn' }
    );
    expect(advanced.status).toBe('under_review');
  });
});

describe('orchestrator — the agent selects the correct tool for the situation', () => {
  it('a document question checks the real policy but never calculates charges', async () => {
    const repositories = createMockRepositories(seedData);
    seedMoveOut(repositories, {
      id: 'request-fixture-tool-selection-docs',
      communityId: GREENFIELD_HEIGHTS_ID,
      residentId: 'resident-vikram-shah',
      unitId: 'unit-fixture-tool-selection-docs',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-08-31',
      config: greenfieldHeightsConfiguration,
    });
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'What documents do I need for move-out?',
        requestId: 'request-fixture-tool-selection-docs',
        actorId: 'resident-vikram-shah',
      })
    );

    expect(result.trace.toolsCalled).toContain('getCommunityPolicy');
    expect(result.trace.toolsCalled).not.toContain('calculateMoveOutCharges');
  });

  it('a charges question calculates charges through the real deterministic tool, not a policy-text guess', async () => {
    const repositories = createMockRepositories(seedData);
    seedMoveOut(repositories, {
      id: 'request-fixture-tool-selection-charges',
      communityId: GREENFIELD_HEIGHTS_ID,
      residentId: 'resident-vikram-shah',
      unitId: 'unit-fixture-tool-selection-charges',
      noticeGivenAt: '2026-08-01T00:00:00.000Z',
      requestedDate: '2026-08-31',
      config: greenfieldHeightsConfiguration,
    });
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'How much will I be charged for moving out?',
        requestId: 'request-fixture-tool-selection-charges',
        actorId: 'resident-vikram-shah',
      })
    );

    expect(result.trace.toolsCalled).toContain('calculateMoveOutCharges');
  });

  it('never calls an ADMIN_ONLY tool from a resident-driven turn, across a spread of scenarios', async () => {
    const turns: AgentMessageInput[] = [
      messageFor({ content: "I'd like to move in with 2 occupants on 2026-11-01.", actorId: 'resident-rohan-gupta', unitId: 'unit-fixture-admin-only-1' }),
      messageFor({ content: 'any update?', requestId: 'request-gh-002', actorId: 'resident-rohan-gupta' }),
      messageFor({ content: 'Can you waive this charge?', requestId: 'request-gh-005', actorId: 'resident-vikram-shah' }),
      messageFor({ content: 'What is the notice period policy?', actorId: 'resident-priya-menon' }),
      messageFor({ content: 'cancel my request', requestId: 'request-gh-003', actorId: 'resident-divya-nair' }),
    ];

    for (const turn of turns) {
      const repositories = createMockRepositories(seedData);
      const agent = buildAgent(repositories);
      const result = await agent.handleMessage(turn);
      expect(result.trace.toolsCalled).not.toContain('recordAdminDecision');
      expect(result.trace.toolsCalled).not.toContain('addAdminNote');
    }
  });
});

describe('orchestrator — resident-initiated cancellation', () => {
  it('cancels a draft request when the resident asks to cancel it', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    // request-gh-003 (Divya Nair) is seeded in 'draft' status.
    const result = await agent.handleMessage(
      messageFor({
        content: 'please cancel my request',
        requestId: 'request-gh-003',
        actorId: 'resident-divya-nair',
      })
    );

    expect(result.decision.tier).toBe('guide');
    expect(result.reply.toLowerCase()).toContain('cancelled');
    expect(repositories.moveRequests.getById('request-gh-003')?.status).toBe('cancelled');
  });

  it('refuses to cancel a request already under admin review, and explains why', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    // request-gh-002 (Rohan Gupta) is seeded in 'under_review' status.
    const result = await agent.handleMessage(
      messageFor({
        content: 'cancel my request please',
        requestId: 'request-gh-002',
        actorId: 'resident-rohan-gupta',
      })
    );

    expect(result.decision.tier).toBe('guide');
    expect(result.reply.toLowerCase()).toContain("can't be cancelled");
    expect(repositories.moveRequests.getById('request-gh-002')?.status).toBe('under_review');
  });

  it('does not treat a negated mention of "cancel" as a cancellation request', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: "I don't want to cancel, I just have a question about my request.",
        requestId: 'request-gh-002',
        actorId: 'resident-rohan-gupta',
      })
    );

    expect(repositories.moveRequests.getById('request-gh-002')?.status).toBe('under_review');
    expect(result.reply.toLowerCase()).not.toContain('has been cancelled');
  });

  it('says there is nothing to cancel when no request exists yet', async () => {
    const repositories = createMockRepositories(seedData);
    const agent = buildAgent(repositories);

    const result = await agent.handleMessage(
      messageFor({
        content: 'cancel my request',
        communityId: WILLOW_CREEK_ID,
        actorId: 'resident-noah-becker',
      })
    );

    expect(result.decision.tier).toBe('guide');
    expect(result.trace.toolsCalled).not.toContain('updateMoveRequest');
    expect(result.reply.toLowerCase()).toContain("don't see an active request");
  });
});
