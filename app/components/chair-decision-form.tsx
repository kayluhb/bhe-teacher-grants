'use client';

import {useRef, useState} from 'react';
import {decideGrantAction} from '~/chair/actions';
import {RadioGroup} from '~/components/radio-group';
import {
  COMMITTEE_NOTE_LABEL,
  type DecisionEmailDraft,
  draftWithApprovedAmount,
} from '~/lib/approval-email';
import {finiteMoney, formatUsd} from '~/lib/money';

type Outcome = 'APPROVED' | 'REJECTED';

const fieldClass =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue';

export const ChairDecisionForm = ({
  drafts,
  grantId,
  requestedAmount,
  teacherName,
}: {
  drafts: Record<Outcome, DecisionEmailDraft>;
  grantId: string;
  requestedAmount: number;
  teacherName: string;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | ''>('');
  const [messages, setMessages] = useState(drafts);
  const [comment, setComment] = useState('');
  const [approvedAmount, setApprovedAmount] = useState(String(requestedAmount));
  const appliedAmount = useRef(requestedAmount);

  const onApprovedAmount = (value: string) => {
    setApprovedAmount(value);
    const parsed = finiteMoney(Number(value));
    if (parsed == null || parsed <= 0) return;
    const from = appliedAmount.current;
    appliedAmount.current = parsed;
    setMessages((current) => ({
      ...current,
      APPROVED: draftWithApprovedAmount(current.APPROVED, from, parsed),
    }));
  };

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

  const selected = outcome ? messages[outcome] : null;

  const updateDraft = (field: keyof DecisionEmailDraft, value: string) => {
    if (!outcome) return;
    setMessages((current) => ({
      ...current,
      [outcome]: {...current[outcome], [field]: value},
    }));
  };

  return (
    <form className="space-y-3 rounded-xl border border-gray-200 bg-white p-4" onSubmit={onSubmit}>
      <input name="grant_id" type="hidden" value={grantId} />
      <p className="font-heading font-semibold text-charcoal">Official decision</p>
      <p className="text-sm text-gray-600">
        Choose approve or reject. The email below is what {teacherName} receives. Edit it before you
        record the decision.
      </p>
      <RadioGroup
        aria-label="Official decision"
        className="flex flex-wrap gap-x-6 gap-y-3"
        name="outcome"
        onValueChange={(value) => {
          if (value === 'APPROVED' || value === 'REJECTED') setOutcome(value);
        }}
        options={[
          {label: 'Approve', value: 'APPROVED'},
          {label: 'Reject', value: 'REJECTED'},
        ]}
        required
      />
      {selected ? (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          {outcome === 'APPROVED' ? (
            <label className="font-body block text-sm text-charcoal">
              Approved amount
              <span className="mt-0.5 block font-normal text-gray-500">
                Starts as the request total ({formatUsd(requestedAmount)}). Change it when that
                total does not match what you are approving.
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
          ) : null}
          <p className="text-sm font-medium text-charcoal">Email to {teacherName}</p>
          <label className="font-body block text-sm text-charcoal">
            Subject
            <input
              className={fieldClass}
              name="subject"
              onChange={(event) => updateDraft('subject', event.target.value)}
              required
              value={selected.subject}
            />
          </label>
          <label className="font-body block text-sm text-charcoal">
            Message
            <textarea
              className={fieldClass}
              name="body"
              onChange={(event) => updateDraft('body', event.target.value)}
              required
              rows={16}
              value={selected.body}
            />
          </label>
          {outcome === 'REJECTED' ? (
            <label className="font-body block text-sm text-charcoal">
              {COMMITTEE_NOTE_LABEL}
              <span className="mt-0.5 block font-normal text-gray-500">
                Saved with the rejection and added at the end of this email.
              </span>
              <textarea
                className={fieldClass}
                name="comment"
                onChange={(event) => setComment(event.target.value)}
                value={comment}
              />
              {comment.trim() ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  {COMMITTEE_NOTE_LABEL}: {comment.trim()}
                </p>
              ) : null}
            </label>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          Choose approve or reject to review the email before it sends.
        </p>
      )}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-brand" disabled={pending || !selected} type="submit">
        {pending ? 'Sending…' : 'Record decision and send'}
      </button>
    </form>
  );
};
