import type { Document, DocumentId, RequestId } from '../domain';

export interface DocumentRepository {
  getById(id: DocumentId): Document | undefined;
  listByRequest(requestId: RequestId): Document[];
  create(document: Document): Document;
  update(id: DocumentId, patch: Partial<Document>): Document;
}
