import { MockAgentProvider, type LLMAgentProvider } from '../agents';
import {
  createMoveCoordinatorAgent,
  type MoveCoordinatorAgent,
} from '../agents/move-coordinator.agent';
import { createMockRepositories, seedData } from '../mocks';
import type { Repositories } from '../repositories';
import {
  createCommunityService,
  createMoveRequestService,
  createResidentService,
  type CommunityService,
  type MoveRequestService,
  type ResidentService,
} from '../services';
import { createDefaultToolRegistry, type ToolRegistry } from '../tools';

// Single composition root for the app. The mock repositories hold state
// in process memory, so they must be a singleton per server process, not
// re-created per request/import — otherwise every request would reset
// the world. Caching on `globalThis` also survives Next.js dev-server
// hot-reload, which would otherwise re-evaluate this module (and lose
// state) on every file change.
const globalForContainer = globalThis as unknown as {
  __repositories?: Repositories;
  __toolRegistry?: ToolRegistry;
  __agentProvider?: LLMAgentProvider;
  __moveCoordinatorAgent?: MoveCoordinatorAgent;
};

export function getRepositories(): Repositories {
  globalForContainer.__repositories ??= createMockRepositories(seedData);
  return globalForContainer.__repositories;
}

export function getToolRegistry(): ToolRegistry {
  globalForContainer.__toolRegistry ??= createDefaultToolRegistry();
  return globalForContainer.__toolRegistry;
}

export function getAgentProvider(): LLMAgentProvider {
  // Phase 3+: branch on isLlmConfigured() (see lib/env.ts) to select a
  // real, Claude-backed provider when an API key is present. Until that
  // provider exists, the deterministic mock is always the default — the
  // whole application runs with zero required environment variables.
  globalForContainer.__agentProvider ??= new MockAgentProvider();
  return globalForContainer.__agentProvider;
}

export function getMoveCoordinatorAgent(): MoveCoordinatorAgent {
  globalForContainer.__moveCoordinatorAgent ??= createMoveCoordinatorAgent({
    toolRegistry: getToolRegistry(),
    repositories: getRepositories(),
    agentProvider: getAgentProvider(),
  });
  return globalForContainer.__moveCoordinatorAgent;
}

export function getCommunityService(): CommunityService {
  return createCommunityService(getRepositories());
}

export function getResidentService(): ResidentService {
  return createResidentService(getRepositories());
}

export function getMoveRequestService(): MoveRequestService {
  return createMoveRequestService(getRepositories());
}
