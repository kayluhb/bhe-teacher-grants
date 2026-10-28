'use client';

import {useState} from 'react';
import {reviseGrantAction} from '~/chair/actions';
import {type DecisionEmailDraft, draftWithApprovedAmount} from '~/lib/approval-email';
import {finiteMoney, formatUsd} from '~/lib/money';

const fieldClass =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue';

export const ChairReviseForm = ({
  draft,
  grantId,
  outcome,
  requestedAmount,
  teacherName,
}: {
  draft: DecisionEmailDraft | null;
  grantId: string;
  outcome: 'APPROVED' | 'REJECTED';
  requestedAmount: number;
  teacherName: string;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState(draft);
  const [approvedAmount, setApprovedAmount] = useState(String(requestedAmount));
  const [appliedAmount, setAppliedAmount] = useState(requestedAmount);

  const onApprovedAmount = (value: string) => {
    setApprovedAmount(value);
    const parsed = finiteMoney(Number(value));
    if (parsed == null || parsed <= 0 || !message) return;
    const from = appliedAmount;
    setAppliedAmount(parsed);
    setMessage(draftWithApprovedAmount(message, from, parsed));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await reviseGrantAction(new FormData(event.currentTarget));
    if (result && 'error' in result) {
      setError(result.error);
      setPending(false);
    }
  };

  const denying = outcome === 'REJECTED';

  return (
    <form className="space-y-3 rounded-xl border border-gray-200 bg-white p-4" onSubmit={onSubmit}>
      <input name="grant_id" type="hidden" value={grantId} />
      <input name="outcome" type="hidden" value={outcome} />
      <p className="font-heading font-semibold text-charcoal">Change this result</p>
      <p className="text-sm text-gray-600">
        {denying
          ? `Change this approval to rejected. ${teacherName} is not emailed from here.`
          : `Change this rejection to approved. The email below is what ${teacherName} receives. Edit it before you send.`}
      </p>
      {denying || !message ? null : (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <label className="font-body block text-sm text-charcoal">
            Approved amount
            <span className="mt-0.5 block font-normal text-gray-500">
              Starts as the request total ({formatUsd(requestedAmount)}).
            </span>
            <input
              className={fieldClass}
              inputMode="decimal"
              min="0.01"
              name="approved_amount"
              onChange={(event) => onApprovedAmount(event.target.value)}
              required
              step="0.01"
              type="number"
              value={approvedAmount}
            />
          </label>
          <p className="text-sm font-medium text-charcoal">Email to {teacherName}</p>
          <label className="font-body block text-sm text-charcoal">
            Subject
            <input
              className={fieldClass}
              name="subject"
              onChange={(event) =>
                setMessage((current) =>
                  current ? {...current, subject: event.target.value} : current,
                )
              }
              required
              value={message.subject}
            />
          </label>
          <label className="font-body block text-sm text-charcoal">
            Message
            <textarea
              className={fieldClass}
              name="body"
              onChange={(event) =>
                setMessage((current) =>
                  current ? {...current, body: event.target.value} : current,
                )
              }
              required
              rows={16}
              value={message.body}
            />
          </label>
        </div>
      )}
      <label className="font-body block text-sm text-charcoal">
        Note
        <span className="mt-0.5 block font-normal text-gray-500">
          Saved on the grant so the history shows why the result changed.
        </span>
        <textarea
          className={fieldClass}
          name="note"
          onChange={(event) => setNote(event.target.value)}
          required
          rows={3}
          value={note}
        />
      </label>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-brand" disabled={pending || !note.trim()} type="submit">
        {pending ? 'Saving…' : denying ? 'Change to rejected' : 'Change to approved and send'}
      </button>
    </form>
  );
};
