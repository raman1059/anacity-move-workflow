import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="w-full rounded-lg border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="font-medium">Not found</p>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Nothing is on file at this address — check the community, resident, or request id.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-blue-600 underline underline-offset-2 dark:text-blue-400"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
