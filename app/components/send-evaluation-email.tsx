'use client';

import {useActionState} from 'react';
import {type EvaluationEmailState, sendEvaluationInstructionsAction} from '~/chair/actions';

const INITIAL: EvaluationEmailState = {};

export const SendEvaluationEmail = ({
  cycleId,
  recipientCount,
}: {
  cycleId: string;
  recipientCount: number;
}) => {
  const [state, action, pending] = useActionState(sendEvaluationInstructionsAction, INITIAL);
  const disabled = pending || recipientCount === 0;

  return (
    <div
      className="rounded-xl border border-eagle-blue/20 bg-eagle-blue/5 px-4 py-3"
      data-tour="eval-email"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-heading font-semibold text-charcoal">Email the committee</p>
          <p className="font-body mt-0.5 text-sm text-gray-600">
            Sends evaluation instructions to {recipientCount} voter
            {recipientCount === 1 ? '' : 's'}. Replies go to your email.
          </p>
        </div>
        <form action={action}>
          <input name="cycle_id" type="hidden" value={cycleId} />
          <button
            className="rounded-lg bg-eagle-blue px-3 py-2 text-sm font-semibold text-white hover:bg-eagle-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            type="submit"
          >
            {pending ? 'Sending…' : 'Email evaluation instructions'}
          </button>
        </form>
      </div>
      {recipientCount === 0 ? (
        <p className="font-body mt-2 text-sm text-amber-800">
          Add committee members above before sending.
        </p>
      ) : null}
      {state.error ? (
        <p className="font-body mt-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.sent ? (
        <p className="font-body mt-2 text-sm text-creek-green" role="status">
          Sent to {state.sent} reviewer{state.sent === 1 ? '' : 's'}.
        </p>
      ) : null}
    </div>
  );
};
