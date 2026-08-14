export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-7 w-72 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
          />
        ))}
      </div>
    </main>
  );
}
