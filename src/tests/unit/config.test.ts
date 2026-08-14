import { describe, expect, it } from 'vitest';
import { GREENFIELD_HEIGHTS_ID, RIVERSIDE_VILLAS_ID, WILLOW_CREEK_ID } from '@/config';
import { createMockRepositories, seedData } from '@/mocks';

describe('community configuration', () => {
  const repositories = createMockRepositories(seedData);

  it('seeds exactly 3 communities, each with its own configuration', () => {
    const communities = repositories.communities.list();
    expect(communities).toHaveLength(3);
    for (const community of communities) {
      expect(repositories.communities.getConfiguration(community.id)).toBeDefined();
    }
  });

  it('applies different notice periods per community — config-driven, not hardcoded', () => {
    const gh = repositories.communities.getConfiguration(GREENFIELD_HEIGHTS_ID);
    const rv = repositories.communities.getConfiguration(RIVERSIDE_VILLAS_ID);
    const wc = repositories.communities.getConfiguration(WILLOW_CREEK_ID);
    expect(gh?.moveOut.noticePeriodDays).toBe(30);
    expect(rv?.moveOut.noticePeriodDays).toBe(14);
    expect(wc?.moveOut.noticePeriodDays).toBe(3);
  });

  it('applies different inspection and short-notice-penalty rules per community', () => {
    const gh = repositories.communities.getConfiguration(GREENFIELD_HEIGHTS_ID);
    const rv = repositories.communities.getConfiguration(RIVERSIDE_VILLAS_ID);
    expect(gh?.moveOut.requiresInspection).toBe(true);
    expect(rv?.moveOut.requiresInspection).toBe(false);
    expect(gh?.charges.shortNoticePenalty.enabled).toBe(true);
    expect(rv?.charges.shortNoticePenalty.enabled).toBe(false);
  });

  it('lets a third community use a wholly different deduction strategy and currency', () => {
    const wc = repositories.communities.getConfiguration(WILLOW_CREEK_ID);
    expect(wc?.charges.currency).toBe('USD');
    expect(wc?.charges.shortNoticePenalty.enabled).toBe(false);
    expect(wc?.charges.deductions[0]?.calculation).toBe('per_day_short_notice');
    expect(wc?.moveIn.allowedResidentTypes).toEqual(['tenant']);
    expect(wc?.autonomy.allowAutoStatusAdvance).toBe(false);
  });

  it('returns [] rather than throwing when a policy topic is undefined for a community', () => {
    const rvException = repositories.policies.findByTopic(
      RIVERSIDE_VILLAS_ID,
      'notice_period_exception'
    );
    expect(rvException).toHaveLength(0);

    const ghException = repositories.policies.findByTopic(
      GREENFIELD_HEIGHTS_ID,
      'notice_period_exception'
    );
    expect(ghException).toHaveLength(1);
  });
});
