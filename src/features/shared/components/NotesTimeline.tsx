import { Card } from '@/components/ui/Card';
import type { RequestNote } from '@/domain';
import { formatRelativeTime } from '../format';

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
  resident: 'You',
};

export function NotesTimeline({ notes }: { notes: RequestNote[] }) {
  if (notes.length === 0) {
    return null;
  }

  const sorted = [...notes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <Card>
      <h2 className="text-sm font-medium text-black/50 dark:text-white/50">Updates</h2>
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
    </Card>
  );
}
