import { z } from 'zod';
import { calculateMoveOutCharges, type ChargeCalculationResult } from '../../lib/policy-engine';
import { assertResidentOwns } from '../authorization';
import { chargeCalculationResultSchema, idSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z.object({ requestId: idSchema }).strict();
export type CalculateMoveOutChargesInput = z.infer<typeof inputSchema>;
const outputSchema = chargeCalculationResultSchema;

// READ_ONLY, DECIDE tier, informational only — this computes a
// projection, it never writes a Charge record (status stays 'projected'
// until an admin confirms it; see domain/charge.ts and guardrails.ts's
// financial_decision guardrail, which forbids decide/act tiers from ever
// finalizing this).
export const calculateMoveOutChargesTool: ToolDefinition<
  CalculateMoveOutChargesInput,
  ChargeCalculationResult
> = {
  name: 'calculateMoveOutCharges',
  description:
    'Compute a projected move-out settlement (deposit, short-notice penalty, deductions) from community configuration alone.',
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
      'calculateMoveOutCharges',
      'Residents may only calculate charges for their own requests'
    );
    if (request.type !== 'move_out') {
      throw new Error(`MoveRequest ${input.requestId} is not a move-out request`);
    }
    const config = context.repositories.communities.getConfiguration(request.communityId);
    if (!config) {
      throw new Error(`CommunityConfiguration for ${request.communityId} not found`);
    }
    return calculateMoveOutCharges(request, config);
  },
};
