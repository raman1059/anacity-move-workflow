import type { MoveRequestStatus } from '@/domain';
import type { QuickReply } from '../shared/components/ChatPanel';

export type { QuickReply };

const IN_PROGRESS_STATUSES: MoveRequestStatus[] = ['draft', 'submitted', 'information_required'];

// Contextual suggested replies — mirrors features/move-in/quick-replies.ts.
// Pure function of already-known state, no side effects.
export function getQuickReplies(params: {
  hasActiveRequest: boolean;
  status?: MoveRequestStatus;
  hasChargesToDiscuss: boolean;
}): QuickReply[] {
  if (!params.hasActiveRequest) {
    return [
      {
        id: 'start-move-out',
        label: 'Start My Move-Out',
        content: "I'd like to start my move-out request.",
      },
    ];
  }

  const replies: QuickReply[] = [];
  const inProgress = Boolean(params.status && IN_PROGRESS_STATUSES.includes(params.status));

  if (inProgress) {
    replies.push({
      id: 'ask-notice',
      label: "What's the notice period?",
      content: "What's the notice period for moving out?",
    });
    replies.push({
      id: 'ask-documents',
      label: 'What documents do I need?',
      content: 'What documents do I need for move-out?',
    });
  }

  if (params.hasChargesToDiscuss) {
    replies.push({
      id: 'ask-charges',
      label: 'What charges apply?',
      content: 'What charges apply to my move-out?',
    });
    replies.push({
      id: 'waive-charge',
      label: 'Can you waive this charge?',
      content: 'Can you waive this charge?',
    });
  }

  if (params.status === 'escalated') {
    replies.push({ id: 'ask-status', label: 'Any update?', content: 'Any update on my request?' });
  }

  return replies;
}
