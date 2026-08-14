'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { RequestNote } from '@/domain';
import { formatRelativeTime } from '../../shared/format';

const CATEGORY_LABEL: Record<string, string> = {
  info_request: 'Information requested',
  escalation: 'Escalated to admin',
  recommendation: 'Agent recommendation',
  admin_note: 'Admin note',
  override: 'Admin override',
  rejection: 'Rejection',
  approval: 'Approved',
  cancellation: 'Cancelled',
};

const AUTHOR_LABEL: Record<RequestNote['authorType'], string> = {
  agent: 'Agent',
  admin: 'Admin',
  resident: 'Resident',
};

interface NotesPanelProps {
  notes: RequestNote[];
  onAddNote: (text: string) => void;
  pending: boolean;
}

export function NotesPanel({ notes, onAddNote, pending }: NotesPanelProps) {
  const [draft, setDraft] = useState('');
  const sorted = [...notes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed || pending) return;
    onAddNote(trimmed);
    setDraft('');
  }

  return (
    <Card>
      <h2 className="text-sm font-medium text-black/50 dark:text-white/50">Notes &amp; updates</h2>

      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">No notes yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {sorted.map((note) => (
            <li key={note.id} className="border-l-2 border-black/10 pl-3 dark:border-white/10">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-black/70 dark:text-white/70">
                  {CATEGORY_LABEL[note.category] ?? note.category} — {AUTHOR_LABEL[note.authorType]}
                </span>
                <span className="shrink-0 text-[10px] text-black/40 dark:text-white/40">
                  {formatRelativeTime(note.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-black/60 dark:text-white/60">{note.text}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-black/10 pt-3 dark:border-white/10">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note..."
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          className="flex-1 rounded-full border border-black/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-blue-400 disabled:opacity-50 dark:border-white/15"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || draft.trim().length === 0}
          className="rounded-full bg-black/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/80 dark:text-black dark:hover:bg-white"
        >
          Add
        </button>
      </div>
    </Card>
  );
}
