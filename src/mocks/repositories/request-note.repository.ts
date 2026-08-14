import type { RequestNote } from '../../domain';
import type { RequestNoteRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryRequestNoteRepository(seed: RequestNote[]): RequestNoteRepository {
  const store = new EntityStore<RequestNote>(seed);

  return {
    listByRequest: (requestId) => store.list().filter((n) => n.requestId === requestId),
    create: (note) => store.create(note),
  };
}
