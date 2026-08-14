import type { CommunityPolicy } from '../../domain';
import { POLICY_TOPICS } from '../../domain';
import { WILLOW_CREEK_ID } from '../communities/willow-creek';

// Deliberately sparse — Willow Creek only defines policy for the topics
// that actually apply to it (no NOC, no inspection, no dues, so no
// policy clauses exist for those topics either). getCommunityPolicy
// already returns [] for an undefined topic rather than throwing or
// guessing (see get-community-policy.tool.ts) — a lightweight community
// doesn't need placeholder policy text it will never use.
export const willowCreekPolicies: CommunityPolicy[] = [
  {
    id: 'policy-wc-notice-period',
    communityId: WILLOW_CREEK_ID,
    topic: POLICY_TOPICS.NOTICE_PERIOD,
    title: 'Move-Out Notice Period',
    body: 'Residents must provide at least 3 days written notice before their intended move-out date. A $15/day late-notice fee applies for each day short.',
    version: 1,
    effectiveFrom: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'policy-wc-move-in-documents',
    communityId: WILLOW_CREEK_ID,
    topic: POLICY_TOPICS.MOVE_IN_DOCUMENTS,
    title: 'Move-In Document Requirements',
    body: 'All incoming residents must submit government-issued ID proof. No lease, deed, or NOC is required.',
    version: 1,
    effectiveFrom: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'policy-wc-move-out-documents',
    communityId: WILLOW_CREEK_ID,
    topic: POLICY_TOPICS.MOVE_OUT_DOCUMENTS,
    title: 'Move-Out Document Requirements',
    body: 'Residents must complete a key return form on the day of move-out. No forwarding address or dues clearance form is required.',
    version: 1,
    effectiveFrom: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'policy-wc-security-deposit',
    communityId: WILLOW_CREEK_ID,
    topic: POLICY_TOPICS.SECURITY_DEPOSIT,
    title: 'Security Deposit & Deductions',
    body: 'The $500 security deposit is refundable in full less a $15/day late-notice fee for any days short of the 3-day notice requirement.',
    version: 1,
    effectiveFrom: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'policy-wc-slot-booking',
    communityId: WILLOW_CREEK_ID,
    topic: POLICY_TOPICS.MOVE_SLOT_BOOKING,
    title: 'Move Slot Booking',
    body: 'The common lobby cart may be booked up to 3 days in advance, up to 3 households at a time. No blackout dates.',
    version: 1,
    effectiveFrom: '2026-02-01T00:00:00.000Z',
  },
];
