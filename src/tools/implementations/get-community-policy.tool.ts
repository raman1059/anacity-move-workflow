import { z } from 'zod';
import type { CommunityPolicy } from '../../domain';
import { communityPolicySchema, idSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z.object({ communityId: idSchema, topic: z.string().min(1) }).strict();
export type GetCommunityPolicyInput = z.infer<typeof inputSchema>;
const outputSchema = z.array(communityPolicySchema);

// READ_ONLY, GUIDE tier. Topic-scoped on purpose — the caller never gets
// "the whole policy doc," only the clause it asked for. Returns []
// (never a guess) when nothing is defined for that topic; the
// orchestrator's policy_ambiguity guardrail treats an empty result as a
// signal to escalate, never to infer an answer. See plan.md §4.4.
export const getCommunityPolicyTool: ToolDefinition<GetCommunityPolicyInput, CommunityPolicy[]> = {
  name: 'getCommunityPolicy',
  description:
    'Fetch policy clauses for a specific topic in a community. Returns an empty array, never a guess, when the topic is undefined.',
  inputSchema,
  outputSchema,
  authorization: 'none',
  allowedRoles: ['resident', 'admin', 'system'],
  sideEffect: 'READ_ONLY',
  tier: 'guide',
  async execute(input, context) {
    return context.repositories.policies.findByTopic(input.communityId, input.topic);
  },
};
