'use client';

import Link from 'next/link';

// Root error boundary — Next.js requires this to be a Client Component.
// Nothing else in the tree defines a more specific boundary, so this is
// the one fallback for any unhandled Server Component error anywhere in
// the app. Deliberately minimal: no error internals are shown to the
// user (matches the same "never leak raw failures" discipline the agent
// itself follows — see plan.md's Demo Scenarios §10).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="w-full rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/40">
        <p className="font-medium text-red-800 dark:text-red-300">Something went wrong</p>
        <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/70">
          This page hit an unexpected error. You can try again, or head back home.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-red-700 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-red-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="text-sm text-red-800 underline underline-offset-2 dark:text-red-300"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
