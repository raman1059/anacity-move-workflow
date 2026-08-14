'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { AgentDecision, AgentTrace } from '@/agents';
import { ChatPanel } from '../../shared/components/ChatPanel';
import { ChecklistCard } from '../../shared/components/ChecklistCard';
import { ErrorBanner } from '../../shared/components/ErrorBanner';
import { NotesTimeline } from '../../shared/components/NotesTimeline';
import { StatusCard } from '../../shared/components/StatusCard';
import { getQuickReplies } from '../quick-replies';
import type { UiMessage, WorkspaceData } from '../types';
import { ChargeEstimateCard } from './ChargeEstimateCard';
import { MoveOutRequirementsCard } from './MoveOutRequirementsCard';
import { MoveOutStartCard } from './MoveOutStartCard';

interface AgentMessageApiResponse {
  reply: string;
  decision: AgentDecision;
  trace: AgentTrace;
  requestId?: string;
  conversationId: string;
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function initialMessages(data: WorkspaceData): UiMessage[] {
  if (!data.conversation) return [];
  return data.conversation.messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  }));
}

export function MoveOutWorkspace({
  residentId,
  communityId,
  initialData,
}: {
  residentId: string;
  communityId: string;
  initialData: WorkspaceData;
}) {
  const [data, setData] = useState(initialData);
  const [messages, setMessages] = useState<UiMessage[]>(() => initialMessages(initialData));
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialData.conversation?.id
  );
  const [pending, setPending] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Tracks what to retry, without the retry closures referencing
  // themselves from inside their own declarations.
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [failedUpload, setFailedUpload] = useState<{ typeKey: string; label: string } | null>(null);
  const [failedResolve, setFailedResolve] = useState<{ key: string; label: string } | null>(null);

  const refreshWorkspace = useCallback(async () => {
    const res = await fetch(`/api/resident/${residentId}/move-out-workspace`);
    const json: ApiEnvelope<WorkspaceData> = await res.json();
    if (json.ok && json.data) setData(json.data);
  }, [residentId]);

  const sendMessage = useCallback(
    async (content: string) => {
      setPending(true);
      setError(null);
      const userMessage: UiMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const res = await fetch('/api/agent/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            residentId,
            communityId,
            requestId: data.activeRequest?.id,
            unitId: data.resident.unitId ?? undefined,
            conversationId,
            content,
          }),
        });
        const json: ApiEnvelope<AgentMessageApiResponse> = await res.json();
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.error ?? 'The agent could not process that message.');
        }

        const payload = json.data;
        setConversationId(payload.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: payload.trace.turnId,
            role: 'agent',
            content: payload.reply,
            activity: payload.trace.reasoningSummary,
            createdAt: payload.trace.createdAt,
          },
        ]);
        setFailedMessage(null);
        await refreshWorkspace();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong.';
        setError(message);
        setFailedMessage(content);
        // The optimistic local message was never actually persisted —
        // remove it rather than leaving it in the transcript looking sent.
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      } finally {
        setPending(false);
      }
    },
    [
      residentId,
      communityId,
      data.activeRequest,
      data.resident.unitId,
      conversationId,
      refreshWorkspace,
    ]
  );

  const handleUpload = useCallback(
    async (typeKey: string, label: string) => {
      if (!data.activeRequest) return;
      setUploadingKey(typeKey);
      setError(null);
      try {
        const res = await fetch('/api/resident/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: data.activeRequest.id, typeKey, residentId }),
        });
        const json: ApiEnvelope<unknown> = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? 'Upload failed.');
        }
        setFailedUpload(null);
        await refreshWorkspace();
        setUploadingKey(null);
        await sendMessage(`I've uploaded my ${label}.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed.';
        setError(message);
        setUploadingKey(null);
        setFailedUpload({ typeKey, label });
      }
    },
    [data.activeRequest, refreshWorkspace, sendMessage, residentId]
  );

  const handleResolve = useCallback(
    async (key: string, label: string) => {
      if (!data.activeRequest) return;
      setResolvingKey(key);
      setError(null);
      try {
        const res = await fetch('/api/resident/checklist/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: data.activeRequest.id, key }),
        });
        const json: ApiEnvelope<unknown> = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? 'Could not mark this complete.');
        }
        setFailedResolve(null);
        await refreshWorkspace();
        setResolvingKey(null);
        await sendMessage(`I've completed "${label}".`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not mark this complete.';
        setError(message);
        setResolvingKey(null);
        setFailedResolve({ key, label });
      }
    },
    [data.activeRequest, refreshWorkspace, sendMessage]
  );

  const startMoveOut = useCallback(
    (date: string) => sendMessage(`I'd like to move out on ${date}.`),
    [sendMessage]
  );

  const dismissError = useCallback(() => {
    setError(null);
    setFailedMessage(null);
    setFailedUpload(null);
    setFailedResolve(null);
  }, []);

  const retry = failedMessage
    ? () => sendMessage(failedMessage)
    : failedUpload
      ? () => handleUpload(failedUpload.typeKey, failedUpload.label)
      : failedResolve
        ? () => handleResolve(failedResolve.key, failedResolve.label)
        : undefined;

  const hasChargesToDiscuss =
    Boolean(data.chargeEstimate) &&
    Boolean(data.activeRequest) &&
    data.activeRequest?.status !== 'completed' &&
    data.activeRequest?.status !== 'cancelled' &&
    data.activeRequest?.status !== 'rejected';

  const quickReplies = getQuickReplies({
    hasActiveRequest: Boolean(data.activeRequest),
    status: data.activeRequest?.status,
    hasChargesToDiscuss,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-black/50 dark:text-white/50">
            {data.community.name}
          </p>
          <h1 className="mt-0.5 text-xl font-semibold">
            {data.resident.firstName} {data.resident.lastName}
          </h1>
        </div>
        <Link
          href="/resident/move-out"
          className="text-sm text-black/50 hover:underline dark:text-white/50"
        >
          Switch resident
        </Link>
      </header>

      {error ? <ErrorBanner message={error} onDismiss={dismissError} onRetry={retry} /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <ChatPanel
          messages={messages}
          quickReplies={quickReplies}
          pending={pending}
          onSend={sendMessage}
          emptyState={{
            line1: 'Ask me anything about moving out —',
            line2: 'or tap "Start My Move-Out" below to begin.',
          }}
        />

        <aside className="space-y-6">
          {data.activeRequest ? (
            <>
              <StatusCard status={data.activeRequest.status} />
              {data.chargeEstimate ? <ChargeEstimateCard estimate={data.chargeEstimate} /> : null}
              <ChecklistCard
                checklist={data.checklist}
                onUpload={handleUpload}
                uploadingKey={uploadingKey}
                onResolve={handleResolve}
                resolvingKey={resolvingKey}
                disabled={pending}
              />
              <NotesTimeline notes={data.notes} />
            </>
          ) : (
            <MoveOutStartCard
              unitNumber={data.unit?.unitNumber}
              pending={pending}
              onStart={startMoveOut}
            />
          )}
          <MoveOutRequirementsCard config={data.communityConfig} policies={data.relevantPolicies} />
        </aside>
      </div>
    </div>
  );
}
