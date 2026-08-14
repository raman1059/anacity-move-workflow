import type { AgentAction } from '../../domain';
import type { AgentActionRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryAgentActionRepository(seed: AgentAction[]): AgentActionRepository {
  const store = new EntityStore<AgentAction>(seed);

  return {
    listByRequest: (requestId) => store.list().filter((a) => a.requestId === requestId),
    create: (action) => store.create(action),
  };
}
