import { Card } from '@/components/ui/Card';
import { formatDateTime } from '../../shared/format';
import { formatPercent } from '../format';
import type { RequestDetailData } from '../types';

const RECOMMENDATION_LABEL: Record<string, string> = {
  approve: 'Approve',
  reject: 'Reject',
  request_info: 'Request more info',
  approve_with_charges: 'Approve, with charges',
};

const DECISION_LABEL: Record<string, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  requested_info: 'Requested more info',
  escalated_further: 'Escalated further',
};

// The visual core of "create a clear distinction between agent
// recommendation vs. administrator decision" — two clearly-labeled,
// side-by-side panels, never merged into one ambiguous verdict. An
// administrator decision that differs from the recommendation is
// flagged explicitly rather than left for the reader to notice.
export function RecommendationVsDecisionCard({ data }: { data: RequestDetailData }) {
  const latestReview = [...data.adminReviews].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  )[0];

  return (
    <Card>
      <h2 className="text-sm font-medium text-black/50 dark:text-white/50">
        Agent recommendation vs. administrator decision
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
          <p className="text-xs font-medium tracking-wide text-blue-700 uppercase dark:text-blue-300">
            Agent recommendation
          </p>
          {data.latestRecommendation ? (
            <div className="mt-1.5 space-y-1 text-sm">
              <p className="font-medium">
                {RECOMMENDATION_LABEL[data.latestRecommendation.action] ??
                  data.latestRecommendation.action}
              </p>
              <p className="text-black/70 dark:text-white/70">{data.latestRecommendation.rationale}</p>
              <p className="text-xs text-black/45 dark:text-white/45">
                Confidence {formatPercent(data.latestRecommendation.confidence)} &middot;{' '}
                {formatDateTime(data.latestRecommendation.createdAt)}
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-black/50 dark:text-white/50">
              The agent has not recommended an outcome — it escalated this directly.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <p className="text-xs font-medium tracking-wide text-emerald-700 uppercase dark:text-emerald-300">
            Administrator decision
          </p>
          {latestReview ? (
            <div className="mt-1.5 space-y-1 text-sm">
              <p className="font-medium">
                {DECISION_LABEL[latestReview.decision] ?? latestReview.decision}
                {latestReview.overrodeRecommendation ? (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                    OVERRODE RECOMMENDATION
                  </span>
                ) : null}
              </p>
              {latestReview.reason ? (
                <p className="text-black/70 dark:text-white/70">{latestReview.reason}</p>
              ) : null}
              <p className="text-xs text-black/45 dark:text-white/45">
                {latestReview.adminId} &middot; {formatDateTime(latestReview.createdAt)}
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-black/50 dark:text-white/50">
              No administrator decision has been recorded yet.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
