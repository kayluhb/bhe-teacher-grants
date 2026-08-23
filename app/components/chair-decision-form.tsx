'use client';

import {useState} from 'react';
import {decideGrantAction} from '~/chair/actions';

export const ChairDecisionForm = ({grantId}: {grantId: string}) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await decideGrantAction(new FormData(event.currentTarget));
    if (result && 'error' in result) {
      setError(result.error);
      setPending(false);
    }
  };

  return (
    <form className="space-y-3 rounded-xl border border-gray-200 bg-white p-4" onSubmit={onSubmit}>
      <input name="grant_id" type="hidden" value={grantId} />
      <p className="font-heading font-semibold text-charcoal">Official decision</p>
      <p className="text-sm text-gray-600">
        You may follow the tally or override it. A comment is stored with a rejection.
      </p>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Official decision</legend>
        <label className="font-body flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <input name="outcome" required type="radio" value="APPROVED" />
          Approve
        </label>
        <label className="font-body flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <input name="outcome" required type="radio" value="REJECTED" />
          Reject
        </label>
      </fieldset>
      <label className="font-body block text-sm text-charcoal">
        Comment (used as the rejection note)
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue"
          name="comment"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-brand" disabled={pending} type="submit">
        {pending ? 'Saving…' : 'Record decision'}
      </button>
    </form>
  );
};
