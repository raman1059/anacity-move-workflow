'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { AdminIdentity, DashboardData } from '../types';
import { DashboardFilters, type DashboardFilterState } from './DashboardFilters';
import { RequestsTable } from './RequestsTable';

const EMPTY_FILTERS: DashboardFilterState = {
  community: 'all',
  type: 'all',
  status: 'all',
  priority: 'all',
  dateFrom: '',
  dateTo: '',
};

export function AdminDashboard({
  identity,
  data,
}: {
  identity: AdminIdentity;
  data: DashboardData;
}) {
  // Defaults to the picker's own community — a facility manager's first
  // view is their own portfolio, not the whole platform — but every
  // dimension including community itself is switchable from here.
  const [filters, setFilters] = useState<DashboardFilterState>({
    ...EMPTY_FILTERS,
    community: identity.communityId,
  });

  const filteredRows = useMemo(() => {
    return data.rows.filter((row) => {
      if (filters.community !== 'all' && row.communityId !== filters.community) return false;
      if (filters.type !== 'all' && row.request.type !== filters.type) return false;
      if (filters.status !== 'all' && row.request.status !== filters.status) return false;
      if (filters.priority !== 'all' && row.priority !== filters.priority) return false;
      if (filters.dateFrom && row.request.requestedDate < filters.dateFrom) return false;
      if (filters.dateTo && row.request.requestedDate > filters.dateTo) return false;
      return true;
    });
  }, [data.rows, filters]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-black/50 dark:text-white/50">
            Acting as {identity.roleLabel} — {identity.communityName}
          </p>
          <h1 className="mt-0.5 text-xl font-semibold">Move-in / Move-out requests</h1>
        </div>
        <Link href="/admin" className="text-sm text-black/50 hover:underline dark:text-white/50">
          Switch identity
        </Link>
      </header>

      <DashboardFilters filters={filters} onChange={setFilters} communities={data.communities} />

      <p className="text-xs text-black/45 dark:text-white/45">
        {filteredRows.length} of {data.rows.length} request{data.rows.length === 1 ? '' : 's'}
      </p>

      <RequestsTable
        rows={filteredRows}
        actingCommunityId={identity.communityId}
        actingRoleKey={identity.roleKey}
      />
    </div>
  );
}
