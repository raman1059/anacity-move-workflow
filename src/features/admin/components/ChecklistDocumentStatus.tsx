import { Card } from '@/components/ui/Card';
import type { ChecklistItem } from '@/domain';
import { checklistStatusCopy, toneClasses } from '../../shared/status-copy';

// Read-only — the admin views checklist/document status, doesn't upload
// on the resident's behalf. See features/shared/components/ChecklistCard
// for the interactive, resident-facing equivalent.
export function ChecklistDocumentStatus({ checklist }: { checklist: ChecklistItem[] }) {
  const required = checklist.filter((item) => item.required);
  const verifiedCount = required.filter((item) => item.status === 'verified').length;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-black/50 dark:text-white/50">
          Checklist &amp; documents
        </h2>
        <span className="text-xs text-black/50 dark:text-white/50">
          {verifiedCount}/{required.length} complete
        </span>
      </div>

      {checklist.length === 0 ? (
        <p className="mt-3 text-sm text-black/50 dark:text-white/50">No checklist on file.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {checklist.map((item) => {
            const copy = checklistStatusCopy(item.status);
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-black/80 dark:text-white/80">
                  {item.label}
                  {!item.required ? (
                    <span className="ml-1 text-xs text-black/40 dark:text-white/40">(optional)</span>
                  ) : null}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${toneClasses(copy.tone)}`}
                >
                  {copy.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
