'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {FormDialog} from '~/components/form-dialog';

export const DeleteGrantForm = ({
  action,
  title,
  grantId,
}: {
  action: (formData: FormData) => Promise<void>;
  grantId: string;
  title: string;
}) => (
  <FormDialog
    description={`This permanently deletes "${title}" and its items, votes, and files. This cannot be undone.`}
    title="Delete this grant?"
    triggerClassName="whitespace-nowrap text-sm text-red-700 underline"
    triggerLabel="Delete grant"
  >
    <form action={action} className="flex justify-end gap-2">
      <input name="grant_id" type="hidden" value={grantId} />
      <Dialog.Close className="btn btn-secondary" type="button">
        Cancel
      </Dialog.Close>
      <button className="btn btn-brand" type="submit">
        Delete permanently
      </button>
    </form>
  </FormDialog>
);
