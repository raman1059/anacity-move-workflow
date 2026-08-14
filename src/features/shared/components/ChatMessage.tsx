import type { UiMessage } from '../types';

// A quiet, textual signal for the lines that represent the agent
// actually hitting one of its boundaries (escalating, refusing to
// decide, handing off to a human) — a color distinction only, never new
// copy or new logic. Everything else in reasoningSummary stays neutral.
// Checked against every reasoningSummary string actually pushed in
// move-coordinator.agent.ts, not guessed — "Admin review required." in
// particular is the single most common boundary line in the app.
function isBoundaryLine(line: string): boolean {
  return /escalat|cannot|not able to|admin review required|denied|could not|unable/i.test(line);
}

// Agent activity lines are rendered as small, muted text beneath the
// reply — the orchestrator's curated reasoningSummary (plan.md §4:
// "concise reasoning summaries... instead of private chain-of-thought"),
// never raw model deliberation. This is the whole mechanism for "show
// agent activity in a clean way, do not expose internal chain-of-thought."
export function ChatMessage({ message }: { message: UiMessage }) {
  if (message.role === 'system') {
    return (
      <div className="flex justify-center py-1">
        <p className="max-w-[85%] text-center text-xs italic text-black/40 dark:text-white/40">
          {message.content}
        </p>
      </div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'rounded-br-sm bg-blue-600 text-white'
              : 'rounded-bl-sm border border-black/10 bg-white text-black/80 dark:border-white/10 dark:bg-white/5 dark:text-white/80'
          }`}
        >
          {message.content}
        </div>
        {!isUser && message.activity && message.activity.length > 0 ? (
          <div className="mt-1.5 pl-2">
            <p className="text-[10px] font-medium tracking-wide text-black/35 uppercase dark:text-white/35">
              Agent activity
            </p>
            <div className="mt-0.5 space-y-0.5">
              {message.activity.map((line, index) => {
                const boundary = isBoundaryLine(line);
                return (
                  <p
                    key={index}
                    className={`flex items-center gap-1.5 text-xs ${
                      boundary
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-black/45 dark:text-white/45'
                    }`}
                  >
                    <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-current" />
                    {line}
                  </p>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
