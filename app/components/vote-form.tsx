'use client';

import {useState} from 'react';
import type {Ballot} from '~/lib/votes';
import {castVoteAction} from '~/review/actions';

export const VoteForm = ({grantId, existing}: {existing?: Ballot | null; grantId: string}) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await castVoteAction(new FormData(event.currentTarget));
    if (result && 'error' in result) {
      setError(result.error);
      setPending(false);
    }
  };

  return (
    <form className="space-y-3 rounded-xl border border-gray-200 bg-white p-4" onSubmit={onSubmit}>
      <input name="grant_id" type="hidden" value={grantId} />
      <p className="font-heading font-semibold text-charcoal">Cast your vote</p>
      {existing ? (
        <p className="text-sm text-gray-600">
          Current ballot: {existing}. You can change it while voting is open.
        </p>
      ) : null}
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Vote</legend>
        {(['APPROVE', 'REJECT', 'ABSTAIN'] as const).map((vote) => (
          <label
            className="font-body flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            key={vote}
          >
            <input
              defaultChecked={existing === vote}
              name="vote"
              required
              type="radio"
              value={vote}
            />
            {vote === 'APPROVE' ? 'Approve' : vote === 'REJECT' ? 'Reject' : 'Abstain'}
          </label>
        ))}
      </fieldset>
      <label className="font-body block text-sm text-charcoal">
        Comment (optional)
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
        {pending ? 'Saving…' : 'Submit vote'}
      </button>
    </form>
  );
};
