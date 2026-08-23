'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {FormDialog} from '~/components/form-dialog';

export const DeletePersonForm = ({
  action,
  name,
  tab,
  userId,
}: {
  action: (formData: FormData) => Promise<void>;
  name: string;
  tab: string;
  userId: string;
}) => (
  <FormDialog
    description={`${name} can sign in again later and will reappear on the roster.`}
    title={`Remove ${name}?`}
    triggerClassName="whitespace-nowrap text-sm text-red-700 underline"
    triggerLabel="Delete"
  >
    <form action={action} className="flex justify-end gap-2">
      <input name="tab" type="hidden" value={tab} />
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
