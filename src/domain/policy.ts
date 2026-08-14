import type { CommunityId, PolicyId } from './ids';

export const POLICY_TOPICS = {
  NOTICE_PERIOD: 'notice_period',
  NOTICE_PERIOD_EXCEPTION: 'notice_period_exception',
  SECURITY_DEPOSIT: 'security_deposit',
  MOVE_IN_DOCUMENTS: 'move_in_documents',
  MOVE_OUT_DOCUMENTS: 'move_out_documents',
  INSPECTION_PROCESS: 'inspection_process',
  MOVE_SLOT_BOOKING: 'move_slot_booking',
  DUES_CLEARANCE: 'dues_clearance',
  NOC_REQUIREMENT: 'noc_requirement',
} as const;

// `string & {}` keeps the known topics above autocompleting while still
// allowing a community to define custom topics without a code change —
// the same reason getCommunityPolicy() returns NOT_FOUND instead of
// throwing for a topic it doesn't recognize.
export type PolicyTopic = (typeof POLICY_TOPICS)[keyof typeof POLICY_TOPICS] | (string & {});

export interface CommunityPolicy {
  id: PolicyId;
  communityId: CommunityId;
  topic: PolicyTopic;
  title: string;
  body: string;
  version: number;
  effectiveFrom: string;
}
