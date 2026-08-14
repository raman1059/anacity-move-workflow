import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { formatDate } from '../../shared/format';
import { toneClasses } from '../../shared/status-copy';
import { formatPercent, humanizeField, humanizeKey } from '../format';
import type { RequestDetailData } from '../types';

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-black/10 py-3 first:border-t-0 first:pt-0 dark:border-white/10">
      <h3 className="text-xs font-medium tracking-wide text-black/50 uppercase dark:text-white/50">
        {label}
      </h3>
      <div className="mt-1.5 text-sm text-black/80 dark:text-white/80">{children}</div>
    </div>
  );
}

const DECISION_LABEL: Record<string, string> = {
  approved: 'Approve',
  rejected: 'Reject',
  requested_info: 'Request more info',
  escalated_further: 'Escalate further',
};

// The 8-part panel required by the spec, rendered as one scannable card.
// "Agent recommendation" here is a one-line summary only — the full
// recommendation-vs-decision comparison lives in
// RecommendationVsDecisionCard, so the distinction the spec asks for
// gets its own dedicated, more prominent surface rather than being
// buried as one bullet among eight.
export function DecisionContextPanel({ data }: { data: RequestDetailData }) {
  const { request, unit, validation, documentValidation, chargeEstimate } = data;

  const requestedSummary =
    request.type === 'move_in'
      ? `Move-in to Unit ${unit?.unitNumber ?? '—'}, requested for ${formatDate(request.requestedDate)}${
          request.occupantCount !== undefined ? ` — ${request.occupantCount} occupant(s)` : ''
        }.`
      : `Move-out from Unit ${unit?.unitNumber ?? '—'}, intended for ${formatDate(request.requestedDate)}${
          request.reasonForMoveOut ? ` — ${request.reasonForMoveOut}` : ''
        }.`;

  const providedItems: string[] = [
    `${data.resident?.firstName} ${data.resident?.lastName} (${data.resident?.residentType})`,
    ...data.documents
      .filter((d) => d.status === 'verified')
      .map((d) => `${d.label}: verified`),
  ];
  if (request.type === 'move_in' && request.occupantCount !== undefined) {
    providedItems.push(`Occupant count: ${request.occupantCount}`);
  }
  if (request.type === 'move_out' && request.forwardingAddress) {
    providedItems.push(`Forwarding address on file`);
  }

  const missingItems = [
    ...validation.missingFields.map(humanizeField),
    ...documentValidation.items
      .filter((i) => i.required && i.status !== 'verified')
      .map((i) => i.label),
  ];

  const validatedItems = [
    ...validation.violatedPolicies.map((p) => `Violation: ${humanizeKey(p)}`),
    ...validation.warnings.map((w) => `Warning: ${humanizeKey(w)}`),
    `Documents: ${documentValidation.items.filter((i) => i.status === 'verified').length}/${documentValidation.items.filter((i) => i.required).length} verified`,
  ];
  if (chargeEstimate) {
    validatedItems.push(
      chargeEstimate.lineItems.length > 0
        ? `Projected deductions: ${chargeEstimate.totalDeductions} ${chargeEstimate.currency}`
        : 'No deductions apply'
    );
  }

  const availableActions = [
    ...data.decisionActions.map((d) => DECISION_LABEL[d] ?? d),
    ...data.otherActions.map((s) => humanizeKey(s)),
  ];

  return (
    <Card>
      <h2 className="text-sm font-medium text-black/50 dark:text-white/50">Decision Context</h2>

      <Section label="What is being requested">{requestedSummary}</Section>

      <Section label="What the policy says">
        {data.citedPolicies.length > 0 ? (
          <div className="space-y-2">
            {data.citedPolicies.map((p) => (
              <p key={p.id}>
                <span className="font-medium">{p.title}:</span> {p.body}
              </p>
            ))}
          </div>
        ) : data.relevantPolicies.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-black/45 dark:text-white/45">
              No policy was specifically cited yet — showing generally relevant policy instead.
            </p>
            {data.relevantPolicies.map((p) => (
              <p key={p.id}>
                <span className="font-medium">{p.title}:</span> {p.body}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-black/50 dark:text-white/50">No policy is defined for this yet.</p>
        )}
      </Section>

      <Section label="What information was provided">
        <ul className="list-inside list-disc space-y-0.5">
          {providedItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section label="What is missing">
        {missingItems.length > 0 ? (
          <ul className="list-inside list-disc space-y-0.5 text-amber-700 dark:text-amber-400">
            {missingItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-emerald-700 dark:text-emerald-400">Nothing outstanding.</p>
        )}
      </Section>

      <Section label="What the agent validated">
        <ul className="list-inside list-disc space-y-0.5">
          {validatedItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section label="Agent recommendation">
        {data.latestRecommendation ? (
          <p>
            <span className="font-medium">{DECISION_LABEL[data.latestRecommendation.action] ?? data.latestRecommendation.action}</span>{' '}
            — confidence {formatPercent(data.latestRecommendation.confidence)}. {data.latestRecommendation.rationale}
          </p>
        ) : (
          <p className="text-black/50 dark:text-white/50">
            No recommendation yet — see the recommendation vs. decision panel below.
          </p>
        )}
      </Section>

      <Section label="Why human review is required">
        <p
          className={`rounded-md px-3 py-2 text-sm ${toneClasses(data.request.status === 'escalated' ? 'warning' : 'info')}`}
        >
          {data.whyHumanReviewRequired}
        </p>
      </Section>

      <Section label="Available actions">
        {availableActions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {availableActions.map((action, i) => (
              <span
                key={i}
                className="rounded-full border border-black/15 px-2.5 py-0.5 text-xs text-black/70 dark:border-white/15 dark:text-white/70"
              >
                {action}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-black/50 dark:text-white/50">No admin action is available right now.</p>
        )}
      </Section>
    </Card>
  );
}
