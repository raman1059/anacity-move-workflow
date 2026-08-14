import type { MoveRequestStatus } from '@/domain';

const STATUS_STYLES: Record<MoveRequestStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  information_required: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  scheduled: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  escalated: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

// Purely presentational status → label/color mapping. No data access or
// business rules here — those live in services/ and repositories/.
export function StatusBadge({ status }: { status: MoveRequestStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
