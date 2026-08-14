import { z } from 'zod';
import type { CommunityConfiguration } from '../../domain';
import { communityConfigurationSchema, idSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z.object({ communityId: idSchema }).strict();
export type GetCommunityConfigInput = z.infer<typeof inputSchema>;
const outputSchema = communityConfigurationSchema.optional();

// READ_ONLY, GUIDE tier: no side effects, always safe to call.
export const getCommunityConfigTool: ToolDefinition<
  GetCommunityConfigInput,
  CommunityConfiguration | undefined
> = {
  name: 'getCommunityConfig',
  description:
    "Fetch a community's operational configuration — required documents, notice periods, charge rules, scheduling, and approval thresholds.",
  inputSchema,
  outputSchema,
  authorization: 'none',
  allowedRoles: ['resident', 'admin', 'system'],
  sideEffect: 'READ_ONLY',
  tier: 'guide',
  async execute(input, context) {
    return context.repositories.communities.getConfiguration(input.communityId);
  },
};
