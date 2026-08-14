import { describe, expect, it } from 'vitest';
import { buildAdminId, communityShortCode } from '@/lib/admin-identity';

describe('communityShortCode', () => {
  it('reproduces the short codes already used in seed data', () => {
    expect(communityShortCode('community-greenfield-heights')).toBe('gh');
    expect(communityShortCode('community-riverside-villas')).toBe('rv');
  });

  it('derives generically for a community not hardcoded anywhere', () => {
    expect(communityShortCode('community-lakeside-towers')).toBe('lt');
  });
});

describe('buildAdminId', () => {
  it('reproduces the exact admin ids already present in mocks/data/adminReviews.ts', () => {
    expect(buildAdminId('community-greenfield-heights', 'facility_manager')).toBe(
      'admin-gh-facility-manager'
    );
    expect(buildAdminId('community-riverside-villas', 'community_manager')).toBe(
      'admin-rv-community-manager'
    );
  });

  it('converts underscores to dashes in the role key', () => {
    expect(buildAdminId('community-greenfield-heights', 'treasurer')).toBe('admin-gh-treasurer');
  });
});
