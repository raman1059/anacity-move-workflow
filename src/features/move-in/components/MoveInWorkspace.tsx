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
import { RequirementsCard } from './RequirementsCard';
import { StartCard } from './StartCard';

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

export function MoveInWorkspace({
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
  const [error, setError] = useState<string | null>(null);
  // Tracks what to retry, without the retry closures referencing
  // themselves from inside their own declarations.
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [failedUpload, setFailedUpload] = useState<{ typeKey: string; label: string } | null>(null);

  const refreshWorkspace = useCallback(async () => {
    const res = await fetch(`/api/resident/${residentId}/workspace`);
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

  const dismissError = useCallback(() => {
    setError(null);
    setFailedMessage(null);
    setFailedUpload(null);
  }, []);

  const retry = failedMessage
    ? () => sendMessage(failedMessage)
    : failedUpload
      ? () => handleUpload(failedUpload.typeKey, failedUpload.label)
      : undefined;

  const occupantCountKnown =
    data.activeRequest?.type === 'move_in' ? data.activeRequest.occupantCount !== undefined : true;

  const quickReplies = getQuickReplies({
    hasActiveRequest: Boolean(data.activeRequest),
    status: data.activeRequest?.status,
    occupantCountKnown,
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
        <Link href="/resident" className="text-sm text-black/50 hover:underline dark:text-white/50">
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
            line1: 'Ask me anything about moving in —',
            line2: 'or tap "Start My Move-In" below to begin.',
          }}
        />

        <aside className="space-y-6">
          {data.activeRequest ? (
            <>
              <StatusCard status={data.activeRequest.status} />
              <ChecklistCard
                checklist={data.checklist}
                onUpload={handleUpload}
                uploadingKey={uploadingKey}
                disabled={pending}
              />
              <NotesTimeline notes={data.notes} />
            </>
          ) : (
            <StartCard
              unitNumber={data.unit?.unitNumber}
              pending={pending}
              onStart={() => sendMessage("I'd like to start my move-in request.")}
            />
          )}
          <RequirementsCard config={data.communityConfig} policies={data.relevantPolicies} />
        </aside>
      </div>
    </div>
  );
}
