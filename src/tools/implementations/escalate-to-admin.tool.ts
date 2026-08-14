import { z } from 'zod';
import { canTransition } from '../../agents/state-machine';
import type { MoveRequest } from '../../domain';
import { generateId } from '../../lib/id';
import { assertResidentOwns } from '../authorization';
import { idSchema, moveRequestSchema } from '../schemas';
import { ToolPermissionError, type ToolDefinition } from '../types';

const inputSchema = z
  .object({
    requestId: idSchema,
    reason: z.string().min(1),
    urgency: z.enum(['low', 'medium', 'high']),
  })
  .strict();
export type EscalateToAdminInput = z.infer<typeof inputSchema>;
const outputSchema = moveRequestSchema;

// SENSITIVE_WRITE, ESCALATE tier — the safe-failure tool. Escalating is
// always the system's own act (even when triggered by something a
// resident said), so the transition is checked against actorRole
// 'system' regardless of who is chatting. Idempotent: escalating an
// already-escalated request just adds another note rather than erroring.
// authorization is declared 'none' because the *transition* itself is
// always attempted as 'system' below — but a resident actor is still one
// of allowedRoles, so the row-level ownership check is required here too,
// same as every other resident-callable tool (a resident may only
// escalate their own request, never someone else's).
export const escalateToAdminTool: ToolDefinition<EscalateToAdminInput, MoveRequest> = {
  name: 'escalateToAdmin',
  description:
    'Escalate a request to a human admin and freeze further autonomous action on it until resolved.',
  inputSchema,
  outputSchema,
  authorization: 'none',
  allowedRoles: ['system', 'resident'],
  sideEffect: 'SENSITIVE_WRITE',
  tier: 'escalate',
  async execute(input, context) {
    const existing = context.repositories.moveRequests.getById(input.requestId);
    if (!existing) {
      throw new Error(`MoveRequest ${input.requestId} not found`);
    }
    assertResidentOwns(
      context,
      existing.residentId,
      'escalateToAdmin',
      'Residents may only escalate their own requests'
    );

    let updated = existing;
    if (existing.status !== 'escalated') {
      if (!canTransition(existing.status, 'escalated', 'system')) {
        throw new ToolPermissionError(
          'escalateToAdmin',
          `Cannot escalate a request in status "${existing.status}"`
        );
      }
      updated = context.repositories.moveRequests.update(input.requestId, {
        status: 'escalated',
        previousStatus: existing.status,
        updatedAt: new Date().toISOString(),
      });
    }

    context.repositories.requestNotes.create({
      id: generateId('note'),
      requestId: input.requestId,
      authorType: 'agent',
      authorId: context.actorId,
      text: `Escalated (${input.urgency} urgency): ${input.reason}`,
      category: 'escalation',
      createdAt: new Date().toISOString(),
    });

    return updated;
  },
};
