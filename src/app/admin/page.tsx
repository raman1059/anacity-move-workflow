import { Card } from '@/components/ui/Card';
import { listAdminIdentities } from '@/features/admin/admin-roles';
import { IdentityCard } from '@/features/admin/components/IdentityCard';

// Step 1 of the admin flow: pick which admin you're acting as. No real
// auth in this prototype (same rule as the resident flows, plan.md
// §2.12) — every CommunityConfiguration.adminPermissions.role across
// every community is a pickable identity here.
export default function AdminIdentityPicker() {
  const identities = listAdminIdentities();
  const byCommunity = new Map<string, typeof identities>();
  for (const identity of identities) {
    const list = byCommunity.get(identity.communityId) ?? [];
    list.push(identity);
    byCommunity.set(identity.communityId, list);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-sm font-medium text-black/50 dark:text-white/50">ANACITY</p>
        <h1 className="mt-1 text-2xl font-semibold">Who are you signing in as?</h1>
        <p className="mt-2 max-w-xl text-sm text-black/60 dark:text-white/60">
          Select an admin role to review move-in and move-out requests. The dashboard covers every
          community — this just sets your default view and your approval authority.
        </p>
      </header>

      {identities.length === 0 ? (
        <Card>No admin roles are configured.</Card>
      ) : (
        <div className="space-y-6">
          {[...byCommunity.entries()].map(([communityId, roles]) => (
            <section key={communityId}>
              <h2 className="mb-3 text-sm font-medium text-black/50 dark:text-white/50">
                {roles[0]?.communityName}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {roles.map((identity) => (
                  <IdentityCard key={identity.adminId} identity={identity} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
