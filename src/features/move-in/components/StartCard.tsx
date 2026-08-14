'use client';

import { Card } from '@/components/ui/Card';

interface StartCardProps {
  unitNumber?: string;
  onStart: () => void;
  pending: boolean;
}

export function StartCard({ unitNumber, onStart, pending }: StartCardProps) {
  return (
    <Card className="text-center">
      <p className="text-sm font-medium text-black/50 dark:text-white/50">
        {unitNumber ? `Unit ${unitNumber}` : 'No unit on file yet'}
      </p>
      <h2 className="mt-1 text-lg font-semibold">Ready to move in?</h2>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        I&apos;ll guide you through everything needed — no forms to fill out blind.
      </p>
      <button
        type="button"
        onClick={onStart}
        disabled={pending}
        className="mt-4 w-full rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Starting…' : 'Start My Move-In'}
      </button>
    </Card>
  );
}
