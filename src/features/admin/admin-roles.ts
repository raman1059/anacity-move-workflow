import { buildAdminId } from '@/lib/admin-identity';
import { getCommunityService } from '@/lib/container';
import type { AdminIdentity } from './types';

// Flattens every community's own AdminRole definitions
// (CommunityConfiguration.adminPermissions.roles) into pickable
// identities for the mocked-auth picker — no separate "admin accounts"
// table exists anywhere in the domain model, by design (see plan.md
// §2.12). adminId reproduces the exact convention already used in
// mocks/data/adminReviews.ts.
export function listAdminIdentities(): AdminIdentity[] {
  const communityService = getCommunityService();
  const communities = communityService.listCommunities();

  const identities: AdminIdentity[] = [];
  for (const community of communities) {
    const config = communityService.getCommunityConfiguration(community.id);
    if (!config) continue;
    for (const role of config.adminPermissions.roles) {
      identities.push({
        communityId: community.id,
        communityName: community.name,
        roleKey: role.key,
        roleLabel: role.label,
        adminId: buildAdminId(community.id, role.key),
        canApproveMoveIn: role.canApproveMoveIn,
        canApproveMoveOut: role.canApproveMoveOut,
        canApproveFinancialException: role.canApproveFinancialException,
        canOverrideAgent: role.canOverrideAgent,
      });
    }
  }
  return identities;
}
