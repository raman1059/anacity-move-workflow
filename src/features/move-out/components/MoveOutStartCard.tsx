'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface MoveOutStartCardProps {
  unitNumber?: string;
  onStart: (date: string) => void;
  pending: boolean;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MoveOutStartCard({ unitNumber, onStart, pending }: MoveOutStartCardProps) {
  const [date, setDate] = useState('');

  return (
    <Card className="text-center">
      <p className="text-sm font-medium text-black/50 dark:text-white/50">
        {unitNumber ? `Unit ${unitNumber}` : 'No unit on file yet'}
      </p>
      <h2 className="mt-1 text-lg font-semibold">Planning to move out?</h2>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Tell me your intended move-out date and I&apos;ll walk you through notice, documents, and
        any charges.
      </p>

      <label className="mt-4 block text-left text-xs font-medium text-black/50 dark:text-white/50">
        Intended move-out date
        <input
          type="date"
          value={date}
          min={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-white/15"
        />
      </label>

      <button
        type="button"
        onClick={() => onStart(date)}
        disabled={pending || !date}
        className="mt-4 w-full rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Starting…' : 'Start My Move-Out'}
      </button>
    </Card>
  );
}
