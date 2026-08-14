import { z } from 'zod';
import { canTransition } from '../../agents/state-machine';
import type { MoveRequest } from '../../domain';
import type { MoveRequestPatch } from '../../repositories';
import { assertResidentOwns } from '../authorization';
import { idSchema, moveRequestSchema, moveRequestStatusSchema } from '../schemas';
import { ToolPermissionError, type ToolDefinition } from '../types';

// Deliberately narrower than Partial<MoveInRequest | MoveOutRequest> —
// id, communityId, residentId, unitId, type, createdBy, and createdAt
// are never patchable through this tool, enforced by the schema itself,
// not just convention. occupantCount/vehicleCount/forwardingAddress/
// reasonForMoveOut are the type-specific fields a resident legitimately
// supplies after creation (e.g. answering "how many occupants?" in chat).
const patchSchema = z
  .object({
    status: moveRequestStatusSchema.optional(),
    previousStatus: moveRequestStatusSchema.optional(),
    requestedDate: z.string().optional(),
    documentIds: z.array(idSchema).optional(),
    checklistItemIds: z.array(idSchema).optional(),
    moveSlotId: idSchema.optional(),
    updatedAt: z.string().optional(),
    occupantCount: z.number().int().positive().optional(),
    vehicleCount: z.number().int().nonnegative().optional(),
    forwardingAddress: z.string().optional(),
    reasonForMoveOut: z.string().optional(),
  })
  .strict();

const inputSchema = z.object({ requestId: idSchema, patch: patchSchema }).strict();
export type UpdateMoveRequestInput = z.infer<typeof inputSchema>;
const outputSchema = moveRequestSchema;

// SENSITIVE_WRITE, ACT tier (gated). This is where "invalid state
// transitions" and "unauthorized actions" get real enforcement, not just
// documentation — an illegal or role-inappropriate status change is
// rejected here regardless of what the caller (including the
// orchestrator itself) asked for. authorization is 'self' as the base
// rule (a resident may only update their own request), layered with the
// state-machine's own per-transition role gating (e.g. only an admin may
// move a request into 'approved') — too fine-grained for a single
// authorization enum value, so it's enforced directly below and covered
// by agents/state-machine.ts's own tests. See plan.md §4.4.
export const updateMoveRequestTool: ToolDefinition<UpdateMoveRequestInput, MoveRequest> = {
  name: 'updateMoveRequest',
  description:
    'Update a move request. Any status change is validated against the state machine and role-gated before being applied.',
  inputSchema,
  outputSchema,
  authorization: 'self',
  allowedRoles: ['resident', 'admin', 'system'],
  sideEffect: 'SENSITIVE_WRITE',
  tier: 'act',
  async execute(input, context) {
    const existing = context.repositories.moveRequests.getById(input.requestId);
    if (!existing) {
      throw new Error(`MoveRequest ${input.requestId} not found`);
    }

    assertResidentOwns(
      context,
      existing.residentId,
      'updateMoveRequest',
      'Residents may only update their own requests'
    );

    const nextStatus = input.patch.status;
    if (nextStatus && nextStatus !== existing.status) {
      if (!canTransition(existing.status, nextStatus, context.actorRole)) {
        throw new ToolPermissionError(
          'updateMoveRequest',
          `Role "${context.actorRole}" may not move this request from "${existing.status}" to "${nextStatus}"`
        );
      }
    }

    const patch: MoveRequestPatch = { ...input.patch, updatedAt: new Date().toISOString() };
    // Retain where we came from on escalation, so resolution can return
    // the case to where it was — see plan.md §4.6.
    if (nextStatus === 'escalated' && patch.previousStatus === undefined) {
      patch.previousStatus = existing.status;
    }

    return context.repositories.moveRequests.update(input.requestId, patch);
  },
};
