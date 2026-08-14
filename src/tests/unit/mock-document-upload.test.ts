import { describe, expect, it } from 'vitest';
import { mockUploadDocument } from '@/lib/mock-document-upload';
import { createMockRepositories, seedData } from '@/mocks';

describe('mockUploadDocument', () => {
  it('marks the matching checklist item verified and links the new document', () => {
    const repositories = createMockRepositories(seedData);
    // request-gh-001 (Priya) is missing society_noc in seed data.
    const { document, checklistItem } = mockUploadDocument(
      repositories,
      'request-gh-001',
      'society_noc'
    );

    expect(document.status).toBe('verified');
    expect(document.typeKey).toBe('society_noc');
    expect(checklistItem.status).toBe('verified');
    expect(checklistItem.relatedDocumentId).toBe(document.id);

    const request = repositories.moveRequests.getById('request-gh-001');
    expect(request?.documentIds).toContain(document.id);
  });

  it('throws a clear error when there is no matching checklist item', () => {
    const repositories = createMockRepositories(seedData);
    expect(() =>
      mockUploadDocument(repositories, 'request-gh-001', 'not_a_real_document_type')
    ).toThrow(/No checklist item found/);
  });
});
