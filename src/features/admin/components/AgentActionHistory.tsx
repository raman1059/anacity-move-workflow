'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { AgentAction } from '@/domain';
import { formatDateTime } from '../../shared/format';
import { toneClasses } from '../../shared/status-copy';

const TIER_TONE: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  guide: 'neutral',
  decide: 'info',
  act: 'success',
  recommend: 'warning',
  escalate: 'danger',
};

function summarize(action: AgentAction): string {
  const parts = Object.entries(action.input)
    .filter(([key]) => key !== 'requestId')
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return parts.length > 0 ? parts.join(', ') : 'no additional input';
}

// The full, real audit trail — every tool call the orchestrator made for
// this request, in order, never summarized away. Collapsed by default
// since it can get long; expanding it is the concrete answer to "see
// agent action history."
export function AgentActionHistory({ actions }: { actions: AgentAction[] }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...actions].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const visible = expanded ? sorted : sorted.slice(-3);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-black/50 dark:text-white/50">
          Agent action history
        </h2>
        {sorted.length > 3 ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            {expanded ? 'Show recent only' : `Show all ${sorted.length}`}
          </button>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">No agent activity recorded.</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {visible.map((action) => (
            <li key={action.id} className="border-l-2 border-black/10 pl-3 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">{action.tool}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${toneClasses(TIER_TONE[action.tier] ?? 'neutral')}`}
                >
                  {action.tier}
                </span>
                <span className="text-[10px] text-black/40 dark:text-white/40">
                  {action.actorRole}
                </span>
                {!action.success ? (
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    failed
                  </span>
                ) : null}
                <span className="ml-auto text-[10px] text-black/40 dark:text-white/40">
                  {formatDateTime(action.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-black/55 dark:text-white/55">
                {action.success ? summarize(action) : action.errorMessage}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
