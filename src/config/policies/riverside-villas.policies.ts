import type { CommunityPolicy } from '../../domain';
import { POLICY_TOPICS } from '../../domain';
import { RIVERSIDE_VILLAS_ID } from '../communities/riverside-villas';

// Deliberately no notice_period_exception clause here — see
// greenfield-heights.policies.ts for the contrasting community that does
// define one. The gap is what drives the ambiguous-policy escalation trace.
export const riversideVillasPolicies: CommunityPolicy[] = [
  {
    id: 'policy-rv-notice-period',
    communityId: RIVERSIDE_VILLAS_ID,
    topic: POLICY_TOPICS.NOTICE_PERIOD,
    title: 'Move-Out Notice Period',
    body: 'Residents must provide at least 14 days written notice before their intended move-out date.',
    version: 1,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'policy-rv-security-deposit',
    communityId: RIVERSIDE_VILLAS_ID,
    topic: POLICY_TOPICS.SECURITY_DEPOSIT,
    title: 'Security Deposit',
    body: 'The security deposit (₹20,000 standard) is refundable in full less any outstanding dues. No standard cleaning or short-notice fees apply at Riverside Villas.',
    version: 1,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'policy-rv-move-in-documents',
    communityId: RIVERSIDE_VILLAS_ID,
    topic: POLICY_TOPICS.MOVE_IN_DOCUMENTS,
    title: 'Move-In Document Requirements',
    body: 'Incoming residents must submit government ID proof. Tenants must submit a lease agreement; owners must submit the ownership deed.',
    version: 1,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'policy-rv-move-out-documents',
    communityId: RIVERSIDE_VILLAS_ID,
    topic: POLICY_TOPICS.MOVE_OUT_DOCUMENTS,
    title: 'Move-Out Document Requirements',
    body: 'A dues clearance acknowledgement is required before move-out approval. Forwarding address proof is optional.',
    version: 1,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'policy-rv-dues',
    communityId: RIVERSIDE_VILLAS_ID,
    topic: POLICY_TOPICS.DUES_CLEARANCE,
    title: 'Dues Clearance',
    body: 'Outstanding dues must be cleared before a move-out request is approved. Repeated non-response to dues reminders may result in rejection of the request.',
    version: 1,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'policy-rv-slot-booking',
    communityId: RIVERSIDE_VILLAS_ID,
    topic: POLICY_TOPICS.MOVE_SLOT_BOOKING,
    title: 'Move Slot Booking',
    body: 'Driveway loading area slots must be booked at least 2 days in advance.',
    version: 1,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
  },
];
