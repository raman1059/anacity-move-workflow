'use client';

import type { MoveRequestStatus } from '@/domain';

export interface DashboardFilterState {
  community: string; // 'all' | communityId
  type: string; // 'all' | 'move_in' | 'move_out'
  status: string; // 'all' | MoveRequestStatus
  priority: string; // 'all' | 'low' | 'medium' | 'high'
  dateFrom: string;
  dateTo: string;
}

const STATUS_OPTIONS: MoveRequestStatus[] = [
  'draft',
  'submitted',
  'information_required',
  'under_review',
  'escalated',
  'approved',
  'rejected',
  'scheduled',
  'completed',
  'cancelled',
];

interface DashboardFiltersProps {
  filters: DashboardFilterState;
  onChange: (filters: DashboardFilterState) => void;
  communities: { id: string; name: string }[];
}

const selectClass =
  'rounded-lg border border-black/15 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 dark:border-white/15';

export function DashboardFilters({ filters, onChange, communities }: DashboardFiltersProps) {
  function set<K extends keyof DashboardFilterState>(key: K, value: DashboardFilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-black/50 dark:text-white/50">
        Community
        <select
          value={filters.community}
          onChange={(e) => set('community', e.target.value)}
          className={selectClass}
        >
          <option value="all">All communities</option>
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-black/50 dark:text-white/50">
        Type
        <select
          value={filters.type}
          onChange={(e) => set('type', e.target.value)}
          className={selectClass}
        >
          <option value="all">All types</option>
          <option value="move_in">Move-in</option>
          <option value="move_out">Move-out</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-black/50 dark:text-white/50">
        Status
        <select
          value={filters.status}
          onChange={(e) => set('status', e.target.value)}
          className={selectClass}
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-black/50 dark:text-white/50">
        Priority
        <select
          value={filters.priority}
          onChange={(e) => set('priority', e.target.value)}
          className={selectClass}
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-black/50 dark:text-white/50">
        Date from
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => set('dateFrom', e.target.value)}
          className={selectClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-black/50 dark:text-white/50">
        Date to
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => set('dateTo', e.target.value)}
          className={selectClass}
        />
      </label>

      {filters.community !== 'all' ||
      filters.type !== 'all' ||
      filters.status !== 'all' ||
      filters.priority !== 'all' ||
      filters.dateFrom ||
      filters.dateTo ? (
        <button
          type="button"
          onClick={() =>
            onChange({ community: 'all', type: 'all', status: 'all', priority: 'all', dateFrom: '', dateTo: '' })
          }
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
