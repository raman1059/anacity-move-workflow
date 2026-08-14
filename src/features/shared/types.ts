// A chat-panel message. `activity` (rendered from the orchestrator's
// curated reasoningSummary) is only ever available for messages generated
// during the current session — it comes from the live AgentTrace, not
// from what's persisted on AgentMessage, so history restored after a
// reload shows content without it. Shared by move-in and move-out — both
// chat with the same orchestrator over the same 3-role message shape.
export interface UiMessage {
  id: string;
  // 'system' is a status/bookkeeping event (e.g. "marked as awaiting
  // information after no response") rather than something either party
  // said — rendered as a centered divider, not a speech bubble.
  role: 'user' | 'agent' | 'system';
  content: string;
  activity?: string[];
  createdAt: string;
}
