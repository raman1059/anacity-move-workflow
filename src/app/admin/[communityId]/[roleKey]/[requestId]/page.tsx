import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { listAdminIdentities } from '@/features/admin/admin-roles';
import { AdminRequestDetail } from '@/features/admin/components/AdminRequestDetail';
import { getAdminRequestDetail } from '@/features/admin/get-admin-request-detail';

// Deliberately does NOT require request.communityId === the URL's
// communityId — the dashboard is cross-community by design (see plan.md's
// Administrator Workflow §Key Design Decision 1), so an admin acting
// under one community's identity can still open a request from another.
export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ communityId: string; roleKey: string; requestId: string }>;
}) {
  const { communityId, roleKey, requestId } = await params;

  const identity = listAdminIdentities().find(
    (i) => i.communityId === communityId && i.roleKey === roleKey
  );
  if (!identity) {
    notFound();
  }

  const result = getAdminRequestDetail(requestId, roleKey);
  if (!result.ok) {
    if (result.status === 404) {
      notFound();
    }
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
        <Card className="border-red-200 dark:border-red-900/50">
          <p className="font-medium text-red-700 dark:text-red-300">Unable to load this request</p>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">{result.error}</p>
        </Card>
      </main>
    );
  }

  return <AdminRequestDetail identity={identity} requestId={requestId} initialData={result.data} />;
}
