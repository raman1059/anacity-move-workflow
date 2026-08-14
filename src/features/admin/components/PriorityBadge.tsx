import type { RequestPriority } from '@/lib/request-priority';
import { toneClasses } from '../../shared/status-copy';

const PRIORITY_COPY: Record<RequestPriority, { label: string; tone: 'danger' | 'warning' | 'neutral' }> = {
  high: { label: 'High priority', tone: 'danger' },
  medium: { label: 'Medium priority', tone: 'warning' },
  low: { label: 'Low priority', tone: 'neutral' },
};

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const copy = PRIORITY_COPY[priority];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses(copy.tone)}`}
    >
      {copy.label}
    </span>
  );
}
