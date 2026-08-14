import { z } from 'zod';
import type { Community } from '../../domain';
import { communitySchema, idSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z.object({ communityId: idSchema }).strict();
export type GetCommunityInput = z.infer<typeof inputSchema>;
const outputSchema = communitySchema.optional();

// READ_ONLY, GUIDE tier. Descriptive community metadata (name, city,
// timezone) — distinct from getCommunityConfig, which returns the
// operational rules a community enforces. No permission distinction
// beyond role: community identity itself isn't sensitive.
export const getCommunityTool: ToolDefinition<GetCommunityInput, Community | undefined> = {
  name: 'getCommunity',
  description: 'Fetch a community record — name, city, timezone.',
  inputSchema,
  outputSchema,
  authorization: 'none',
  allowedRoles: ['resident', 'admin', 'system'],
  sideEffect: 'READ_ONLY',
  tier: 'guide',
  async execute(input, context) {
    return context.repositories.communities.getById(input.communityId);
  },
};
