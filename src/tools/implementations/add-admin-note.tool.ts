import { z } from 'zod';
import type { RequestNote } from '../../domain';
import { generateId } from '../../lib/id';
import { idSchema, requestNoteSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z.object({ requestId: idSchema, text: z.string().min(1) }).strict();
export type AddAdminNoteInput = z.infer<typeof inputSchema>;
const outputSchema = requestNoteSchema;

// ADMIN_ONLY, ACT tier. Distinct from addRequestNote: this is
// specifically an admin's own annotation on a case — e.g. recording that
// a document mismatch was manually verified by phone before overriding
// an agent recommendation (see plan.md §4.9(f)). allowedRoles is ['admin']
// only, and the registry additionally enforces the ADMIN_ONLY side-effect
// classification structurally — a resident or the orchestrator itself
// can never invoke this, even if allowedRoles were ever misconfigured.
export const addAdminNoteTool: ToolDefinition<AddAdminNoteInput, RequestNote> = {
  name: 'addAdminNote',
  description:
    "Append an admin-authored annotation to a request (e.g. a manual verification or override rationale). Admin's own action only.",
  inputSchema,
  outputSchema,
  authorization: 'admin_role',
  allowedRoles: ['admin'],
  sideEffect: 'ADMIN_ONLY',
  tier: 'act',
  async execute(input, context) {
    const request = context.repositories.moveRequests.getById(input.requestId);
    if (!request) {
      throw new Error(`MoveRequest ${input.requestId} not found`);
    }
    return context.repositories.requestNotes.create({
      id: generateId('note'),
      requestId: input.requestId,
      authorType: 'admin',
      authorId: context.actorId,
      text: input.text,
      category: 'admin_note',
      createdAt: new Date().toISOString(),
    });
  },
};
