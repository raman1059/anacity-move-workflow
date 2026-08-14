import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { MoveInWorkspace } from '@/features/move-in/components/MoveInWorkspace';
import { getWorkspaceData } from '@/features/move-in/get-workspace-data';

// Step 3+ of the resident flow: the actual Move-In workspace. Fetches
// server-side (no client round trip for the first paint); the client
// component takes it from there for the interactive parts.
export default async function MoveInWorkspacePage({
  params,
}: {
  params: Promise<{ communityId: string; residentId: string }>;
}) {
  const { communityId, residentId } = await params;
  const result = getWorkspaceData(residentId);

  if (!result.ok) {
    if (result.status === 404) {
      notFound();
    }
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
        <Card className="border-red-200 dark:border-red-900/50">
          <p className="font-medium text-red-700 dark:text-red-300">
            Unable to load this workspace
          </p>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">{result.error}</p>
        </Card>
      </main>
    );
  }

  if (result.data.resident.communityId !== communityId) {
    notFound();
  }

  return (
    <MoveInWorkspace residentId={residentId} communityId={communityId} initialData={result.data} />
  );
}
