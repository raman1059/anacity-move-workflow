import { Card } from '@/components/ui/Card';
import type { MoveRequestStatus } from '@/domain';
import { getMoveStepper, MOVE_STATUS_COPY, toneClasses } from '../status-copy';

const STEP_DOT_CLASSES: Record<string, string> = {
  complete: 'bg-emerald-500',
  active: 'bg-blue-500',
  attention: 'bg-amber-500',
  negative: 'bg-red-500',
  upcoming: 'bg-black/15 dark:bg-white/15',
};

export function StatusCard({ status }: { status: MoveRequestStatus }) {
  const copy = MOVE_STATUS_COPY[status];
  const steps = getMoveStepper(status);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-black/50 dark:text-white/50">Request status</h2>
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses(copy.tone)}`}
        >
          {copy.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-black/70 dark:text-white/70">{copy.description}</p>

      <ol className="mt-4 flex items-center">
        {steps.map((step, index) => (
          <li key={step.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`h-2.5 w-2.5 rounded-full ${STEP_DOT_CLASSES[step.state]}`}
                aria-hidden
              />
              <span className="text-center text-[10px] leading-tight text-black/50 dark:text-white/50">
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`mx-1 mb-4 h-px flex-1 ${
                  step.state === 'complete' ? 'bg-emerald-400' : 'bg-black/10 dark:bg-white/10'
                }`}
                aria-hidden
              />
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}
