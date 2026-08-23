'use client';

import {useActionState} from 'react';
import type {AdminFormState} from '~/admin/actions';
import {DialogSubmitBar} from '~/components/form-dialog';

const fieldClass =
  'font-body mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue';

export const AddPersonForm = ({
  action,
  tab,
}: {
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  tab: string;
}) => {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto px-5">
        <input name="tab" type="hidden" value={tab} />
        <label className="block text-sm font-medium text-charcoal">
          Name
          <input className={fieldClass} name="name" required />
        </label>
        <label className="block text-sm font-medium text-charcoal">
          Email
          <input className={fieldClass} name="email" required type="email" />
        </label>
      </div>
      <DialogSubmitBar error={state.error} pending={pending} submitLabel="Add person" />
    </form>
  );
};
