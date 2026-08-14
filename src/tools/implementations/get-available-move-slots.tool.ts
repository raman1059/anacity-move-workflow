import { z } from 'zod';
import type { MoveSlot } from '../../domain';
import { idSchema, moveSlotSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z
  .object({
    communityId: idSchema,
    resourceKey: z.string().min(1),
    dateRange: z.object({ from: z.string().min(1), to: z.string().min(1) }),
  })
  .strict();
export type GetAvailableMoveSlotsInput = z.infer<typeof inputSchema>;
const outputSchema = z.array(moveSlotSchema);

// READ_ONLY, GUIDE tier — proposing slots is informational; booking one
// is a SENSITIVE_WRITE via update-move-request.tool.ts.
export const getAvailableMoveSlotsTool: ToolDefinition<GetAvailableMoveSlotsInput, MoveSlot[]> = {
  name: 'getAvailableMoveSlots',
  description: 'List move slots for a resource with remaining capacity within a date range.',
  inputSchema,
  outputSchema,
  authorization: 'none',
  allowedRoles: ['resident', 'admin', 'system'],
  sideEffect: 'READ_ONLY',
  tier: 'guide',
  async execute(input, context) {
    return context.repositories.moveSlots.listAvailable(
      input.communityId,
      input.resourceKey,
      input.dateRange
    );
  },
};
