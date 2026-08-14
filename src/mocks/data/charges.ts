import type { Charge } from '../../domain';

export const charges: Charge[] = [
  // Ananya Rao — clean move-out, no deductions, already confirmed by admin
  // alongside approval.
  {
    id: 'charge-gh-004',
    requestId: 'request-gh-004',
    currency: 'INR',
    securityDepositAmount: 50000,
    lineItems: [],
    totalDeductions: 0,
    netRefundAmount: 50000,
    status: 'admin_confirmed',
    computedAt: '2026-07-16T14:10:00.000Z',
    confirmedBy: { actorId: 'admin-gh-facility-manager', actorRole: 'admin' },
    confirmedAt: '2026-07-17T09:30:00.000Z',
  },
  // Vikram Shah — short-notice move-out plus outstanding dues, still
  // 'projected': computed by the agent and shown to the resident as an
  // estimate, but not finalized — that requires admin confirmation.
  {
    id: 'charge-gh-005',
    requestId: 'request-gh-005',
    currency: 'INR',
    securityDepositAmount: 50000,
    lineItems: [
      {
        key: 'short_notice_penalty',
        label: 'Short Notice Penalty',
        amount: -10000,
        reason:
          'Notice period requires 30 days (policy-gh-notice-period); only 10 days given. 20 days short × ₹500/day.',
      },
      {
        key: 'outstanding_dues',
        label: 'Outstanding Maintenance Dues (Jun-Jul 2026)',
        amount: -8400,
        reason: 'Unpaid maintenance dues flagged during the dues clearance check.',
      },
      {
        key: 'cleaning_fee',
        label: 'Standard Cleaning Fee',
        amount: -2000,
        reason: 'Standard move-out cleaning fee per community charge policy.',
      },
    ],
    totalDeductions: 20400,
    netRefundAmount: 29600,
    status: 'projected',
    computedAt: '2026-08-13T09:05:00.000Z',
  },
  // Imran Qureshi — dues never cleared; this projection is what drove the
  // admin's rejection decision, and was never finalized since the request
  // did not proceed.
  {
    id: 'charge-rv-003',
    requestId: 'request-rv-003',
    currency: 'INR',
    securityDepositAmount: 20000,
    lineItems: [
      {
        key: 'outstanding_dues',
        label: 'Outstanding Dues',
        amount: -18400,
        reason: 'Unresolved dues after two reminder cycles — primary reason for rejection.',
      },
    ],
    totalDeductions: 18400,
    netRefundAmount: 1600,
    status: 'projected',
    computedAt: '2026-08-06T12:30:00.000Z',
  },
];
