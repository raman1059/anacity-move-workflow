import type { AgentContext, AgentIntentClassification } from './types';

// The ONLY seam between the orchestrator and whichever model does the
// classification. Deliberately narrow — see plan §Key Design Decision 4.
// Tool selection, decisioning, guardrail enforcement, and response text
// are all deterministic orchestrator code and never delegated here. This
// is what makes autonomy tiers structurally unbypassable rather than
// merely documented, and what keeps this a workflow agent rather than a
// chatbot with tools bolted on: swapping in a real LLM later only ever
// changes how intent gets classified, never what happens next.
export interface LLMAgentProvider {
  readonly name: string;
  classifyIntent(message: string, context: AgentContext): Promise<AgentIntentClassification>;
}
