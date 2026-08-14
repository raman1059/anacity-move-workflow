'use client';

import { Card } from '@/components/ui/Card';
import type { ChecklistItem } from '@/domain';
import { checklistStatusCopy, toneClasses } from '../status-copy';

interface ChecklistCardProps {
  checklist: ChecklistItem[];
  onUpload: (typeKey: string, label: string) => void;
  uploadingKey: string | null;
  disabled: boolean;
  // Optional: lets a non-document checklist item (source 'system_check' /
  // 'manual', e.g. dues clearance, exit inspection) be mocked-resolved
  // the same way a document upload is. Omitted entirely by move-in,
  // whose only non-document item (move slot booking) is intentionally
  // left as an admin/scheduling step rather than a resident action — so
  // move-in's rendered checklist is unchanged by this prop existing.
  onResolve?: (key: string, label: string) => void;
  resolvingKey?: string | null;
}

export function ChecklistCard({
  checklist,
  onUpload,
  uploadingKey,
  disabled,
  onResolve,
  resolvingKey,
}: ChecklistCardProps) {
  const required = checklist.filter((item) => item.required);
  const verifiedCount = required.filter((item) => item.status === 'verified').length;
  const progress = required.length > 0 ? Math.round((verifiedCount / required.length) * 100) : 0;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-black/50 dark:text-white/50">Checklist</h2>
        <span className="text-xs text-black/50 dark:text-white/50">
          {verifiedCount}/{required.length} complete
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {checklist.length === 0 ? (
        <p className="mt-4 text-sm text-black/50 dark:text-white/50">
          Your checklist will appear here once your request is started.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {checklist.map((item) => {
            const copy = checklistStatusCopy(item.status);
            const isPending = item.status === 'pending' || item.status === 'rejected';
            const needsUpload = item.source === 'document' && isPending;
            const needsResolve = Boolean(onResolve) && item.source !== 'document' && isPending;
            const isUploading = uploadingKey === item.key;
            const isResolving = resolvingKey === item.key;
            return (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-black/80 dark:text-white/80">
                    {item.label}
                    {!item.required ? (
                      <span className="ml-1 text-xs text-black/40 dark:text-white/40">
                        (optional)
                      </span>
                    ) : null}
                  </p>
                  <span
                    className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${toneClasses(copy.tone)}`}
                  >
                    {copy.label}
                  </span>
                </div>
                {needsUpload ? (
                  <button
                    type="button"
                    disabled={disabled || isUploading}
                    onClick={() => onUpload(item.key, item.label)}
                    className="shrink-0 rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-black/70 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-white/70"
                  >
                    {isUploading ? 'Uploading…' : 'Upload'}
                  </button>
                ) : null}
                {needsResolve ? (
                  <button
                    type="button"
                    disabled={disabled || isResolving}
                    onClick={() => onResolve?.(item.key, item.label)}
                    className="shrink-0 rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-black/70 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-white/70"
                  >
                    {isResolving ? 'Marking…' : 'Mark Done'}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-black/35 dark:text-white/35">
        Uploads and confirmations are simulated for this prototype.
      </p>
    </Card>
  );
}
