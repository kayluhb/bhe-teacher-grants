'use client';

import {useActionState} from 'react';
import type {AdminFormState} from '~/admin/actions';
import {DialogSubmitBar} from '~/components/form-dialog';
import {GrantWindowCommitteeField} from '~/components/grant-window-committee-field';
import {Select} from '~/components/select';
import type {UserRow} from '~/lib/admin';
import {toDatetimeLocalValue} from '~/lib/grant-cycle';
import type {CycleRow} from '~/lib/types';

const fieldClass = 'w-full rounded-lg border border-gray-300 px-3 py-2';

export type CycleReviewerValue = {seat: string; user_id: string};

const officerId = (reviewers: CycleReviewerValue[] | undefined, seat: string) =>
  reviewers?.find((row) => row.seat === seat)?.user_id ?? '';

export const GrantWindowForm = ({
  action,
  cycle,
  reviewers,
  submitLabel,
  tab,
  users,
  years,
}: {
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  cycle?: CycleRow;
  reviewers?: CycleReviewerValue[];
  submitLabel: string;
  tab: string;
  users: UserRow[];
  years: {id: string; label: string}[];
}) => {
  const [state, formAction, pending] = useActionState(action, {});
  const committeeIds = new Set(
    (reviewers ?? []).filter((row) => row.seat === 'committee').map((row) => row.user_id),
  );
  const personSelect = (name: string, seat: string, label: string) => (
    <label className="block text-sm font-medium text-charcoal" htmlFor={name}>
      {label}
      <Select
        className="mt-1 w-full"
        defaultValue={officerId(reviewers, seat)}
        name={name}
        options={users.map((user) => ({
          label: `${user.name} (${user.email})`,
          value: user.id,
        }))}
        placeholder="Select…"
        required
      />
    </label>
  );

  return (
    <form
      action={formAction}
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return;
        if (!(event.target instanceof HTMLElement)) return;
        if (event.target.closest('[data-committee-picker]')) event.preventDefault();
      }}
    >
      <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto px-5">
        <input name="tab" type="hidden" value={tab} />
        {cycle ? <input name="cycle_id" type="hidden" value={cycle.id} /> : null}
        <label className="block text-sm font-medium text-charcoal" htmlFor="school_year_id">
          School year
          <Select
            className="mt-1 w-full"
            defaultValue={cycle?.school_year_id ?? years[0]?.id}
            name="school_year_id"
            options={years.map((year) => ({
              label: year.label,
              value: year.id,
            }))}
            required
          />
        </label>
        <label className="block text-sm font-medium text-charcoal" htmlFor="semester">
          Semester
          <Select
            className="mt-1 w-full"
            defaultValue={cycle?.semester ?? 'FALL'}
            name="semester"
            options={[
              {label: 'Fall', value: 'FALL'},
              {label: 'Spring', value: 'SPRING'},
            ]}
          />
        </label>
        <label className="block text-sm font-medium text-charcoal">
          Name
          <input
            className={`mt-1 ${fieldClass}`}
            defaultValue={cycle?.name}
            name="name"
            placeholder="Fall 2026-27 Teacher Grants"
            required
          />
        </label>
        <label className="block text-sm font-medium text-charcoal">
          Budget
          <input
            className={`mt-1 ${fieldClass}`}
            defaultValue={cycle?.budget_limit}
            name="budget_limit"
            required
            type="number"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0 text-sm font-medium text-charcoal">
            Submissions open
            <input
              className={`mt-1 ${fieldClass}`}
              defaultValue={cycle ? toDatetimeLocalValue(cycle.starts_at) : undefined}
              name="starts_at"
              required
              type="datetime-local"
            />
          </label>
          <label className="block min-w-0 text-sm font-medium text-charcoal">
            Submissions close
            <input
              className={`mt-1 ${fieldClass}`}
              defaultValue={cycle ? toDatetimeLocalValue(cycle.ends_at) : undefined}
              name="ends_at"
              required
              type="datetime-local"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0 text-sm font-medium text-charcoal">
            Review opens
            <input
              className={`mt-1 ${fieldClass}`}
              defaultValue={
                cycle?.review_starts_at ? toDatetimeLocalValue(cycle.review_starts_at) : undefined
              }
              name="review_starts_at"
              required
              type="datetime-local"
            />
          </label>
          <label className="block min-w-0 text-sm font-medium text-charcoal">
            Review closes
            <input
              className={`mt-1 ${fieldClass}`}
              defaultValue={
                cycle?.review_ends_at ? toDatetimeLocalValue(cycle.review_ends_at) : undefined
              }
              name="review_ends_at"
              required
              type="datetime-local"
            />
          </label>
        </div>
        {personSelect('treasurer_user_id', 'treasurer', 'Treasurer')}
        {personSelect('principal_user_id', 'principal', 'Principal')}
        {personSelect('chairman_user_id', 'chairman', 'Chairman')}
        <GrantWindowCommitteeField
          excludeIds={[
            officerId(reviewers, 'treasurer'),
            officerId(reviewers, 'principal'),
            officerId(reviewers, 'chairman'),
          ].filter(Boolean)}
          people={users}
          selected={users.filter((user) => committeeIds.has(user.id))}
        />
        <label className="flex items-center gap-2 pb-1 text-sm">
          <input
            defaultChecked={Boolean(cycle?.is_active)}
            name="is_active"
            type="checkbox"
            value="1"
          />
          Open for submissions
        </label>
      </div>
      <DialogSubmitBar error={state.error} pending={pending} submitLabel={submitLabel} />
    </form>
  );
};
