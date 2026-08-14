'use client';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      <span>{message}</span>
      <div className="flex shrink-0 items-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="font-medium underline underline-offset-2"
          >
            Retry
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-red-500 hover:text-red-700"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
