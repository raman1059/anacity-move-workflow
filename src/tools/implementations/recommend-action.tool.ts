import { z } from 'zod';
import type { AgentRecommendation } from '../../domain';
import { generateId } from '../../lib/id';
import { agentRecommendationSchema, idSchema, recommendationActionSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z
  .object({
    requestId: idSchema,
    action: recommendationActionSchema,
    rationale: z.string().min(1),
    confidence: z.number().min(0).max(1),
    citedPolicyIds: z.array(idSchema),
  })
  .strict();
export type RecommendActionInput = z.infer<typeof inputSchema>;
const outputSchema = agentRecommendationSchema;

// SAFE_WRITE, RECOMMEND tier. Records a recommendation for an admin to
// review — it never changes request status itself. The real AdminReview
// record (with the admin's actual decision, and whether they overrode
// this recommendation) is created later by an admin action, out of
// scope for this orchestrator. Persisted as a RequestNote so it's
// visible in the request's timeline immediately. system-only: recommending
// is exclusively the agent's own act, never triggered directly by a human.
export const recommendActionTool: ToolDefinition<RecommendActionInput, AgentRecommendation> = {
  name: 'recommendAction',
  description:
    'Record a recommendation for a human admin to review. Advisory only — never mutates request status.',
  inputSchema,
  outputSchema,
  authorization: 'system_only',
  allowedRoles: ['system'],
  sideEffect: 'SAFE_WRITE',
  tier: 'recommend',
  async execute(input, context) {
    const createdAt = new Date().toISOString();
    const recommendation: AgentRecommendation = {
      action: input.action,
      rationale: input.rationale,
      confidence: input.confidence,
      citedPolicyIds: input.citedPolicyIds,
      createdAt,
    };

    context.repositories.requestNotes.create({
      id: generateId('note'),
      requestId: input.requestId,
      authorType: 'agent',
      authorId: context.actorId,
      text: `Recommendation: ${input.action}. ${input.rationale}`,
      category: 'recommendation',
      createdAt,
    });

    return recommendation;
  },
};
