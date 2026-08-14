import { z } from 'zod';
import { validateMoveRequest, type ValidateRequestResult } from '../../lib/policy-engine';
import { assertResidentOwns } from '../authorization';
import { idSchema, validateRequestResultSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z.object({ requestId: idSchema }).strict();
export type ValidateMoveRequestInput = z.infer<typeof inputSchema>;
const outputSchema = validateRequestResultSchema;

// READ_ONLY, DECIDE tier — a pure, deterministic rules check against the
// community's CommunityConfiguration. No interpretation, no side
// effects; safe to call as often as needed. See lib/policy-engine.ts for
// the actual logic.
export const validateMoveRequestTool: ToolDefinition<
  ValidateMoveRequestInput,
  ValidateRequestResult
> = {
  name: 'validateMoveRequest',
  description:
    'Check a move request against its community configuration for missing fields and policy violations.',
  inputSchema,
  outputSchema,
  authorization: 'self',
  allowedRoles: ['resident', 'admin', 'system'],
  sideEffect: 'READ_ONLY',
  tier: 'decide',
  async execute(input, context) {
    const request = context.repositories.moveRequests.getById(input.requestId);
    if (!request) {
      throw new Error(`MoveRequest ${input.requestId} not found`);
    }
    assertResidentOwns(
      context,
      request.residentId,
      'validateMoveRequest',
      'Residents may only validate their own requests'
    );
    const resident = context.repositories.residents.getById(request.residentId);
    if (!resident) {
      throw new Error(`Resident ${request.residentId} not found`);
    }
    const config = context.repositories.communities.getConfiguration(request.communityId);
    if (!config) {
      throw new Error(`CommunityConfiguration for ${request.communityId} not found`);
    }
    return validateMoveRequest(request, resident, config);
  },
};
