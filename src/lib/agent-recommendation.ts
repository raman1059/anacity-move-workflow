import type { AgentAction, AgentRecommendation, RecommendationAction } from '../domain';

// Reconstructs the latest AgentRecommendation from the AgentAction audit
// log rather than re-storing it anywhere — recommendActionTool's return
// value is already persisted verbatim as an AgentAction's `output` by the
// orchestrator's callTool wrapper (see move-coordinator.agent.ts).
//
// Defensive on purpose: real, runtime-generated rows have the full
// 5-field shape in `output` (action, rationale, confidence,
// citedPolicyIds, createdAt), but the hand-authored narrative seed data
// (mocks/data/agentActions.ts, e.g. act-gh-005-07) only puts
// {rationale, confidence, citedPolicyIds} in `output` — `action` was
// left in `input.action` and `createdAt` wasn't duplicated. Both shapes
// are real data this app must render correctly, so both are handled
// here rather than assuming one canonical shape.
export function findLatestRecommendation(
  agentActions: AgentAction[]
): AgentRecommendation | undefined {
  const recommendations = agentActions
    .filter((a) => a.tool === 'recommendAction' && a.success)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const latest = recommendations[0];
  if (!latest) return undefined;

  const action =
    (latest.output.action as RecommendationAction | undefined) ??
    (latest.input.action as RecommendationAction | undefined);
  if (!action) return undefined;

  return {
    action,
    rationale: (latest.output.rationale as string | undefined) ?? '',
    confidence: (latest.output.confidence as number | undefined) ?? 0,
    citedPolicyIds: (latest.output.citedPolicyIds as string[] | undefined) ?? [],
    createdAt: (latest.output.createdAt as string | undefined) ?? latest.createdAt,
  };
}
