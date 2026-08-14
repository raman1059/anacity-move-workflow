import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createMockRepositories, seedData } from '@/mocks';
import {
  ToolPermissionError,
  createDefaultToolRegistry,
  createToolRegistry,
  type ToolContext,
  type ToolDefinition,
} from '@/tools';

function contextFor(actorId: string, actorRole: 'resident' | 'admin' | 'system'): ToolContext {
  return {
    repositories: createMockRepositories(seedData),
    actorId,
    actorRole,
    turnId: 'test-turn',
  };
}

// A deliberately misconfigured tool: sideEffect is ADMIN_ONLY, but
// allowedRoles mistakenly includes 'resident'. If the registry's
// structural gate is doing real work (independent of allowedRoles), a
// resident must still be blocked despite this misconfiguration.
const misconfiguredAdminTool: ToolDefinition<{ note: string }, { ok: true }> = {
  name: 'addAdminNote',
  description: 'Test-only tool with a deliberately over-permissive allowedRoles list.',
  inputSchema: z.object({ note: z.string() }).strict(),
  outputSchema: z.object({ ok: z.literal(true) }),
  authorization: 'admin_role',
  allowedRoles: ['resident', 'admin', 'system'], // misconfigured on purpose
  sideEffect: 'ADMIN_ONLY',
  tier: 'act',
  async execute() {
    return { ok: true };
  },
};

describe('registry-level ADMIN_ONLY enforcement', () => {
  it('blocks a resident actor from an ADMIN_ONLY tool even when allowedRoles would otherwise permit it', async () => {
    const registry = createToolRegistry();
    registry.register(misconfiguredAdminTool);

    await expect(
      registry.execute(
        'addAdminNote',
        { note: 'x' },
        contextFor('resident-priya-menon', 'resident')
      )
    ).rejects.toBeInstanceOf(ToolPermissionError);
  });

  it('blocks a system (orchestrator) actor too — ADMIN_ONLY means the human admin, nothing else', async () => {
    const registry = createToolRegistry();
    registry.register(misconfiguredAdminTool);

    await expect(
      registry.execute('addAdminNote', { note: 'x' }, contextFor('system', 'system'))
    ).rejects.toBeInstanceOf(ToolPermissionError);
  });

  it('still allows an admin actor through', async () => {
    const registry = createToolRegistry();
    registry.register(misconfiguredAdminTool);

    const result = await registry.execute<{ note: string }, { ok: true }>(
      'addAdminNote',
      { note: 'x' },
      contextFor('admin-gh-facility-manager', 'admin')
    );
    expect(result.ok).toBe(true);
  });

  it('the real tool catalog has no ADMIN_ONLY tool with a resident in allowedRoles', () => {
    const registry = createDefaultToolRegistry();
    for (const tool of registry.listAvailable('admin')) {
      if (tool.sideEffect === 'ADMIN_ONLY') {
        expect(tool.allowedRoles).not.toContain('resident');
      }
    }
  });

  it("a resident's own tool list never contains an ADMIN_ONLY tool", () => {
    const registry = createDefaultToolRegistry();
    const residentTools = registry.listAvailable('resident');
    expect(residentTools.every((tool) => tool.sideEffect !== 'ADMIN_ONLY')).toBe(true);
  });
});
