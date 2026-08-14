import type { ChecklistItemStatus, DocumentStatus, MoveRequestStatus } from '@/domain';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface StatusCopy {
  label: string;
  description: string;
  tone: StatusTone;
}

// Tailwind class strings are still just strings — this stays a pure,
// DOM-free function, colocated with the rest of the presentation copy.
export function toneClasses(tone: StatusTone): string {
  switch (tone) {
    case 'success':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'warning':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'danger':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    case 'info':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'neutral':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

// Shared between move-in and move-out — both walk the same
// MoveRequestStatus state machine (state-machine.ts), so the copy and
// stepper logic below is genuinely status-driven, not move-type-driven.
export const MOVE_STATUS_COPY: Record<MoveRequestStatus, StatusCopy> = {
  draft: {
    label: 'Draft',
    description: "Not yet submitted — let's finish getting your details together.",
    tone: 'neutral',
  },
  submitted: {
    label: 'Submitted',
    description: "Received — we're checking everything over.",
    tone: 'info',
  },
  information_required: {
    label: 'Action needed',
    description: 'A few things are still needed before this can move forward.',
    tone: 'warning',
  },
  under_review: {
    label: 'Under review',
    description: 'Everything checks out on our end — a community admin will confirm shortly.',
    tone: 'info',
  },
  escalated: {
    label: 'With admin',
    description: "This needs a community admin's judgment before it can continue.",
    tone: 'warning',
  },
  approved: {
    label: 'Approved',
    description: 'Your request has been approved — a move slot will be scheduled next.',
    tone: 'success',
  },
  rejected: {
    label: 'Not approved',
    description: 'This request was not approved. See the notes below for details.',
    tone: 'danger',
  },
  scheduled: {
    label: 'Scheduled',
    description: 'Your date and time slot are confirmed.',
    tone: 'success',
  },
  completed: {
    label: 'Completed',
    description: 'This request is complete.',
    tone: 'success',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'This request was cancelled.',
    tone: 'neutral',
  },
};

export type StepState = 'complete' | 'active' | 'attention' | 'upcoming' | 'negative';

export interface StepperStep {
  label: string;
  state: StepState;
}

const STEP_LABELS = ['Submitted', 'Under Review', 'Approved', 'Scheduled', 'Completed'];

function positionFor(status: MoveRequestStatus): number {
  switch (status) {
    case 'draft':
    case 'submitted':
    case 'information_required':
    case 'cancelled':
      return 0;
    case 'under_review':
    case 'escalated':
    case 'rejected':
      return 1;
    case 'approved':
      return 2;
    case 'scheduled':
      return 3;
    case 'completed':
      return 4;
  }
}

function markerFor(status: MoveRequestStatus): 'attention' | 'negative' | 'normal' {
  if (status === 'information_required' || status === 'escalated') return 'attention';
  if (status === 'rejected' || status === 'cancelled') return 'negative';
  return 'normal';
}

// A 5-step stepper (Submitted -> Under Review -> Approved -> Scheduled ->
// Completed) that still reads correctly for off-path statuses
// (information_required/escalated show an "attention" marker at their
// nearest step rather than breaking the stepper; rejected/cancelled show
// a clear negative marker) instead of only handling the happy path.
export function getMoveStepper(status: MoveRequestStatus): StepperStep[] {
  if (status === 'draft') {
    return STEP_LABELS.map((label) => ({ label, state: 'upcoming' }));
  }

  const position = positionFor(status);
  const marker = markerFor(status);

  return STEP_LABELS.map((label, index) => {
    if (index < position) return { label, state: 'complete' };
    if (index === position) {
      if (marker === 'attention') return { label, state: 'attention' };
      if (marker === 'negative') return { label, state: 'negative' };
      if (status === 'completed') return { label, state: 'complete' };
      return { label, state: 'active' };
    }
    return { label, state: 'upcoming' };
  });
}

export function checklistStatusCopy(status: ChecklistItemStatus): {
  label: string;
  tone: StatusTone;
} {
  switch (status) {
    case 'verified':
      return { label: 'Verified', tone: 'success' };
    case 'submitted':
      return { label: 'Submitted', tone: 'info' };
    case 'rejected':
      return { label: 'Needs re-upload', tone: 'danger' };
    case 'pending':
      return { label: 'Pending', tone: 'neutral' };
  }
}

export function documentStatusCopy(status: DocumentStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case 'verified':
      return { label: 'Verified', tone: 'success' };
    case 'uploaded':
      return { label: 'Uploaded', tone: 'info' };
    case 'rejected':
      return { label: 'Rejected', tone: 'danger' };
    case 'pending_upload':
      return { label: 'Not uploaded', tone: 'neutral' };
  }
}
