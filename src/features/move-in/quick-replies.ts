import type { MoveRequestStatus } from '@/domain';

export interface QuickReply {
  id: string;
  label: string;
  content: string;
}

const IN_PROGRESS_STATUSES: MoveRequestStatus[] = ['draft', 'submitted', 'information_required'];

// Contextual suggested replies — a lighter-weight alternative to free
// text for the couple of inputs that are genuinely just "pick a number"
// or "tell me more," so the chat stays usable without becoming a form.
// Pure function of already-known state, no side effects.
export function getQuickReplies(params: {
  hasActiveRequest: boolean;
  status?: MoveRequestStatus;
  occupantCountKnown: boolean;
}): QuickReply[] {
  if (!params.hasActiveRequest) {
    return [
      {
        id: 'start-move-in',
        label: 'Start My Move-In',
        content: "I'd like to start my move-in request.",
      },
    ];
  }

  const replies: QuickReply[] = [];
  const inProgress = Boolean(params.status && IN_PROGRESS_STATUSES.includes(params.status));

  if (inProgress && !params.occupantCountKnown) {
    replies.push(
      { id: 'occupants-1', label: '1 occupant', content: '1' },
      { id: 'occupants-2', label: '2 occupants', content: '2' },
      { id: 'occupants-3', label: '3 occupants', content: '3' },
      { id: 'occupants-4', label: '4+ occupants', content: '4' }
    );
  }

  if (inProgress) {
    replies.push({
      id: 'ask-documents',
      label: 'What documents do I need?',
      content: 'What documents do I need for move-in?',
    });
  }

  if (params.status === 'escalated') {
    replies.push({ id: 'ask-status', label: 'Any update?', content: 'Any update on my request?' });
  }

  return replies;
}
