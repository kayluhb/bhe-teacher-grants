'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {setManualProcessStepAction} from '~/chair/actions';
import {ChairCommittee} from '~/components/chair-committee';
import {FormProgress} from '~/components/grant-form/form-progress';
import {StepNav, StepShell} from '~/components/grant-form/step-shell';
import {GrantTable} from '~/components/grant-table';
import {StatCard} from '~/components/stat-card';
import {StepEmailTemplates} from '~/components/step-email-templates';
import {TourGrantTable} from '~/components/tour-grant-table';
import type {ChairDecideMoney} from '~/lib/chair-decide';
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
import {
  CHAIR_PROCESS_STEPS,
  EMAIL_TEMPLATES,
  type EmailTemplate,
  type ProcessStep,
} from '~/lib/grant-process';
import {formatUsd} from '~/lib/money';
import type {DirectoryPerson} from '~/lib/people';
import type {GrantRow} from '~/lib/types';
import type {VoteTally} from '~/lib/votes';

type CommitteeOfficer = DirectoryPerson & {seat: 'principal' | 'treasurer'};

type CommitteeWindow = {
  cycleId: string;
  cycleLabel: string;
  officerIds: string[];
  officers: CommitteeOfficer[];
  selected: DirectoryPerson[];
};

const grantCountLabel = (count: number) => `${count} ${count === 1 ? 'grant' : 'grants'}`;

const templatesForStep = (step: ProcessStep, templates: EmailTemplate[]) =>
  (step.templateIds ?? [])
    .map((id) => templates.find((item) => item.id === id))
    .filter((item): item is EmailTemplate => Boolean(item));

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
  decideMoney,
  decidedGrants,
  evaluation,
  grants,
  people,
  primaryCycleId,
  reviewNote,
  statuses,
  tallies,
  templateValues,
  templateValuesById,
}: {
  committees: CommitteeWindow[];
  decideMoney: ChairDecideMoney | null;
  decidedGrants: GrantRow[];
  evaluation: {cycleId: string; instructionsSent: boolean; recipientCount: number} | null;
  grants: GrantRow[];
  people: DirectoryPerson[];
  primaryCycleId?: string;
  reviewNote?: string;
  statuses: ChairProcessStepStatusMap;
  tallies: Record<string, VoteTally>;
  templateValues?: Record<string, string>;
  templateValuesById?: Record<string, Record<string, string>>;
}) => {
  const [stepIndex, setStepIndex] = useState(() => firstIncompleteChairStepIndex(statuses));
  const stepId = chairStepIdAt(stepIndex);
  const step =
    CHAIR_PROCESS_STEPS.find((item) => item.id === stepId) ??
    CHAIR_PROCESS_STEPS.find((item) => item.id === 'notify-kati');
  const status = statuses[stepId];
  const templates = step ? templatesForStep(step, EMAIL_TEMPLATES) : [];
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
    <div className="w-full" data-tour="chair-playbook">
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
          </div>
          {stepId === 'review' && reviewNote ? (
            <p className="font-body text-sm text-gray-600">{reviewNote}</p>
          ) : null}

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
                    officers={window.officers}
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

          {stepId === 'monitor' ? (
            <section className="space-y-3">
              <h3 className="font-heading text-lg font-semibold text-charcoal">Submitted so far</h3>
              <TourGrantTable
                grants={grants}
                hrefBase="/chair"
                queue="chairman"
                showOutcome={false}
                showTeacher
                showWindow={false}
              />
            </section>
          ) : null}

          {stepId === 'review' && !evaluation ? (
            <p className="font-body text-sm text-amber-800">
              Open a grant window before sending evaluation instructions.
            </p>
          ) : null}

          {stepId === 'decide' ? (
            <section className="space-y-6" id="chair-queue">
              {decideMoney ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    hint={grantCountLabel(decideMoney.approvedCount)}
                    label="Approved"
                    tone="green"
                    value={formatUsd(decideMoney.approvedAmount)}
                  />
                  <StatCard
                    hint={grantCountLabel(decideMoney.pendingCount)}
                    label="Pending"
                    tone="gold"
                    value={formatUsd(decideMoney.pendingAmount)}
                  />
                  <StatCard
                    hint={`of ${formatUsd(decideMoney.budgetLimit)} budget`}
                    label="Left"
                    tone={decideMoney.leftAmount < 0 ? 'red' : 'green'}
                    value={formatUsd(decideMoney.leftAmount)}
                  />
                </div>
              ) : null}
              <div className="space-y-3">
                <h3 className="font-heading text-lg font-semibold text-charcoal">
                  Still to decide
                </h3>
                <p className="font-body text-sm text-gray-600">
                  Open a submitted grant to approve or reject it. You can decide before every
                  reviewer has ranked.
                </p>
                <TourGrantTable
                  grants={grants}
                  hrefBase="/chair"
                  queue="chairman"
                  showOutcome={false}
                  showTeacher
                  showWindow={false}
                  tallyFor={(grant) => tallies[grant.id] ?? null}
                />
              </div>
              <div className="space-y-3">
                <h3 className="font-heading text-lg font-semibold text-charcoal">
                  Already decided
                </h3>
                <p className="font-body text-sm text-gray-600">
                  Open any row for the full grant: teacher, items, story, ranks, and the decision
                  you recorded.
                </p>
                <GrantTable
                  empty={<p>No decisions yet.</p>}
                  grants={decidedGrants}
                  hrefFor={(grant) => `/chair/${grant.id}`}
                  showTeacher
                  showWindow={false}
                />
              </div>
            </section>
          ) : null}

          {templates.length > 0 ? (
            <StepEmailTemplates
              editable
              evaluationSend={stepId === 'review' ? evaluation : null}
              templates={templates}
              values={templateValues}
              valuesById={templateValuesById}
            />
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
