'use client';

import {useActionState} from 'react';
import type {AdminFormState} from '~/admin/actions';
import {DialogSubmitBar} from '~/components/form-dialog';

const fieldClass = 'w-full rounded-lg border border-gray-300 px-3 py-2';

export type SchoolYearValue = {
  ends_on: string;
  id: string;
  is_default: number;
  label: string;
  starts_on: string;
};

export const SchoolYearForm = ({
  action,
  submitLabel,
  tab,
  year,
}: {
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  submitLabel: string;
  tab: string;
  year?: SchoolYearValue;
}) => {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto px-5">
        <input name="tab" type="hidden" value={tab} />
        {year ? <input name="year_id" type="hidden" value={year.id} /> : null}
        <label className="block text-sm font-medium text-charcoal">
          Label
          <input
            className={`mt-1 ${fieldClass}${year ? ' bg-warm-white' : ''}`}
            defaultValue={year?.label}
            name="label"
            placeholder="2026-27"
            readOnly={Boolean(year)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-charcoal">
          Starts
          <input
            className={`mt-1 ${fieldClass}`}
            defaultValue={year?.starts_on}
            name="starts_on"
            required
            type="date"
          />
        </label>
        <label className="block text-sm font-medium text-charcoal">
          Ends
          <input
            className={`mt-1 ${fieldClass}`}
            defaultValue={year?.ends_on}
            name="ends_on"
            required
            type="date"
          />
        </label>
        <label className="flex items-center gap-2 pb-1 text-sm">
          <input
            defaultChecked={Boolean(year?.is_default)}
            name="is_default"
            type="checkbox"
            value="1"
          />
          Current year
        </label>
      </div>
      <DialogSubmitBar error={state.error} pending={pending} submitLabel={submitLabel} />
    </form>
  );
};
