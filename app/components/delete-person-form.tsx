'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {FormDialog} from '~/components/form-dialog';
import {RosterReturnFields} from '~/components/roster-return-fields';
import type {RosterQuery} from '~/lib/roster-query';

export const DeletePersonForm = ({
  action,
  name,
  query,
  tab,
  userId,
}: {
  action: (formData: FormData) => Promise<void>;
  name: string;
  query?: Pick<RosterQuery, 'page' | 'q' | 'role'>;
  tab: string;
  userId: string;
}) => (
  <FormDialog
    description={`${name} will be removed from the roster. Any of their grant requests will be permanently deleted. They can sign in again later and will reappear on the roster.`}
    title={`Remove ${name}?`}
    triggerClassName="whitespace-nowrap text-sm text-red-700 underline"
    triggerLabel="Delete"
  >
    <form action={action} className="flex justify-end gap-2">
      {query ? (
        <RosterReturnFields query={query} tab={tab} />
      ) : (
        <input name="tab" type="hidden" value={tab} />
      )}
      <input name="user_id" type="hidden" value={userId} />
      <Dialog.Close className="btn btn-secondary" type="button">
        Cancel
      </Dialog.Close>
      <button className="btn btn-brand" type="submit">
        Remove
      </button>
    </form>
  </FormDialog>
);
