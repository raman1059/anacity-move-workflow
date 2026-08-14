'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { UiMessage } from '../types';
import { ChatMessage } from './ChatMessage';

export interface QuickReply {
  id: string;
  label: string;
  content: string;
}

interface ChatPanelProps {
  messages: UiMessage[];
  quickReplies: QuickReply[];
  pending: boolean;
  onSend: (content: string) => void;
  emptyState: { line1: string; line2: string };
}

export function ChatPanel({ messages, quickReplies, pending, onSend, emptyState }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, pending]);

  function submit(content: string) {
    const trimmed = content.trim();
    if (!trimmed || pending) return;
    onSend(trimmed);
    setDraft('');
  }

  return (
    <Card className="flex h-[32rem] flex-col p-0">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-sm text-black/40 dark:text-white/40">
            <p>{emptyState.line1}</p>
            <p>{emptyState.line2}</p>
          </div>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}
        {pending ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-black/10 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30 dark:bg-white/30"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {quickReplies.length > 0 && !pending ? (
        <div className="flex flex-wrap gap-2 border-t border-black/10 px-4 py-2.5 dark:border-white/10">
          {quickReplies.map((reply) => (
            <button
              key={reply.id}
              type="button"
              onClick={() => submit(reply.content)}
              className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-black/70 transition hover:border-blue-400 hover:text-blue-600 dark:border-white/15 dark:text-white/70 dark:hover:border-blue-400 dark:hover:text-blue-400"
            >
              {reply.label}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
        className="flex items-center gap-2 border-t border-black/10 p-3 dark:border-white/10"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          disabled={pending}
          className="flex-1 rounded-full border border-black/15 bg-transparent px-4 py-2 text-sm outline-none focus:border-blue-400 disabled:opacity-50 dark:border-white/15"
        />
        <button
          type="submit"
          disabled={pending || draft.trim().length === 0}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </Card>
  );
}
