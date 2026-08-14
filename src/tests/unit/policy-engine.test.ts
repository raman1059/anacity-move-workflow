import { describe, expect, it } from 'vitest';
import { greenfieldHeightsConfiguration, riversideVillasConfiguration } from '@/config';
import type { CommunityConfiguration, MoveOutRequest, Resident } from '@/domain';
import { seedData } from '@/mocks';
import {
  calculateMoveOutCharges,
  validateMoveRequest,
  validateMoveRequestDocuments,
} from '@/lib/policy-engine';

function findResident(id: string): Resident {
  const resident = seedData.residents.find((r) => r.id === id);
  if (!resident) throw new Error(`fixture resident ${id} not found`);
  return resident;
}

function shortNoticeMoveOut(
  communityId: string,
  residentId: string,
  unitId: string
): MoveOutRequest {
  return {
    id: 'request-fixture-short-notice',
    type: 'move_out',
    communityId,
    residentId,
    unitId,
    status: 'submitted',
    requestedDate: '2026-08-11',
    noticeGivenAt: '2026-08-01T00:00:00.000Z', // 10 days notice
    documentIds: [],
    checklistItemIds: [],
    createdBy: { actorId: residentId, actorRole: 'resident' },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

describe('validateMoveRequest', () => {
  it('flags a missing occupant count on a move-in as missingFields, not a policy violation', () => {
    const priya = findResident('resident-priya-menon');
    const request = seedData.moveRequests.find((r) => r.id === 'request-gh-003')!; // Divya's draft, no occupantCount
    const divya = findResident('resident-divya-nair');
    const result = validateMoveRequest(request, divya, greenfieldHeightsConfiguration);
    expect(result.missingFields).toContain('occupantCount');
    expect(result.valid).toBe(false);
    void priya;
  });

  it('flags an occupant count over the community max as a policy violation', () => {
    const rohan = findResident('resident-rohan-gupta');
    const base = seedData.moveRequests.find((r) => r.id === 'request-gh-002')!;
    const oversized = { ...base, occupantCount: 999 };
    const result = validateMoveRequest(oversized, rohan, greenfieldHeightsConfiguration);
    expect(result.violatedPolicies).toContain('max_occupants_exceeded');
  });

  it('flags short move-out notice as a policy violation, distinct from missing data', () => {
    const vikram = findResident('resident-vikram-shah');
    const request = seedData.moveRequests.find((r) => r.id === 'request-gh-005')! as MoveOutRequest; // 10 days notice
    const result = validateMoveRequest(request, vikram, greenfieldHeightsConfiguration);
    expect(result.missingFields).toEqual([]);
    expect(result.violatedPolicies).toContain('notice_period_short');
  });

  it('passes a move-out with sufficient notice cleanly', () => {
    const ananya = findResident('resident-ananya-rao');
    const request = seedData.moveRequests.find((r) => r.id === 'request-gh-004')!; // 36 days notice
    const result = validateMoveRequest(request, ananya, greenfieldHeightsConfiguration);
    expect(result.valid).toBe(true);
  });

  it('same shortfall produces a different violation label depending on community config (config-driven, not hardcoded)', () => {
    const meera = findResident('resident-meera-iyer');
    const ghRequest = shortNoticeMoveOut('community-greenfield-heights', meera.id, 'unit-x');
    const rvRequest = shortNoticeMoveOut('community-riverside-villas', meera.id, 'unit-x');

    const ghResult = validateMoveRequest(ghRequest, meera, greenfieldHeightsConfiguration);
    const rvResult = validateMoveRequest(rvRequest, meera, riversideVillasConfiguration);

    // GH allows early move with a penalty; RV does not permit it at all.
    expect(ghResult.violatedPolicies).toContain('notice_period_short');
    expect(rvResult.violatedPolicies).toContain('notice_period_short_not_permitted');
  });
});

describe('validateMoveRequestDocuments', () => {
  it('reports the missing NOC for an incomplete move-in', () => {
    const priya = findResident('resident-priya-menon');
    const request = seedData.moveRequests.find((r) => r.id === 'request-gh-001')!;
    const docs = seedData.documents.filter((d) => d.requestId === request.id);
    const result = validateMoveRequestDocuments(
      request,
      priya,
      greenfieldHeightsConfiguration,
      docs
    );
    expect(result.allRequiredVerified).toBe(false);
    expect(result.missingKeys).toContain('society_noc');
  });

  it('reports all-verified for a clean move-in', () => {
    const rohan = findResident('resident-rohan-gupta');
    const request = seedData.moveRequests.find((r) => r.id === 'request-gh-002')!;
    const docs = seedData.documents.filter((d) => d.requestId === request.id);
    const result = validateMoveRequestDocuments(
      request,
      rohan,
      greenfieldHeightsConfiguration,
      docs
    );
    expect(result.allRequiredVerified).toBe(true);
    expect(result.missingKeys).toEqual([]);
  });

  it('marks a document not applicable to the resident type as not required (owner does not need a lease agreement)', () => {
    const rohan = findResident('resident-rohan-gupta'); // owner
    const request = seedData.moveRequests.find((r) => r.id === 'request-gh-002')!;
    const docs = seedData.documents.filter((d) => d.requestId === request.id);
    const result = validateMoveRequestDocuments(
      request,
      rohan,
      greenfieldHeightsConfiguration,
      docs
    );
    const leaseItem = result.items.find((i) => i.key === 'lease_agreement');
    expect(leaseItem?.required).toBe(false);
    expect(leaseItem?.status).toBe('not_applicable');
  });

  it('the symmetric case: a tenant does not need an ownership deed', () => {
    const priya = findResident('resident-priya-menon'); // tenant
    const request = seedData.moveRequests.find((r) => r.id === 'request-gh-001')!;
    const docs = seedData.documents.filter((d) => d.requestId === request.id);
    const result = validateMoveRequestDocuments(
      request,
      priya,
      greenfieldHeightsConfiguration,
      docs
    );
    const deedItem = result.items.find((i) => i.key === 'ownership_deed');
    expect(deedItem?.required).toBe(false);
    expect(deedItem?.status).toBe('not_applicable');
  });
});

describe('calculateMoveOutCharges', () => {
  it('computes short-notice penalty plus flat deductions from config alone (Greenfield Heights)', () => {
    const request = shortNoticeMoveOut('community-greenfield-heights', 'resident-x', 'unit-x');
    const result = calculateMoveOutCharges(request, greenfieldHeightsConfiguration);

    const penalty = result.lineItems.find((i) => i.key === 'short_notice_penalty');
    expect(penalty?.amount).toBe(-10000); // 20 days short x 500/day
    const cleaning = result.lineItems.find((i) => i.key === 'cleaning_fee');
    expect(cleaning?.amount).toBe(-2000);
    expect(result.totalDeductions).toBe(12000);
    expect(result.netRefundAmount).toBe(38000);
  });

  it('the identical shortfall produces zero deductions at a differently-configured community (Riverside Villas)', () => {
    const request = shortNoticeMoveOut('community-riverside-villas', 'resident-x', 'unit-x');
    const result = calculateMoveOutCharges(request, riversideVillasConfiguration);

    expect(result.lineItems).toEqual([]);
    expect(result.totalDeductions).toBe(0);
    expect(result.netRefundAmount).toBe(result.securityDepositAmount);
  });

  it('never invents a dues-outstanding figure — only computes what config defines', () => {
    const request = seedData.moveRequests.find((r) => r.id === 'request-gh-005')! as MoveOutRequest;
    const result = calculateMoveOutCharges(request, greenfieldHeightsConfiguration);
    expect(result.lineItems.some((i) => i.key === 'outstanding_dues')).toBe(false);
  });

  it('computes a percentage-of-deposit deduction — the one DeductionRule.calculation variant no seeded community exercises', () => {
    // Willow Creek uses per_day_short_notice, Greenfield Heights uses
    // flat, Riverside Villas uses none — percentage_of_deposit is a real,
    // implemented branch (lib/policy-engine.ts) with zero prior coverage.
    const configWithPercentageFee: CommunityConfiguration = {
      ...greenfieldHeightsConfiguration,
      charges: {
        ...greenfieldHeightsConfiguration.charges,
        shortNoticePenalty: { enabled: false, perDayAmount: 0 },
        deductions: [
          {
            key: 'admin_fee',
            label: 'Administrative Fee',
            calculation: 'percentage_of_deposit',
            amount: 10,
          },
        ],
      },
    };
    const request = shortNoticeMoveOut('community-greenfield-heights', 'resident-x', 'unit-x');
    const result = calculateMoveOutCharges(request, configWithPercentageFee);

    const fee = result.lineItems.find((i) => i.key === 'admin_fee');
    expect(fee?.amount).toBe(-5000); // 10% of the 50,000 deposit
    expect(fee?.reason).toContain('10%');
    expect(result.totalDeductions).toBe(5000);
    expect(result.netRefundAmount).toBe(45000);
  });
});
