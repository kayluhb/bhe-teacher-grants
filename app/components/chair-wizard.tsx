'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {setManualProcessStepAction} from '~/chair/actions';
import {ChairCommittee} from '~/components/chair-committee';
import {FormProgress} from '~/components/grant-form/form-progress';
import {StepNav, StepShell} from '~/components/grant-form/step-shell';
import {SendEvaluationEmail} from '~/components/send-evaluation-email';
import {StepEmailTemplates} from '~/components/step-email-templates';
import {TourGrantTable} from '~/components/tour-grant-table';
import type {
  ChairProcessStepId,
  ChairProcessStepStatusMap,
  StepStatus,
} from '~/lib/chair-process-status';
import {
  CHAIR_PROGRESS_LABELS,
  chairStepCompletedFlags,
  chairStepIdAt,
  firstIncompleteChairStepIndex,
} from '~/lib/chair-wizard';
import {CHAIR_PROCESS_STEPS, EMAIL_TEMPLATES, type ProcessStep} from '~/lib/grant-process';
import type {DirectoryPerson} from '~/lib/people';
import type {GrantRow} from '~/lib/types';

type CommitteeWindow = {
  cycleId: string;
  cycleLabel: string;
  officerIds: string[];
  selected: DirectoryPerson[];
};

const templatesForStep = (step: ProcessStep) =>
  (step.templateIds ?? [])
    .map((id) => EMAIL_TEMPLATES.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

const StatusBadge = ({status}: {status?: StepStatus}) => {
  if (!status) return null;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        status.done ? 'bg-creek-green/15 text-creek-green' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {status.done ? 'Done' : 'Not done'}
    </span>
  );
};

const ManualMarkDone = ({
  cycleId,
  done,
  stepId,
}: {
  cycleId: string;
  done: boolean;
  stepId: ChairProcessStepId;
}) => (
  <form action={setManualProcessStepAction}>
    <input name="cycle_id" type="hidden" value={cycleId} />
    <input name="step_id" type="hidden" value={stepId} />
    <input name="done" type="hidden" value={done ? '0' : '1'} />
    <button className="text-sm font-medium text-eagle-blue underline" type="submit">
      {done ? 'Undo' : 'Mark done'}
    </button>
  </form>
);

export const ChairWizard = ({
  committees,
  evaluation,
  grants,
  people,
  primaryCycleId,
  statuses,
  templateValues,
}: {
  committees: CommitteeWindow[];
  evaluation: {cycleId: string; recipientCount: number} | null;
  grants: GrantRow[];
  people: DirectoryPerson[];
  primaryCycleId?: string;
  statuses: ChairProcessStepStatusMap;
  templateValues?: Record<string, string>;
}) => {
  const [stepIndex, setStepIndex] = useState(() => firstIncompleteChairStepIndex(statuses));
  const stepId = chairStepIdAt(stepIndex);
  const step =
    CHAIR_PROCESS_STEPS.find((item) => item.id === stepId) ??
    CHAIR_PROCESS_STEPS.find((item) => item.id === 'notify-kati');
  const status = statuses[stepId];
  const templates = step ? templatesForStep(step) : [];
  const completed = chairStepCompletedFlags(statuses);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === CHAIR_PROGRESS_LABELS.length - 1;

  useEffect(() => {
    // Re-focus the step title whenever navigation changes (a11y pattern from grant form).
    void stepId;
    document.querySelector<HTMLElement>('[data-wizard-step-title]')?.focus();
  }, [stepId]);

  const go = (next: number) => {
    setStepIndex(Math.min(Math.max(next, 0), CHAIR_PROGRESS_LABELS.length - 1));
  };

  return (
    <div className="mx-auto max-w-3xl" data-tour="chair-playbook">
      <FormProgress completed={completed} currentStep={stepIndex} steps={CHAIR_PROGRESS_LABELS} />

      <div aria-live="polite" className="sr-only" role="status">
        Step {stepIndex + 1} of {CHAIR_PROGRESS_LABELS.length}: {CHAIR_PROGRESS_LABELS[stepIndex]}.{' '}
        {step?.label}.
      </div>

      <div data-tour="chair-step">
        <StepShell description={step?.description} title={step?.label ?? 'Chair step'}>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={status} />
            {primaryCycleId && status?.source === 'manual' ? (
              <ManualMarkDone cycleId={primaryCycleId} done={status.done} stepId={stepId} />
            ) : null}
            {stepId === 'monitor' ? (
              <Link className="text-sm font-medium text-eagle-blue hover:underline" href="/grants">
                View all grants →
              </Link>
            ) : null}
            {stepId === 'fulfill' ? (
              <Link className="text-sm font-medium text-eagle-blue hover:underline" href="/fulfill">
                Open Fulfill →
              </Link>
            ) : null}
          </div>

          {stepId === 'committee' ? (
            committees.length > 0 ? (
              <div className="space-y-6">
                {committees.map((window) => (
                  <ChairCommittee
                    cycleId={window.cycleId}
                    cycleLabel={window.cycleLabel}
                    embedded
                    key={window.cycleId}
                    officerIds={window.officerIds}
                    people={people}
                    selected={window.selected}
                  />
                ))}
              </div>
            ) : (
              <p className="font-body text-sm text-amber-800">
                No grant window yet.{' '}
                <Link className="font-medium underline" href="/chair/windows">
                  Create a window
                </Link>{' '}
                before seating the committee.
              </p>
            )
          ) : null}

          {stepId === 'review' ? (
            evaluation ? (
              <SendEvaluationEmail
                cycleId={evaluation.cycleId}
                recipientCount={evaluation.recipientCount}
              />
            ) : (
              <p className="font-body text-sm text-amber-800">
                Open a grant window before sending evaluation instructions.
              </p>
            )
          ) : null}

          {stepId === 'decide' ? (
            <section className="space-y-3" id="chair-queue">
              <h3 className="font-heading text-lg font-semibold text-charcoal">Chair queue</h3>
              <TourGrantTable grants={grants} hrefBase="/chair" queue="chairman" showTeacher />
            </section>
          ) : null}

          {templates.length > 0 ? (
            <StepEmailTemplates templates={templates} values={templateValues} />
          ) : null}

          <StepNav
            continueLabel={isLast ? undefined : 'Continue'}
            onBack={isFirst ? undefined : () => go(stepIndex - 1)}
            onContinue={isLast ? undefined : () => go(stepIndex + 1)}
          />
        </StepShell>
      </div>
    </div>
  );
};
