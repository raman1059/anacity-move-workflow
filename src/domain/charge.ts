import type { ChargeId, RequestId } from './ids';
import type { ChargeStatus } from './enums';

export interface ChargeLineItem {
  key: string;
  label: string;
  // Negative = deduction, positive = credit
  amount: number;
  reason: string;
}

export interface Charge {
  id: ChargeId;
  requestId: RequestId;
  currency: string;
  securityDepositAmount: number;
  lineItems: ChargeLineItem[];
  totalDeductions: number;
  netRefundAmount: number;
  // 'projected' = agent-computed, informational only. 'admin_confirmed' =
  // finalized by an admin action. No code path lets the agent set this to
  // 'admin_confirmed' itself — see calculateMoveOutCharges in plan.md §4.2.
  status: ChargeStatus;
  computedAt: string;
  confirmedBy?: { actorId: string; actorRole: 'admin' };
  confirmedAt?: string;
}
