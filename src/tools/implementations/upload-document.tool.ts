import { z } from 'zod';
import { mockUploadDocument, type MockUploadResult } from '../../lib/mock-document-upload';
import { assertResidentOwns } from '../authorization';
import { checklistItemSchema, documentSchema, idSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z.object({ requestId: idSchema, typeKey: z.string().min(1) }).strict();
export type UploadDocumentInput = z.infer<typeof inputSchema>;
const outputSchema = z.object({ document: documentSchema, checklistItem: checklistItemSchema });

// SAFE_WRITE, ACT tier. The upload/storage/OCR step itself stays mocked
// (see lib/mock-document-upload.ts — no real file, no real verification
// queue), but the *action* of attaching a document to a request is a
// governed, resident-initiated mutation like any other: it must be
// audited, ownership-checked, and schema-validated the same way every
// other tool call is, not performed by an API route reaching into a
// repository directly.
export const uploadDocumentTool: ToolDefinition<UploadDocumentInput, MockUploadResult> = {
  name: 'uploadDocument',
  description:
    "Attach a (simulated) document to a move request's checklist. Residents may only upload to their own requests.",
  inputSchema,
  outputSchema,
  authorization: 'self',
  allowedRoles: ['resident', 'admin', 'system'],
  sideEffect: 'SAFE_WRITE',
  tier: 'act',
  async execute(input, context) {
    const request = context.repositories.moveRequests.getById(input.requestId);
    if (!request) {
      throw new Error(`MoveRequest ${input.requestId} not found`);
    }
    assertResidentOwns(
      context,
      request.residentId,
      'uploadDocument',
      'Residents may only upload documents to their own requests'
    );
    return mockUploadDocument(context.repositories, input.requestId, input.typeKey);
  },
};
