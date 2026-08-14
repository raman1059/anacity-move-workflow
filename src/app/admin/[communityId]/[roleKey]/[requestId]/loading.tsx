export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="space-y-1.5">
        <div className="h-4 w-32 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-6 w-56 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </div>
      <div className="h-24 animate-pulse rounded-lg border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="h-96 animate-pulse rounded-lg border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5" />
        </div>
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
