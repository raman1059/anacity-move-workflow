import type { CommunityPolicy } from '../../domain';
import { POLICY_TOPICS } from '../../domain';
import { GREENFIELD_HEIGHTS_ID } from '../communities/greenfield-heights';

// Greenfield Heights defines a notice_period_exception clause; Riverside
// Villas (see riverside-villas.policies.ts) deliberately does not. That gap
// is what forces the "ambiguous policy" agent trace to escalate instead of
// guessing — see plan.md §4.9(e).
export const greenfieldHeightsPolicies: CommunityPolicy[] = [
  {
    id: 'policy-gh-notice-period',
    communityId: GREENFIELD_HEIGHTS_ID,
    topic: POLICY_TOPICS.NOTICE_PERIOD,
    title: 'Move-Out Notice Period',
    body: 'Residents must provide a minimum of 30 days written notice before their intended move-out date. Requests submitted with less notice are subject to a short-notice penalty of ₹500 per day short, in addition to any other applicable deductions.',
    version: 2,
    effectiveFrom: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'policy-gh-notice-period-exception',
    communityId: GREENFIELD_HEIGHTS_ID,
    topic: POLICY_TOPICS.NOTICE_PERIOD_EXCEPTION,
    title: 'Notice Period Exceptions',
    body: "Exceptions to the 30-day notice requirement may be granted by the Treasurer on a case-by-case basis for documented emergencies (medical, employment relocation, etc.). The short-notice penalty may still apply at the Treasurer's discretion. Agent systems may not grant exceptions automatically and must escalate all exception requests.",
    version: 1,
    effectiveFrom: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'policy-gh-security-deposit',
    communityId: GREENFIELD_HEIGHTS_ID,
    topic: POLICY_TOPICS.SECURITY_DEPOSIT,
    title: 'Security Deposit & Deductions',
    body: 'The security deposit (₹50,000 standard) is refundable in full less any outstanding dues, applicable penalties, and a standard ₹2,000 cleaning fee. Deductions are itemized and communicated to the resident prior to final settlement.',
    version: 2,
    effectiveFrom: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'policy-gh-move-in-documents',
    communityId: GREENFIELD_HEIGHTS_ID,
    topic: POLICY_TOPICS.MOVE_IN_DOCUMENTS,
    title: 'Move-In Document Requirements',
    body: 'All incoming residents must submit government-issued ID proof and a Society NOC. Tenants must additionally submit a lease agreement; owners must submit the ownership deed. Vehicle registration is required only if a parking allocation is requested.',
    version: 1,
    effectiveFrom: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'policy-gh-move-out-documents',
    communityId: GREENFIELD_HEIGHTS_ID,
    topic: POLICY_TOPICS.MOVE_OUT_DOCUMENTS,
    title: 'Move-Out Document Requirements',
    body: 'Residents must submit a dues clearance acknowledgement, forwarding address proof, and a completed key return form prior to move-out approval.',
    version: 1,
    effectiveFrom: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'policy-gh-inspection',
    communityId: GREENFIELD_HEIGHTS_ID,
    topic: POLICY_TOPICS.INSPECTION_PROCESS,
    title: 'Exit Inspection',
    body: 'A physical exit inspection of the unit is mandatory for all move-outs and must be scheduled at least 3 business days before the move-out date. Any damage identified is itemized against the security deposit.',
    version: 1,
    effectiveFrom: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'policy-gh-noc',
    communityId: GREENFIELD_HEIGHTS_ID,
    topic: POLICY_TOPICS.NOC_REQUIREMENT,
    title: 'Society NOC',
    body: 'A No Objection Certificate from the Society office is mandatory for all move-ins and must be issued within 15 days of application.',
    version: 1,
    effectiveFrom: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'policy-gh-dues',
    communityId: GREENFIELD_HEIGHTS_ID,
    topic: POLICY_TOPICS.DUES_CLEARANCE,
    title: 'Dues Clearance',
    body: 'All outstanding maintenance and utility dues must be cleared, or explicitly itemized as a deduction, before a move-out request can be approved.',
    version: 1,
    effectiveFrom: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'policy-gh-slot-booking',
    communityId: GREENFIELD_HEIGHTS_ID,
    topic: POLICY_TOPICS.MOVE_SLOT_BOOKING,
    title: 'Move Slot Booking',
    body: 'Service elevator and loading dock slots must be booked at least 5 days in advance and are limited to one active booking per unit at a time. Bookings are unavailable on designated blackout dates.',
    version: 1,
    effectiveFrom: '2026-04-01T00:00:00.000Z',
  },
];
