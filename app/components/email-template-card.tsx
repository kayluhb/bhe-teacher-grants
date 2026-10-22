'use client';

import {useActionState, useState} from 'react';
import {type EvaluationEmailState, sendEvaluationInstructionsAction} from '~/chair/actions';
import {CopyButton} from '~/components/copy-button';
import {fillEmailBody, fillTemplate} from '~/lib/email-template-fill';
import type {EmailTemplate} from '~/lib/grant-process';

const INITIAL: EvaluationEmailState = {};

const fieldClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-body text-sm text-charcoal shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue';

export const EmailTemplateCard = ({
  editable = false,
  evaluationSend = null,
  template,
  values = {},
}: {
  editable?: boolean;
  evaluationSend?: {
    cycleId: string;
    instructionsSent: boolean;
    recipientCount: number;
  } | null;
  template: EmailTemplate;
  values?: Record<string, string>;
}) => {
  const filledSubject = fillTemplate(template.subject, values);
  const filledBody = fillEmailBody(template.body, values);
  const [subject, setSubject] = useState(filledSubject);
  const [body, setBody] = useState(filledBody);
  const [state, action, pending] = useActionState(sendEvaluationInstructionsAction, INITIAL);
  const canSend = evaluationSend != null && evaluationSend.recipientCount > 0 && !pending;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div>
          <p className="font-heading font-semibold text-charcoal">{template.label}</p>
          <p className="font-body mt-0.5 text-xs text-gray-500">{template.when}</p>
        </div>
        <CopyButton
          text={`Subject: ${editable ? subject : filledSubject}\n\n${editable ? body : filledBody}`}
        />
      </div>
      {editable ? (
        <form
          action={evaluationSend ? action : undefined}
          className="space-y-3 px-4 py-3"
          onSubmit={evaluationSend ? undefined : (event) => event.preventDefault()}
        >
          {evaluationSend ? (
            <input name="cycle_id" type="hidden" value={evaluationSend.cycleId} />
          ) : null}
          <label className="block text-sm text-charcoal">
            <span className="font-body text-xs font-semibold tracking-wide text-gray-400 uppercase">
              Subject
            </span>
            <input
              className={fieldClass}
              name="subject"
              onChange={(event) => setSubject(event.target.value)}
              value={subject}
            />
          </label>
          <label className="block text-sm text-charcoal">
            <span className="font-body text-xs font-semibold tracking-wide text-gray-400 uppercase">
              Body
            </span>
            <textarea
              className={fieldClass}
              name="body"
              onChange={(event) => setBody(event.target.value)}
              rows={14}
              value={body}
            />
          </label>
          {evaluationSend ? (
            <div data-tour="eval-email">
              <p className="font-body text-sm text-gray-600">
                {`Sends this message to ${evaluationSend.recipientCount} ${evaluationSend.recipientCount === 1 ? 'voter' : 'voters'}. Replies go to your email. Edit the subject or body first if you want to change it.`}
              </p>
              {evaluationSend.recipientCount === 0 ? (
                <p className="font-body mt-2 text-sm text-amber-800">
                  Add committee members before sending.
                </p>
              ) : null}
              <button
                className="mt-3 rounded-lg bg-eagle-blue px-3 py-2 text-sm font-semibold text-white hover:bg-eagle-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSend}
                type="submit"
              >
                {pending ? 'Sending…' : 'Email evaluation instructions'}
              </button>
              {state.error ? (
                <p className="font-body mt-2 text-sm text-red-700" role="alert">
                  {state.error}
                </p>
              ) : null}
              {state.sent ? (
                <p className="font-body mt-2 text-sm text-creek-green" role="status">
                  Sent to {state.sent} reviewer{state.sent === 1 ? '' : 's'}. This step is now done.
                </p>
              ) : evaluationSend.instructionsSent ? (
                <p className="font-body mt-2 text-sm text-creek-green" role="status">
                  Already sent for this window. Send again if the committee needs another copy.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="font-body text-sm text-gray-600">
              {template.id === 'approval' || template.id === 'rejection'
                ? 'This letter is filled in on each grant. You review and edit that email before it sends.'
                : 'Edit this before you copy it. Changes stay on this page until you leave.'}
            </p>
          )}
        </form>
      ) : (
        <>
          <div className="px-4 py-3">
            <p className="font-body mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
              Subject
            </p>
            <p className="font-body text-sm text-charcoal">{filledSubject}</p>
          </div>
          <div className="border-t border-gray-100 px-4 py-3">
            <p className="font-body mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
              Body
            </p>
            <pre className="font-body whitespace-pre-wrap text-sm text-gray-700">{filledBody}</pre>
          </div>
        </>
      )}
    </div>
  );
};
