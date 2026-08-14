import { describe, expect, it } from 'vitest';
import { GREENFIELD_HEIGHTS_ID, RIVERSIDE_VILLAS_ID, WILLOW_CREEK_ID } from '@/config';
import { createMockRepositories, seedData } from '@/mocks';
import {
  createCommunityService,
  createMoveRequestService,
  createResidentService,
} from '@/services';

describe('move request service', () => {
  const repositories = createMockRepositories(seedData);
  const moveRequestService = createMoveRequestService(repositories);

  it('aggregates a request with resident, unit, documents, checklist, charge, notes, admin reviews, and agent actions', () => {
    const detail = moveRequestService.getDetail('request-gh-005');

    expect(detail?.resident?.id).toBe('resident-vikram-shah');
    expect(detail?.unit?.id).toBe('unit-gh-310');
    expect(detail?.documents.length).toBeGreaterThan(0);
    expect(detail?.checklist.length).toBeGreaterThan(0);
    expect(detail?.charge?.netRefundAmount).toBe(29600);
    // These two fields were added in a later phase (the Administrator
    // Workflow) — asserted explicitly so a future refactor can't
    // silently drop them from the aggregate again.
    expect(detail?.agentActions.length).toBeGreaterThan(0);
    expect(Array.isArray(detail?.adminReviews)).toBe(true);
  });

  it('returns undefined for an unknown request id, rather than throwing', () => {
    expect(moveRequestService.getDetail('request-does-not-exist')).toBeUndefined();
  });

  it('lists requests by community and by resident consistently', () => {
    const byCommunity = moveRequestService.listByCommunity(GREENFIELD_HEIGHTS_ID);
    expect(byCommunity.length).toBeGreaterThan(0);
    expect(byCommunity.every((r) => r.communityId === GREENFIELD_HEIGHTS_ID)).toBe(true);

    const byResident = moveRequestService.listByResident('resident-vikram-shah');
    expect(byResident.some((r) => r.id === 'request-gh-005')).toBe(true);
  });
});

describe('community service', () => {
  const repositories = createMockRepositories(seedData);
  const communityService = createCommunityService(repositories);

  it('lists all 3 communities, including the one added purely as configuration (no seed history)', () => {
    const communities = communityService.listCommunities();
    const ids = communities.map((c) => c.id);
    expect(ids).toContain(GREENFIELD_HEIGHTS_ID);
    expect(ids).toContain(RIVERSIDE_VILLAS_ID);
    expect(ids).toContain(WILLOW_CREEK_ID);
  });

  it('returns undefined, not a thrown error, for an unknown community', () => {
    expect(communityService.getCommunity('community-does-not-exist')).toBeUndefined();
    expect(communityService.getCommunityConfiguration('community-does-not-exist')).toBeUndefined();
  });

  it('returns each community\'s own configuration, not a shared default', () => {
    const gh = communityService.getCommunityConfiguration(GREENFIELD_HEIGHTS_ID);
    const rv = communityService.getCommunityConfiguration(RIVERSIDE_VILLAS_ID);
    expect(gh?.moveOut.noticePeriodDays).not.toBe(rv?.moveOut.noticePeriodDays);
  });
});

describe('resident service', () => {
  const repositories = createMockRepositories(seedData);
  const residentService = createResidentService(repositories);

  it('fetches a resident by id and scopes listByCommunity correctly', () => {
    const priya = residentService.getById('resident-priya-menon');
    expect(priya?.communityId).toBe(GREENFIELD_HEIGHTS_ID);

    const ghResidents = residentService.listByCommunity(GREENFIELD_HEIGHTS_ID);
    expect(ghResidents.every((r) => r.communityId === GREENFIELD_HEIGHTS_ID)).toBe(true);
    expect(ghResidents.some((r) => r.id === 'resident-priya-menon')).toBe(true);
  });

  it('lists residents by unit', () => {
    const occupants = residentService.listByUnit('unit-rv-12');
    expect(occupants.some((r) => r.id === 'resident-meera-iyer')).toBe(true);
  });

  it('returns undefined for an unknown resident id, rather than throwing', () => {
    expect(residentService.getById('resident-does-not-exist')).toBeUndefined();
  });
});
