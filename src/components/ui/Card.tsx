import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-black/10 bg-white/60 p-5 shadow-sm dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      {children}
    </div>
  );
}
