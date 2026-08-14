import Link from 'next/link';
import { listAdminIdentities } from '@/features/admin/admin-roles';
import { getCommunityService, getResidentService } from '@/lib/container';
import { RoleSwitcher, type ResidentOption } from './RoleSwitcher';

const NAV_LINKS = [
  { href: '/resident', label: 'Resident' },
  { href: '/admin', label: 'Admin' },
  { href: '/demo', label: 'Demo' },
];

// The one persistent piece of chrome in the whole app — every route
// renders this via the root layout. Two jobs: normal navigation (the
// links above) and the role switcher (instant persona jumps for a live
// demo, see RoleSwitcher.tsx) — deliberately kept as two separate,
// clearly distinct controls rather than merged into one, since they
// serve different intents ("browse the real flow" vs. "teleport").
export function AppHeader() {
  const communityService = getCommunityService();
  const residentService = getResidentService();
  const communities = communityService.listCommunities();

  const residents: ResidentOption[] = communities.flatMap((community) =>
    residentService.listByCommunity(community.id).map((resident) => ({
      id: resident.id,
      communityId: community.id,
      communityName: community.name,
      name: `${resident.firstName} ${resident.lastName}`,
      // Prospective residents are mid move-in; everyone else (active,
      // moved_out) is routed to the move-out workspace — the same
      // status-driven split the resident/community pickers already use.
      workflow: resident.status === 'prospective' ? ('move_in' as const) : ('move_out' as const),
    }))
  );

  const identities = listAdminIdentities();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            ANACITY
          </Link>
          <nav className="flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <RoleSwitcher residents={residents} identities={identities} />
      </div>
    </header>
  );
}
