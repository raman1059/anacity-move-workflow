import { notFound } from 'next/navigation';
import { listAdminIdentities } from '@/features/admin/admin-roles';
import { AdminDashboard } from '@/features/admin/components/AdminDashboard';
import { getAdminDashboardData } from '@/features/admin/get-admin-dashboard-data';

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ communityId: string; roleKey: string }>;
}) {
  const { communityId, roleKey } = await params;

  const identity = listAdminIdentities().find(
    (i) => i.communityId === communityId && i.roleKey === roleKey
  );
  if (!identity) {
    notFound();
  }

  const data = getAdminDashboardData();

  return <AdminDashboard identity={identity} data={data} />;
}
