'use client';

import {useState} from 'react';
import {FormDialog} from '~/components/form-dialog';
import {RadioGroup} from '~/components/radio-group';
import {PRIORITY_GUIDELINES, RANKING_CRITERIA} from '~/lib/grant-process';
import {BALLOT_LABELS, BALLOTS, type Ballot} from '~/lib/votes';
import {castVoteAction} from '~/review/actions';

export const VoteForm = ({
  existing,
  grantId,
  principal = false,
}: {
  existing?: Ballot | null;
  grantId: string;
  principal?: boolean;
}) => {
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
    <form className="space-y-4 rounded-xl border border-gray-200 bg-white p-4" onSubmit={onSubmit}>
      <input name="grant_id" type="hidden" value={grantId} />
      <p className="font-heading font-semibold text-charcoal">Rank this request</p>

      <FormDialog
        description="Use these questions and priority definitions when ranking each request."
        title="Evaluation criteria"
        triggerClassName="cursor-pointer text-sm font-medium text-eagle-blue hover:underline"
        triggerLabel="Evaluation criteria"
      >
        <div className="space-y-5">
          <ol className="space-y-1.5">
            {RANKING_CRITERIA.map((criterion, i) => (
              <li className="flex gap-2 text-sm text-gray-600" key={criterion}>
                <span className="shrink-0 font-semibold text-eagle-blue">{i + 1}.</span>
                {criterion}
              </li>
            ))}
          </ol>
          <ul className="space-y-1 border-t border-gray-100 pt-4">
            {PRIORITY_GUIDELINES.map((p) => (
              <li className="text-sm text-gray-600" key={p.value}>
                <span className="font-medium text-charcoal">{p.label}:</span> {p.guideline}
              </li>
            ))}
          </ul>
        </div>
      </FormDialog>

      {existing ? (
        <p className="text-sm text-gray-600">
          Current rank: {BALLOT_LABELS[existing]}. You can change it while review is open.
        </p>
      ) : null}
      <RadioGroup
        aria-label="Priority rank"
        className="flex flex-wrap gap-x-6 gap-y-3"
        defaultValue={existing ?? undefined}
        name="vote"
        options={BALLOTS.map((value) => ({label: BALLOT_LABELS[value], value}))}
        required
      />
      <label className="font-body block text-sm text-charcoal">
        {principal ? 'School concerns (optional)' : 'Comment (optional)'}
        {principal ? (
          <span className="mt-0.5 block font-normal text-gray-500">
            Note a request that should not move forward for a school-related reason.
          </span>
        ) : null}
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
