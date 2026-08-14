import type { ChecklistItem } from '../../domain';
import type { ChecklistRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryChecklistRepository(seed: ChecklistItem[]): ChecklistRepository {
  const store = new EntityStore<ChecklistItem>(seed);

  return {
    listByRequest: (requestId) => store.list().filter((c) => c.requestId === requestId),
    create: (item) => store.create(item),
    update: (id, patch) => store.update(id, patch),
  };
}
