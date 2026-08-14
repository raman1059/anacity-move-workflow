import { z } from 'zod';
import type { MoveRequest } from '../../domain';
import { assertResidentOwns } from '../authorization';
import { idSchema, moveRequestSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z.object({ requestId: idSchema }).strict();
export type GetMoveRequestInput = z.infer<typeof inputSchema>;
const outputSchema = moveRequestSchema.optional();

// READ_ONLY, GUIDE tier. Row-level scoping enforced here, same pattern as
// get-resident.tool.ts: a resident actor may only fetch a request that
// belongs to them.
export const getMoveRequestTool: ToolDefinition<GetMoveRequestInput, MoveRequest | undefined> = {
  name: 'getMoveRequest',
  description:
    'Fetch a move request by id. Residents may only fetch their own requests; admins and the system may fetch any request.',
  inputSchema,
  outputSchema,
  authorization: 'self',
  allowedRoles: ['resident', 'admin', 'system'],
  sideEffect: 'READ_ONLY',
  tier: 'guide',
  async execute(input, context) {
    const request = context.repositories.moveRequests.getById(input.requestId);
    if (!request) {
      return undefined;
    }
    assertResidentOwns(
      context,
      request.residentId,
      'getMoveRequest',
      'Residents may only fetch their own requests'
    );
    return request;
  },
};
