import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getCommunityService, getMoveRequestService, getResidentService } from '@/lib/container';

// Server Component — calls the service layer directly (the correct
// pattern for Next.js Server Components; the /api/communities route
// exists separately for client-side use). Doubles as a live overview of
// config-driven communities/repositories/services, and as the entry hub
// into the resident, move-out, admin, and demo-scenario flows below.
export default function Home() {
  const communityService = getCommunityService();
  const moveRequestService = getMoveRequestService();
  const residentService = getResidentService();

  const communities = communityService.listCommunities();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-sm font-medium text-black/50 dark:text-white/50">ANACITY</p>
        <h1 className="mt-1 text-2xl font-semibold">Move-In / Move-Out — Agentic Workflow</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60 dark:text-white/60">
          A governed, config-driven agent for resident move-in/move-out across multiple
          communities, with a human-in-the-loop admin review layer.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/resident"
            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            Resident — Move-In
          </Link>
          <Link
            href="/resident/move-out"
            className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-medium text-black/70 transition hover:border-blue-400 hover:text-blue-600 dark:border-white/15 dark:text-white/70"
          >
            Resident — Move-Out
          </Link>
          <Link
            href="/admin"
            className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-medium text-black/70 transition hover:border-blue-400 hover:text-blue-600 dark:border-white/15 dark:text-white/70"
          >
            Admin dashboard
          </Link>
          <Link
            href="/demo"
            className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-medium text-black/70 transition hover:border-blue-400 hover:text-blue-600 dark:border-white/15 dark:text-white/70"
          >
            Demo scenarios
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {communities.map((community) => {
          const config = communityService.getCommunityConfiguration(community.id);
          const requests = moveRequestService.listByCommunity(community.id);
          return (
            <Card key={community.id}>
              <h2 className="font-medium">{community.name}</h2>
              <p className="text-sm text-black/50 dark:text-white/50">{community.city}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-black/50 dark:text-white/50">Move-out notice</dt>
                <dd>{config?.moveOut.noticePeriodDays} days</dd>
                <dt className="text-black/50 dark:text-white/50">Exit inspection</dt>
                <dd>{config?.moveOut.requiresInspection ? 'Required' : 'Not required'}</dd>
                <dt className="text-black/50 dark:text-white/50">Short-notice penalty</dt>
                <dd>{config?.charges.shortNoticePenalty.enabled ? 'Enabled' : 'Disabled'}</dd>
                <dt className="text-black/50 dark:text-white/50">Open requests</dt>
                <dd>{requests.length}</dd>
              </dl>
            </Card>
          );
        })}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">All move requests</h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-black/50 dark:border-white/10 dark:text-white/50">
              <tr>
                <th className="px-4 py-2 font-medium">Resident</th>
                <th className="px-4 py-2 font-medium">Community</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {communities.flatMap((community) =>
                moveRequestService.listByCommunity(community.id).map((request) => {
                  const resident = residentService.getById(request.residentId);
                  return (
                    <tr
                      key={request.id}
                      className="border-b border-black/5 last:border-0 dark:border-white/5"
                    >
                      <td className="px-4 py-2">
                        {resident ? `${resident.firstName} ${resident.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-2">{community.name}</td>
                      <td className="px-4 py-2 capitalize">{request.type.replace('_', ' ')}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={request.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      </section>
    </main>
  );
}
