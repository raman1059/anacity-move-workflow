import type { Document } from '../../domain';
import type { DocumentRepository } from '../../repositories';
import { EntityStore } from './store';

export function createInMemoryDocumentRepository(seed: Document[]): DocumentRepository {
  const store = new EntityStore<Document>(seed);

  return {
    getById: (id) => store.getById(id),
    listByRequest: (requestId) => store.list().filter((d) => d.requestId === requestId),
    create: (document) => store.create(document),
    update: (id, patch) => store.update(id, patch),
  };
}
