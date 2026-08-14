// Whether a real LLM provider is configured. The default experience
// requires no API key at all — see mock-llm-provider.ts — so this only
// matters for the Phase 2/3 branch that would prefer a real, Claude-backed
// provider when one is available.
export function isLlmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
