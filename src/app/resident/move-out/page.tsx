import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { getCommunityService, getResidentService } from '@/lib/container';

// Step 1 of the move-out resident flow — mirrors /resident (move-in),
// see plan.md. No real auth in this prototype — this (and the resident
// picker one level down) stands in for sign-in.
export default function ResidentMoveOutCommunityPicker() {
  const communities = getCommunityService().listCommunities();
  const residentService = getResidentService();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-sm font-medium text-black/50 dark:text-white/50">ANACITY</p>
        <h1 className="mt-1 text-2xl font-semibold">Which community are you moving out of?</h1>
        <p className="mt-2 max-w-xl text-sm text-black/60 dark:text-white/60">
          Select your community to get started with your move-out.
        </p>
        <Link
          href="/resident"
          className="mt-3 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Moving in instead?
        </Link>
      </header>

      {communities.length === 0 ? (
        <Card>No communities are available right now.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {communities.map((community) => {
            const residentCount = residentService.listByCommunity(community.id).length;
            return (
              <Link key={community.id} href={`/resident/move-out/${community.id}`}>
                <Card className="h-full transition hover:border-black/30 hover:shadow-md dark:hover:border-white/30">
                  <h2 className="font-medium">{community.name}</h2>
                  <p className="text-sm text-black/50 dark:text-white/50">{community.city}</p>
                  <p className="mt-3 text-xs text-black/40 dark:text-white/40">
                    {residentCount} resident{residentCount === 1 ? '' : 's'} on file
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
