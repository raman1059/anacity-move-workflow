// Mocked admin identity — no real auth (see plan.md §2.12, same rule as
// the resident flows). A generic derivation, not hardcoded per
// community, so a newly-added community gets a sensible short code for
// free. Deliberately reproduces the exact `adminId` values already used
// in mocks/data/adminReviews.ts (community-greenfield-heights -> 'gh',
// community-riverside-villas -> 'rv') so the identity picker attributes
// pre-seeded reviews correctly instead of orphaning them.
export function communityShortCode(communityId: string): string {
  return communityId
    .replace(/^community-/, '')
    .split('-')
    .filter(Boolean)
    .map((segment) => segment[0])
    .join('');
}

export function buildAdminId(communityId: string, roleKey: string): string {
  return `admin-${communityShortCode(communityId)}-${roleKey.replace(/_/g, '-')}`;
}
