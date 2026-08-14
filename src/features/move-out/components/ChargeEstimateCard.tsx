import { Card } from '@/components/ui/Card';
import type { ChargeCalculationResult } from '@/lib/policy-engine';

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${Math.abs(Math.round(amount)).toLocaleString()}`;
}

// A live projection, computed deterministically from community
// configuration (lib/policy-engine.ts) — never a guess, and never final
// until a community admin confirms it. Shown from the moment a move-out
// request exists so charges are never a surprise late in the process.
export function ChargeEstimateCard({ estimate }: { estimate: ChargeCalculationResult }) {
  return (
    <Card>
      <h2 className="text-sm font-medium text-black/50 dark:text-white/50">
        Projected settlement
      </h2>

      <dl className="mt-3 flex items-center justify-between text-sm">
        <dt className="text-black/50 dark:text-white/50">Security deposit</dt>
        <dd>{formatAmount(estimate.securityDepositAmount, estimate.currency)}</dd>
      </dl>

      {estimate.lineItems.length > 0 ? (
        <ul className="mt-2 space-y-1.5 border-t border-black/10 pt-2 dark:border-white/10">
          {estimate.lineItems.map((item) => (
            <li key={item.key} className="text-sm">
              <div className="flex items-center justify-between">
                <span className="text-black/70 dark:text-white/70">{item.label}</span>
                <span className="text-red-600 dark:text-red-400">
                  -{formatAmount(item.amount, estimate.currency)}
                </span>
              </div>
              <p className="text-xs text-black/45 dark:text-white/45">{item.reason}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 border-t border-black/10 pt-2 text-xs text-black/50 dark:border-white/10 dark:text-white/50">
          No deductions currently apply.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-2 text-sm font-medium dark:border-white/10">
        <span>Estimated net refund</span>
        <span>{formatAmount(estimate.netRefundAmount, estimate.currency)}</span>
      </div>

      <p className="mt-3 text-[11px] text-black/35 dark:text-white/35">
        This is a projection pending final admin confirmation. Charges can only be waived or
        adjusted by a community admin — ask the agent and it will route the request for you.
      </p>
    </Card>
  );
}
