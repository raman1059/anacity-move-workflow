import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import {
  getCommunityService,
  getMoveRequestService,
  getRepositories,
  getResidentService,
} from '@/lib/container';

// Step 2 of the resident flow: select your unit. Backed by real assigned
// residents (each maps 1:1 to a unit already on file — see plan.md §5)
// rather than free browsing of inventory, matching this prototype's
// "the leasing office already has you on file" model. Prospective
// residents only — someone already fully moved in isn't mid-move-in.
export default async function ResidentUnitPicker({
  params,
}: {
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;

  const community = getCommunityService().getCommunity(communityId);
  if (!community) {
    notFound();
  }

  const residents = getResidentService()
    .listByCommunity(communityId)
    .filter((r) => r.status === 'prospective');
  const moveRequestService = getMoveRequestService();
  const repositories = getRepositories();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header>
        <Link href="/resident" className="text-sm text-black/50 hover:underline dark:text-white/50">
          &larr; Change community
        </Link>
        <p className="mt-3 text-sm font-medium text-black/50 dark:text-white/50">
          {community.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Which unit is this for?</h1>
        <p className="mt-2 max-w-xl text-sm text-black/60 dark:text-white/60">
          Select your name below to continue your move-in.
        </p>
      </header>

      {residents.length === 0 ? (
        <Card>
          <p className="font-medium">No move-in candidates on file</p>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            There&apos;s nobody currently mid-move-in for {community.name}.
          </p>
          <Link
            href="/resident"
            className="mt-3 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Try a different community
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {residents.map((resident) => {
            const unit = resident.unitId ? repositories.units.getById(resident.unitId) : undefined;
            const hasStarted = moveRequestService
              .listByResident(resident.id)
              .some((r) => r.type === 'move_in');
            return (
              <Link key={resident.id} href={`/resident/${communityId}/${resident.id}`}>
                <Card className="h-full transition hover:border-black/30 hover:shadow-md dark:hover:border-white/30">
                  <p className="font-medium">
                    {resident.firstName} {resident.lastName}
                  </p>
                  <p className="text-sm text-black/50 dark:text-white/50">
                    {unit?.unitNumber ?? 'Unit not yet assigned'}
                  </p>
                  <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                    {hasStarted ? 'Move-in in progress' : 'Not started yet'}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
