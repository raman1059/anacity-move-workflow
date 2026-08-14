import { z } from 'zod';
import { isTerminalState } from '../../agents/state-machine';
import type {
  ChecklistItem,
  CommunityConfiguration,
  MoveRequest,
  MoveRequestType,
  Resident,
} from '../../domain';
import { generateId } from '../../lib/id';
import { assertResidentOwns } from '../authorization';
import { idSchema, moveRequestSchema, moveRequestTypeSchema } from '../schemas';
import type { ToolDefinition } from '../types';

// Format-validated at the tool boundary itself, not just trusted from
// whatever extracted it — the deterministic mock provider always
// extracts a well-formed date today, but the tool must not depend on
// that being true of every future caller (see plan.md's Security &
// Agent-Safety Review, "input validation" / "tool injection").
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)');

const inputSchema = z
  .object({
    communityId: idSchema,
    residentId: idSchema,
    unitId: idSchema,
    type: moveRequestTypeSchema,
    requestedDate: dateOnlySchema,
    occupantCount: z.number().int().positive().optional(),
    vehicleCount: z.number().int().nonnegative().optional(),
    noticeGivenAt: z.string().optional(),
    forwardingAddress: z.string().optional(),
    reasonForMoveOut: z.string().optional(),
  })
  .strict();
export type CreateMoveRequestInput = z.infer<typeof inputSchema>;
const outputSchema = moveRequestSchema;

function buildInitialChecklist(
  type: MoveRequestType,
  resident: Resident,
  config: CommunityConfiguration,
  now: string
): Array<Omit<ChecklistItem, 'id' | 'requestId'>> {
  const requirements = type === 'move_in' ? config.documents.moveIn : config.documents.moveOut;
  const items: Array<Omit<ChecklistItem, 'id' | 'requestId'>> = requirements.map((requirement) => {
    const appliesToResident =
      !requirement.residentTypes || requirement.residentTypes.includes(resident.residentType);
    return {
      key: requirement.key,
      label: requirement.label,
      required: appliesToResident && requirement.required,
      status: 'pending',
      source: 'document',
      updatedAt: now,
    };
  });

  if (type === 'move_out' && config.charges.duesCheckEnabled) {
    items.push({
      key: 'dues_cleared',
      label: 'Dues Cleared',
      required: true,
      status: 'pending',
      source: 'system_check',
      updatedAt: now,
    });
  }
  if (type === 'move_out' && config.moveOut.requiresInspection) {
    items.push({
      key: 'inspection_scheduled',
      label: 'Exit Inspection Scheduled',
      required: true,
      status: 'pending',
      source: 'manual',
      updatedAt: now,
    });
  }
  items.push({
    key: 'move_slot_booked',
    label: 'Move Slot Booked',
    required: true,
    status: 'pending',
    source: 'manual',
    updatedAt: now,
  });

  return items;
}

// SAFE_WRITE, ACT tier. Seeds the checklist from the community's own
// document requirements (config-driven — a new community needs no code
// change to get a correct checklist), and rejects a duplicate active
// request for the same resident/unit/type before creating anything.
export const createMoveRequestTool: ToolDefinition<CreateMoveRequestInput, MoveRequest> = {
  name: 'createMoveRequest',
  description:
    'Create a new move-in or move-out request in draft status, with its checklist seeded from community configuration.',
  inputSchema,
  outputSchema,
  authorization: 'self',
  allowedRoles: ['resident', 'admin', 'system'],
  sideEffect: 'SAFE_WRITE',
  tier: 'act',
  async execute(input, context) {
    assertResidentOwns(
      context,
      input.residentId,
      'createMoveRequest',
      'Residents may only create requests for themselves'
    );

    const resident = context.repositories.residents.getById(input.residentId);
    if (!resident) {
      throw new Error(`Resident ${input.residentId} not found`);
    }
    const config = context.repositories.communities.getConfiguration(input.communityId);
    if (!config) {
      throw new Error(`CommunityConfiguration for ${input.communityId} not found`);
    }

    const existingActive = context.repositories.moveRequests
      .listByResident(input.residentId)
      .find(
        (existing) =>
          existing.unitId === input.unitId &&
          existing.type === input.type &&
          !isTerminalState(existing.status)
      );
    if (existingActive) {
      throw new Error(
        `An active ${input.type.replace('_', '-')} request already exists for this unit (${existingActive.id})`
      );
    }

    const now = new Date().toISOString();
    const requestId = generateId('request');

    const base = {
      id: requestId,
      communityId: input.communityId,
      residentId: input.residentId,
      unitId: input.unitId,
      status: 'draft' as const,
      requestedDate: input.requestedDate,
      documentIds: [] as string[],
      checklistItemIds: [] as string[],
      createdBy: { actorId: context.actorId, actorRole: context.actorRole },
      createdAt: now,
      updatedAt: now,
    };

    const request: MoveRequest =
      input.type === 'move_in'
        ? {
            ...base,
            type: 'move_in',
            occupantCount: input.occupantCount,
            vehicleCount: input.vehicleCount,
          }
        : {
            ...base,
            type: 'move_out',
            noticeGivenAt: input.noticeGivenAt ?? now,
            forwardingAddress: input.forwardingAddress,
            reasonForMoveOut: input.reasonForMoveOut,
          };

    context.repositories.moveRequests.create(request);

    const checklistItemIds = buildInitialChecklist(input.type, resident, config, now).map(
      (template) => {
        const item = context.repositories.checklistItems.create({
          ...template,
          id: generateId('ci'),
          requestId,
        });
        return item.id;
      }
    );

    return context.repositories.moveRequests.update(requestId, { checklistItemIds });
  },
};
