'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { AdminDecision, MoveRequestStatus } from '@/domain';
import { humanizeKey } from '../format';

const DECISION_BUTTON: Record<AdminDecision, { label: string; tone: string }> = {
  approved: {
    label: 'Approve',
    tone: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  rejected: {
    label: 'Reject',
    tone: 'bg-red-600 hover:bg-red-700 text-white',
  },
  requested_info: {
    label: 'Request more info',
    tone: 'border border-black/15 hover:border-blue-400 hover:text-blue-600 dark:border-white/15',
  },
  escalated_further: {
    label: 'Escalate further',
    tone: 'border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30',
  },
};

interface ActionPanelProps {
  decisionActions: AdminDecision[];
  otherActions: MoveRequestStatus[];
  requestType: 'move_in' | 'move_out';
  isFinancialException: boolean;
  canApproveFinancialException: boolean;
  canApproveThisType: boolean;
  pending: boolean;
  onDecision: (decision: AdminDecision, reason?: string) => void;
  onStatusChange: (status: MoveRequestStatus) => void;
}

// The admin's own control surface — deliberately separate from the
// read-only Decision Context panel above it. Every high-impact action
// (approve/reject/request info/escalate further) requires an explicit
// click here; nothing here fires automatically. A reason is shared
// across the four decision buttons (required server-side whenever it
// overrides the agent's recommendation, or for a rejection — see
// record-admin-decision.tool.ts) rather than one field per button.
export function ActionPanel({
  decisionActions,
  otherActions,
  requestType,
  isFinancialException,
  canApproveFinancialException,
  canApproveThisType,
  pending,
  onDecision,
  onStatusChange,
}: ActionPanelProps) {
  const [reason, setReason] = useState('');

  if (decisionActions.length === 0 && otherActions.length === 0) {
    return (
      <Card>
        <h2 className="text-sm font-medium text-black/50 dark:text-white/50">Actions</h2>
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          No admin action is available on this request right now.
        </p>
      </Card>
    );
  }

  const financialBlock =
    decisionActions.includes('approved') && isFinancialException && !canApproveFinancialException;
  const typeBlock = decisionActions.includes('approved') && !canApproveThisType;
  const approveBlocked = financialBlock || typeBlock;

  return (
    <Card>
      <h2 className="text-sm font-medium text-black/50 dark:text-white/50">Actions</h2>

      {typeBlock ? (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Your admin role is not authorized to approve {requestType.replace('_', '-')} requests for
          this community.
        </p>
      ) : null}

      {isFinancialException ? (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Projected deductions exceed this community&apos;s financial-exception threshold.
          {financialBlock
            ? ' Only an admin role with financial-exception authority (e.g. Treasurer) can approve this.'
            : ' Your role is authorized to approve financial exceptions.'}
        </p>
      ) : null}

      {decisionActions.length > 0 ? (
        <>
          <label className="mt-3 block text-xs font-medium text-black/50 dark:text-white/50">
            Reason (required to reject, or to override the agent&apos;s recommendation)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={pending}
              rows={2}
              placeholder="Explain your decision..."
              className="mt-1 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:opacity-50 dark:border-white/15"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {decisionActions.map((decision) => {
              const button = DECISION_BUTTON[decision];
              const disabled = pending || (decision === 'approved' && approveBlocked);
              return (
                <button
                  key={decision}
                  type="button"
                  disabled={disabled}
                  onClick={() => onDecision(decision, reason.trim() || undefined)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${button.tone}`}
                >
                  {button.label}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {otherActions.length > 0 ? (
        <div className="mt-4 border-t border-black/10 pt-3 dark:border-white/10">
          <p className="text-xs font-medium text-black/50 dark:text-white/50">Other actions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {otherActions.map((status) => (
              <button
                key={status}
                type="button"
                disabled={pending}
                onClick={() => onStatusChange(status)}
                className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-black/70 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-white/70"
              >
                {humanizeKey(status)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
