import Link from 'next/link';
import {setManualProcessStepAction} from '~/chair/actions';
import type {ChairProcessStepId, StepStatus} from '~/lib/chair-process-status';
import type {ProcessStep} from '~/lib/grant-process';

export const ProcessStepList = ({
  cycleId,
  statuses,
  steps,
}: {
  cycleId?: string;
  statuses?: Partial<Record<ChairProcessStepId, StepStatus>>;
  steps: ProcessStep[];
}) => (
  <ol className="space-y-4">
    {steps.map((step, index) => {
      const status = statuses?.[step.id as ChairProcessStepId];
      const done = status?.done === true;
      return (
        <li
          className={`flex gap-4 rounded-xl border p-4 shadow-sm ${
            done ? 'border-creek-green/30 bg-creek-green/5' : 'border-gray-200 bg-white'
          }`}
          key={step.id}
        >
          <span
            aria-hidden="true"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
              done ? 'bg-creek-green' : 'bg-eagle-blue'
            }`}
          >
            {done ? '✓' : index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading font-semibold text-charcoal">{step.label}</p>
              {status ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    done ? 'bg-creek-green/15 text-creek-green' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {done ? 'Done' : 'Not done'}
                </span>
              ) : null}
            </div>
            <p className="font-body mt-1 text-sm text-gray-600">{step.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {step.href ? (
                <Link
                  className="inline-block text-sm font-medium text-eagle-blue hover:underline"
                  href={step.href}
                >
                  {step.linkLabel} →
                </Link>
              ) : null}
              {cycleId && status?.source === 'manual' ? (
                <form action={setManualProcessStepAction}>
                  <input name="cycle_id" type="hidden" value={cycleId} />
                  <input name="step_id" type="hidden" value={step.id} />
                  <input name="done" type="hidden" value={done ? '0' : '1'} />
                  <button className="text-sm font-medium text-eagle-blue underline" type="submit">
                    {done ? 'Undo' : 'Mark done'}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </li>
      );
    })}
  </ol>
);
