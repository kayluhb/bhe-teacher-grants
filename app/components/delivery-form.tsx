'use client';

import {useState} from 'react';
import {FileUpload} from '~/components/file-upload';
import {confirmDeliveryAction} from '~/grants/actions';

export const DeliveryForm = ({grantId}: {grantId: string}) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await confirmDeliveryAction(new FormData(event.currentTarget));
    if (result && 'error' in result) {
      setError(result.error);
      setPending(false);
    }
  };

  return (
    <form className="space-y-3 rounded-xl border border-gray-200 bg-white p-4" onSubmit={onSubmit}>
      <input name="grant_id" type="hidden" value={grantId} />
      <p className="font-heading font-semibold text-charcoal">Confirm the items arrived</p>
      <FileUpload
        grantId={grantId}
        kind="delivery"
        label="Photo (optional)"
        name="proof_of_delivery_r2_key"
      />
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-brand" disabled={pending} type="submit">
        {pending ? 'Saving…' : 'Mark delivered'}
      </button>
    </form>
  );
};
