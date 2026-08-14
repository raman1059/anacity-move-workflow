import { describe, expect, it } from 'vitest';
import { GREENFIELD_HEIGHTS_ID, RIVERSIDE_VILLAS_ID } from '@/config';
import type {
  CommunityConfiguration,
  Community,
  CommunityPolicy,
  MoveRequest,
  MoveSlot,
  Resident,
} from '@/domain';
import type {
  ChargeCalculationResult,
  ValidateDocumentsResult,
  ValidateRequestResult,
} from '@/lib/policy-engine';
import { createMockRepositories, seedData } from '@/mocks';
import type { SeedData } from '@/mocks';
import {
  ToolPermissionError,
  ToolValidationError,
  createDefaultToolRegistry,
  type CalculateMoveOutChargesInput,
  type GetAvailableMoveSlotsInput,
  type GetCommunityConfigInput,
  type GetCommunityInput,
  type GetCommunityPolicyInput,
  type GetMoveRequestInput,
  type GetResidentInput,
  type ToolContext,
  type ValidateDocumentsInput,
  type ValidateMoveRequestInput,
} from '@/tools';

function contextFor(actorId: string, actorRole: 'resident' | 'admin' | 'system'): ToolContext {
  return {
    repositories: createMockRepositories(seedData),
    actorId,
    actorRole,
    turnId: 'test-turn',
  };
}

describe('tool registry', () => {
  it('exposes read-only tools to residents', () => {
    const registry = createDefaultToolRegistry();
    const residentTools = registry.listAvailable('resident').map((t) => t.name);
    expect(residentTools).toContain('getCommunityConfig');
    expect(residentTools).toContain('getCommunity');
    expect(residentTools).toContain('getResident');
  });

  it("does not expose ADMIN_ONLY tools to a resident's tool list", () => {
    const registry = createDefaultToolRegistry();
    const residentTools = registry.listAvailable('resident').map((t) => t.name);
    expect(residentTools).not.toContain('addAdminNote');
  });

  it('every tool declares all required metadata fields', () => {
    const registry = createDefaultToolRegistry();
    for (const tool of registry.listAvailable('admin')) {
      expect(tool.name).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema).toBeDefined();
      expect(tool.outputSchema).toBeDefined();
      expect(['none', 'self', 'admin_role', 'system_only']).toContain(tool.authorization);
      expect(tool.allowedRoles.length).toBeGreaterThan(0);
      expect(['READ_ONLY', 'SAFE_WRITE', 'SENSITIVE_WRITE', 'ADMIN_ONLY']).toContain(
        tool.sideEffect
      );
      expect(typeof tool.execute).toBe('function');
    }
  });
});

describe('getCommunityConfig', () => {
  it('returns the right per-community rules', async () => {
    const registry = createDefaultToolRegistry();
    const config = await registry.execute<
      GetCommunityConfigInput,
      CommunityConfiguration | undefined
    >(
      'getCommunityConfig',
      { communityId: GREENFIELD_HEIGHTS_ID },
      contextFor('resident-priya-menon', 'resident')
    );
    expect(config?.moveOut.noticePeriodDays).toBe(30);
  });
});

describe('getCommunity', () => {
  it('returns the community record', async () => {
    const registry = createDefaultToolRegistry();
    const community = await registry.execute<GetCommunityInput, Community | undefined>(
      'getCommunity',
      { communityId: GREENFIELD_HEIGHTS_ID },
      contextFor('resident-priya-menon', 'resident')
    );
    expect(community?.name).toBe('Greenfield Heights');
  });

  it('returns undefined for an unknown community rather than throwing', async () => {
    const registry = createDefaultToolRegistry();
    const community = await registry.execute<GetCommunityInput, Community | undefined>(
      'getCommunity',
      { communityId: 'community-does-not-exist' },
      contextFor('resident-priya-menon', 'resident')
    );
    expect(community).toBeUndefined();
  });
});

describe('getResident', () => {
  it('lets a resident fetch their own profile', async () => {
    const registry = createDefaultToolRegistry();
    const resident = await registry.execute<GetResidentInput, Resident | undefined>(
      'getResident',
      { residentId: 'resident-priya-menon' },
      contextFor('resident-priya-menon', 'resident')
    );
    expect(resident?.id).toBe('resident-priya-menon');
  });

  it("blocks a resident from fetching another resident's profile", async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<GetResidentInput, Resident | undefined>(
        'getResident',
        { residentId: 'resident-rohan-gupta' },
        contextFor('resident-priya-menon', 'resident')
      )
    ).rejects.toThrow(/own profile/);
  });

  it('lets an admin fetch any resident', async () => {
    const registry = createDefaultToolRegistry();
    const resident = await registry.execute<GetResidentInput, Resident | undefined>(
      'getResident',
      { residentId: 'resident-rohan-gupta' },
      contextFor('admin-gh-facility-manager', 'admin')
    );
    expect(resident?.id).toBe('resident-rohan-gupta');
  });
});

describe('getMoveRequest', () => {
  it('lets a resident fetch their own request', async () => {
    const registry = createDefaultToolRegistry();
    const request = await registry.execute<GetMoveRequestInput, MoveRequest | undefined>(
      'getMoveRequest',
      { requestId: 'request-gh-001' },
      contextFor('resident-priya-menon', 'resident')
    );
    expect(request?.id).toBe('request-gh-001');
  });

  it("blocks a resident from fetching another resident's request", async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<GetMoveRequestInput, MoveRequest | undefined>(
        'getMoveRequest',
        { requestId: 'request-gh-002' },
        contextFor('resident-priya-menon', 'resident')
      )
    ).rejects.toThrow(/own requests/);
  });

  it('returns undefined for a request id that does not exist', async () => {
    const registry = createDefaultToolRegistry();
    const request = await registry.execute<GetMoveRequestInput, MoveRequest | undefined>(
      'getMoveRequest',
      { requestId: 'request-does-not-exist' },
      contextFor('admin-gh-facility-manager', 'admin')
    );
    expect(request).toBeUndefined();
  });
});

describe('getCommunityPolicy', () => {
  it('returns clauses for a defined topic', async () => {
    const registry = createDefaultToolRegistry();
    const policies = await registry.execute<GetCommunityPolicyInput, CommunityPolicy[]>(
      'getCommunityPolicy',
      { communityId: GREENFIELD_HEIGHTS_ID, topic: 'notice_period' },
      contextFor('system', 'system')
    );
    expect(policies.length).toBeGreaterThan(0);
  });

  it('returns an empty array — not a guess — for an undefined topic', async () => {
    const registry = createDefaultToolRegistry();
    const policies = await registry.execute<GetCommunityPolicyInput, CommunityPolicy[]>(
      'getCommunityPolicy',
      { communityId: RIVERSIDE_VILLAS_ID, topic: 'notice_period_exception' },
      contextFor('system', 'system')
    );
    expect(policies).toEqual([]);
  });
});

describe('getAvailableMoveSlots', () => {
  it('excludes a slot that is already at capacity', async () => {
    const registry = createDefaultToolRegistry();
    const slots = await registry.execute<GetAvailableMoveSlotsInput, MoveSlot[]>(
      'getAvailableMoveSlots',
      {
        communityId: GREENFIELD_HEIGHTS_ID,
        resourceKey: 'elevator_service',
        dateRange: { from: '2026-08-01', to: '2026-08-31' },
      },
      contextFor('system', 'system')
    );
    expect(slots.map((s) => s.id)).not.toContain('slot-gh-elevator-0820-am'); // fully booked
    expect(slots.map((s) => s.id)).toContain('slot-gh-elevator-0820-pm'); // open
  });
});

describe('validateMoveRequest', () => {
  it('flags short notice as a policy violation', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.execute<ValidateMoveRequestInput, ValidateRequestResult>(
      'validateMoveRequest',
      { requestId: 'request-gh-005' },
      contextFor('system', 'system')
    );
    expect(result.violatedPolicies).toContain('notice_period_short');
  });

  it('is valid for a request with no missing fields or violations', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.execute<ValidateMoveRequestInput, ValidateRequestResult>(
      'validateMoveRequest',
      { requestId: 'request-gh-002' },
      contextFor('system', 'system')
    );
    expect(result.valid).toBe(true);
  });

  it("blocks a resident from validating another resident's request", async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<ValidateMoveRequestInput, ValidateRequestResult>(
        'validateMoveRequest',
        { requestId: 'request-gh-002' },
        contextFor('resident-priya-menon', 'resident')
      )
    ).rejects.toThrow(/own requests/);
  });

  it('throws a clear error for a request id that does not exist (missing entity)', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<ValidateMoveRequestInput, ValidateRequestResult>(
        'validateMoveRequest',
        { requestId: 'request-does-not-exist' },
        contextFor('system', 'system')
      )
    ).rejects.toThrow(/not found/);
  });
});

describe('validateDocuments', () => {
  it('reports the missing NOC for an incomplete move-in', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.execute<ValidateDocumentsInput, ValidateDocumentsResult>(
      'validateDocuments',
      { requestId: 'request-gh-001' },
      contextFor('system', 'system')
    );
    expect(result.allRequiredVerified).toBe(false);
    expect(result.missingKeys).toContain('society_noc');
  });

  it('reports all-verified for a clean move-in', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.execute<ValidateDocumentsInput, ValidateDocumentsResult>(
      'validateDocuments',
      { requestId: 'request-gh-002' },
      contextFor('system', 'system')
    );
    expect(result.allRequiredVerified).toBe(true);
  });
});

describe('calculateMoveOutCharges', () => {
  it('computes a short-notice penalty line item for a short-notice move-out', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.execute<CalculateMoveOutChargesInput, ChargeCalculationResult>(
      'calculateMoveOutCharges',
      { requestId: 'request-gh-005' },
      contextFor('system', 'system')
    );
    expect(result.lineItems.some((item) => item.key === 'short_notice_penalty')).toBe(true);
  });

  it('rejects a move-in request — this tool only applies to move-out', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<CalculateMoveOutChargesInput, ChargeCalculationResult>(
        'calculateMoveOutCharges',
        { requestId: 'request-gh-002' },
        contextFor('system', 'system')
      )
    ).rejects.toThrow(/not a move-out request/);
  });
});

describe('invalid inputs are rejected before execute() ever runs', () => {
  it('rejects getResident called with no residentId', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute('getResident', {}, contextFor('resident-priya-menon', 'resident'))
    ).rejects.toBeInstanceOf(ToolValidationError);
  });

  it('rejects getResident called with the wrong type for residentId', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute(
        'getResident',
        { residentId: 12345 },
        contextFor('resident-priya-menon', 'resident')
      )
    ).rejects.toBeInstanceOf(ToolValidationError);
  });

  it('rejects createMoveRequest with an invalid move request type', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute(
        'createMoveRequest',
        {
          communityId: GREENFIELD_HEIGHTS_ID,
          residentId: 'resident-priya-menon',
          unitId: 'unit-x',
          type: 'move_sideways', // not a valid MoveRequestType
          requestedDate: '2026-12-01',
        },
        contextFor('resident-priya-menon', 'resident')
      )
    ).rejects.toBeInstanceOf(ToolValidationError);
  });

  it('rejects recommendAction with a confidence outside 0-1', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute(
        'recommendAction',
        {
          requestId: 'request-gh-002',
          action: 'approve',
          rationale: 'x',
          confidence: 1.5,
          citedPolicyIds: [],
        },
        contextFor('system', 'system')
      )
    ).rejects.toBeInstanceOf(ToolValidationError);
  });

  it('rejects updateMoveRequest attempting to patch a field the schema does not allow (e.g. residentId)', async () => {
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute(
        'updateMoveRequest',
        { requestId: 'request-gh-001', patch: { residentId: 'resident-rohan-gupta' } },
        contextFor('system', 'system')
      )
    ).rejects.toBeInstanceOf(ToolValidationError);
  });

  it('never invokes execute() when validation fails — no side effect occurs', async () => {
    const repositories = createMockRepositories(seedData);
    const registry = createDefaultToolRegistry();
    const before = repositories.requestNotes.listByRequest('request-gh-001').length;

    await expect(
      registry.execute(
        'addRequestNote',
        { requestId: 'request-gh-001' /* missing text/category */ },
        { repositories, actorId: 'resident-priya-menon', actorRole: 'resident', turnId: 't' }
      )
    ).rejects.toBeInstanceOf(ToolValidationError);

    expect(repositories.requestNotes.listByRequest('request-gh-001').length).toBe(before);
  });
});

describe('invalid community configuration', () => {
  function repositoriesWithoutConfig(): ReturnType<typeof createMockRepositories> {
    const brokenSeed: SeedData = {
      ...seedData,
      communityConfigurations: seedData.communityConfigurations.filter(
        (c) => c.communityId !== GREENFIELD_HEIGHTS_ID
      ),
    };
    return createMockRepositories(brokenSeed);
  }

  it('validateMoveRequest fails clearly when the community has no configuration on file', async () => {
    const repositories = repositoriesWithoutConfig();
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<ValidateMoveRequestInput, ValidateRequestResult>(
        'validateMoveRequest',
        { requestId: 'request-gh-002' },
        { repositories, actorId: 'system', actorRole: 'system', turnId: 't' }
      )
    ).rejects.toThrow(/CommunityConfiguration/);
  });

  it('calculateMoveOutCharges fails clearly when the community has no configuration on file', async () => {
    const repositories = repositoriesWithoutConfig();
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute<CalculateMoveOutChargesInput, ChargeCalculationResult>(
        'calculateMoveOutCharges',
        { requestId: 'request-gh-005' },
        { repositories, actorId: 'system', actorRole: 'system', turnId: 't' }
      )
    ).rejects.toThrow(/CommunityConfiguration/);
  });

  it('createMoveRequest fails clearly when the target community has no configuration on file', async () => {
    const repositories = repositoriesWithoutConfig();
    const registry = createDefaultToolRegistry();
    await expect(
      registry.execute(
        'createMoveRequest',
        {
          communityId: GREENFIELD_HEIGHTS_ID,
          residentId: 'resident-priya-menon',
          unitId: 'unit-gh-fixture',
          type: 'move_out',
          requestedDate: '2026-12-01',
        },
        { repositories, actorId: 'resident-priya-menon', actorRole: 'resident', turnId: 't' }
      )
    ).rejects.toThrow(/CommunityConfiguration/);
  });
});

describe('unauthorized access is caught as ToolPermissionError', () => {
  it('is distinguishable from a generic validation or not-found error', async () => {
    const registry = createDefaultToolRegistry();
    try {
      await registry.execute<GetResidentInput, Resident | undefined>(
        'getResident',
        { residentId: 'resident-rohan-gupta' },
        contextFor('resident-priya-menon', 'resident')
      );
      expect.unreachable('expected a ToolPermissionError');
    } catch (err) {
      expect(err).toBeInstanceOf(ToolPermissionError);
    }
  });
});
