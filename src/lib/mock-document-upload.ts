import type { ChecklistItem, Document, RequestId } from '../domain';
import type { Repositories } from '../repositories';
import { generateId } from './id';

export interface MockUploadResult {
  document: Document;
  checklistItem: ChecklistItem;
}

// Document upload/storage/OCR is explicitly mocked for this prototype
// (plan.md §2.13) — there is no real file, no real verification step.
// This simulates the outcome instantly (status 'verified') rather than
// stopping at 'uploaded' pending review, since there's no admin-side
// verification UI yet to unblock it otherwise. The mocked storage layer
// lives here; the governed action wrapping it (ownership check, audit
// trail, schema validation) is uploadDocumentTool
// (tools/implementations/upload-document.tool.ts) — this function is not
// called directly from an API route, only from that tool.
export function mockUploadDocument(
  repositories: Repositories,
  requestId: RequestId,
  typeKey: string
): MockUploadResult {
  const checklist = repositories.checklistItems.listByRequest(requestId);
  const matching = checklist.find((item) => item.key === typeKey);
  if (!matching) {
    throw new Error(
      `No checklist item found for document type "${typeKey}" on request ${requestId}`
    );
  }

  const now = new Date().toISOString();
  const document = repositories.documents.create({
    id: generateId('doc'),
    requestId,
    typeKey,
    label: matching.label,
    status: 'verified',
    fileName: `${typeKey}.pdf`,
    uploadedAt: now,
    verifiedAt: now,
  });

  const checklistItem = repositories.checklistItems.update(matching.id, {
    status: 'verified',
    relatedDocumentId: document.id,
    updatedAt: now,
  });

  const request = repositories.moveRequests.getById(requestId);
  if (request) {
    repositories.moveRequests.update(requestId, {
      documentIds: [...request.documentIds, document.id],
    });
  }

  return { document, checklistItem };
}
