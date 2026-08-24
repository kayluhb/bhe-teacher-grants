'use client';

import {useState} from 'react';
import {RadioGroup} from '~/components/radio-group';
import {BALLOT_LABELS, BALLOTS, type Ballot} from '~/lib/votes';
import {castVoteAction} from '~/review/actions';

export const VoteForm = ({grantId, existing}: {existing?: Ballot | null; grantId: string}) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await castVoteAction(new FormData(event.currentTarget));
      if (result && 'error' in result) {
        setError(result.error);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="space-y-3 rounded-xl border border-gray-200 bg-white p-4" onSubmit={onSubmit}>
      <input name="grant_id" type="hidden" value={grantId} />
      <p className="font-heading font-semibold text-charcoal">Rank this request</p>
      {existing ? (
        <p className="text-sm text-gray-600">
          Current rank: {BALLOT_LABELS[existing]}. You can change it while review is open.
        </p>
      ) : null}
      <RadioGroup
        aria-label="Rank"
        className="flex flex-wrap gap-x-6 gap-y-3"
        defaultValue={existing ?? undefined}
        name="vote"
        options={BALLOTS.map((value) => ({label: BALLOT_LABELS[value], value}))}
        required
      />
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
        {pending ? 'Saving…' : 'Submit rank'}
      </button>
    </form>
  );
};
