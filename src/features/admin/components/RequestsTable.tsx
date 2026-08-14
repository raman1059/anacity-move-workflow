import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '../../shared/format';
import type { DashboardRow } from '../types';
import { PriorityBadge } from './PriorityBadge';

interface RequestsTableProps {
  rows: DashboardRow[];
  actingCommunityId: string;
  actingRoleKey: string;
}

export function RequestsTable({ rows, actingCommunityId, actingRoleKey }: RequestsTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-black/50 dark:text-white/50">
          No requests match the current filters.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-black/10 text-black/50 dark:border-white/10 dark:text-white/50">
          <tr>
            <th className="px-4 py-2 font-medium">Resident</th>
            <th className="px-4 py-2 font-medium">Community</th>
            <th className="px-4 py-2 font-medium">Unit</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Priority</th>
            <th className="px-4 py-2 font-medium">Requested date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.request.id}
              className="border-b border-black/5 last:border-0 hover:bg-black/[0.02] dark:border-white/5 dark:hover:bg-white/[0.03]"
            >
              <td className="px-4 py-2">
                <Link
                  href={`/admin/${actingCommunityId}/${actingRoleKey}/${row.request.id}`}
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {row.residentName}
                </Link>
              </td>
              <td className="px-4 py-2 text-black/70 dark:text-white/70">{row.communityName}</td>
              <td className="px-4 py-2 text-black/70 dark:text-white/70">
                {row.unitNumber ?? '—'}
              </td>
              <td className="px-4 py-2 capitalize text-black/70 dark:text-white/70">
                {row.request.type.replace('_', ' ')}
              </td>
              <td className="px-4 py-2">
                <StatusBadge status={row.request.status} />
              </td>
              <td className="px-4 py-2">
                <PriorityBadge priority={row.priority} />
              </td>
              <td className="px-4 py-2 text-black/70 dark:text-white/70">
                {formatDate(row.request.requestedDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
