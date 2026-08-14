import { z } from 'zod';
import type { NoteAuthorType, RequestNote } from '../../domain';
import { generateId } from '../../lib/id';
import { assertResidentOwns } from '../authorization';
import { idSchema, requestNoteSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z
  .object({
    requestId: idSchema,
    text: z.string().min(1),
    category: z.string().min(1),
  })
  .strict();
export type AddRequestNoteInput = z.infer<typeof inputSchema>;
const outputSchema = requestNoteSchema;

function authorTypeFor(actorRole: 'resident' | 'admin' | 'system'): NoteAuthorType {
  return actorRole === 'system' ? 'agent' : actorRole;
}

// SAFE_WRITE, ACT tier, append-only — this is the general log the agent
// (or a resident/admin) uses to leave a note (e.g. "awaiting:
// society_noc"). Notes are never edited or deleted, only added. For
// admin-authored annotations specifically, see add-admin-note.tool.ts
// (ADMIN_ONLY) instead.
export const addRequestNoteTool: ToolDefinition<AddRequestNoteInput, RequestNote> = {
  name: 'addRequestNote',
  description: 'Append a note to a request. Append-only — notes are never edited or deleted.',
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
      'addRequestNote',
      'Residents may only add notes to their own requests'
    );

    return context.repositories.requestNotes.create({
      id: generateId('note'),
      requestId: input.requestId,
      authorType: authorTypeFor(context.actorRole),
      authorId: context.actorId,
      text: input.text,
      category: input.category,
      createdAt: new Date().toISOString(),
    });
  },
};
