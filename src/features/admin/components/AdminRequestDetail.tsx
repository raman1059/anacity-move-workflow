'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { AdminDecision, AdminReview, MoveRequestStatus } from '@/domain';
import { ErrorBanner } from '../../shared/components/ErrorBanner';
import { StatusCard } from '../../shared/components/StatusCard';
import type { AdminIdentity, RequestDetailData } from '../types';
import { ActionPanel } from './ActionPanel';
import { AgentActionHistory } from './AgentActionHistory';
import { ChecklistDocumentStatus } from './ChecklistDocumentStatus';
import { DecisionContextPanel } from './DecisionContextPanel';
import { NotesPanel } from './NotesPanel';
import { RecommendationVsDecisionCard } from './RecommendationVsDecisionCard';

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function AdminRequestDetail({
  identity,
  requestId,
  initialData,
}: {
  identity: AdminIdentity;
  requestId: string;
  initialData: RequestDetailData;
}) {
  const [data, setData] = useState(initialData);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/requests/${requestId}?roleKey=${identity.roleKey}`);
    const json: ApiEnvelope<RequestDetailData> = await res.json();
    if (json.ok && json.data) setData(json.data);
  }, [requestId, identity.roleKey]);

  const handleDecision = useCallback(
    async (decision: AdminDecision, reason?: string) => {
      setPending(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/requests/${requestId}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: identity.adminId,
            decision,
            reason,
            roleKey: identity.roleKey,
          }),
        });
        const json: ApiEnvelope<AdminReview> = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? 'Could not record that decision.');
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not record that decision.');
      } finally {
        setPending(false);
      }
    },
    [requestId, identity.adminId, identity.roleKey, refresh]
  );

  const handleStatusChange = useCallback(
    async (status: MoveRequestStatus) => {
      setPending(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/requests/${requestId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId: identity.adminId, status }),
        });
        const json: ApiEnvelope<unknown> = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? 'Could not change status.');
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not change status.');
      } finally {
        setPending(false);
      }
    },
    [requestId, identity.adminId, refresh]
  );

  const handleAddNote = useCallback(
    async (text: string) => {
      setPending(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/requests/${requestId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId: identity.adminId, text }),
        });
        const json: ApiEnvelope<unknown> = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? 'Could not add that note.');
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not add that note.');
      } finally {
        setPending(false);
      }
    },
    [requestId, identity.adminId, refresh]
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/admin/${identity.communityId}/${identity.roleKey}`}
            className="text-sm text-black/50 hover:underline dark:text-white/50"
          >
            &larr; All requests
          </Link>
          <p className="mt-2 text-sm font-medium text-black/50 dark:text-white/50">
            {data.community.name}
          </p>
          <h1 className="mt-0.5 text-xl font-semibold">
            {data.resident?.firstName} {data.resident?.lastName}
          </h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {data.resident?.residentType} &middot; {data.resident?.email} &middot;{' '}
            {data.resident?.phone}
          </p>
          <p className="mt-0.5 text-sm text-black/60 dark:text-white/60">
            Unit {data.unit?.unitNumber ?? '—'}
            {data.unit?.block ? `, Block ${data.unit.block}` : ''}
            {data.unit?.floor !== undefined ? `, Floor ${data.unit.floor}` : ''} &middot;{' '}
            {data.unit?.type}
          </p>
        </div>
        <StatusCard status={data.request.status} />
      </header>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <RecommendationVsDecisionCard data={data} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <DecisionContextPanel data={data} />
          <AgentActionHistory actions={data.agentActions} />
        </div>

        <aside className="space-y-6">
          <ActionPanel
            decisionActions={data.decisionActions}
            otherActions={data.otherActions}
            requestType={data.request.type}
            isFinancialException={data.isFinancialException}
            canApproveFinancialException={data.currentRole?.canApproveFinancialException ?? false}
            canApproveThisType={data.canApproveThisType}
            pending={pending}
            onDecision={handleDecision}
            onStatusChange={handleStatusChange}
          />
          <ChecklistDocumentStatus checklist={data.checklist} />
          <NotesPanel notes={data.notes} onAddNote={handleAddNote} pending={pending} />
        </aside>
      </div>
    </div>
  );
}
