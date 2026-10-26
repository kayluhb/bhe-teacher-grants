import {emailPlaceholdersForTemplate, fillEmailBody, fillTemplate} from '~/lib/email-template-fill';
import {EMAIL_TEMPLATES} from '~/lib/grant-process';
import {plainTextToEmailHtml} from '~/lib/html';
import {TREASURER_EMAIL} from '~/lib/login-email';
import {formatUsd} from '~/lib/money';

export const REIMBURSEMENT_FORM_URL = 'https://bheeagles.com/reimbursement';

export const COMMITTEE_NOTE_LABEL = 'Note from the committee';

const firstName = (name: string): string => name.trim().split(/\s+/)[0] || 'there';

const uniqueEmails = (...emails: string[]): string[] => [
  ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
];

export type DecisionEmailDraft = {
  body: string;
  subject: string;
};

export type GrantDecisionEmail = {
  html: string;
  replyTo: string[];
  subject: string;
  to: string;
};

const decisionTemplateId = (outcome: 'APPROVED' | 'REJECTED') =>
  outcome === 'APPROVED' ? 'approval' : 'rejection';

/** The approval or rejection letter, filled for one teacher. This is what the chair reviews. */
export const decisionEmailDraft = (input: {
  amount: number;
  chairmanName: string;
  outcome: 'APPROVED' | 'REJECTED';
  schoolYear: string;
  semester: 'FALL' | 'SPRING';
  teacherName: string;
  title: string;
}): DecisionEmailDraft => {
  const templateId = decisionTemplateId(input.outcome);
  const template = EMAIL_TEMPLATES.find((item) => item.id === templateId);
  if (!template) throw new Error(`Missing email template ${templateId}`);

  const values = emailPlaceholdersForTemplate(templateId, {
    chairName: input.chairmanName,
    school_year: input.schoolYear,
    semester: input.semester,
  });
  values['[NAME]'] = firstName(input.teacherName);
  values['[AMOUNT]'] = formatUsd(input.amount);
  values['[PROJECT TITLE]'] = input.title;

  return {
    body: fillEmailBody(template.body, values),
    subject: fillTemplate(template.subject, values),
  };
};

/** Rejection comments are stored on the grant and added to the end of the letter the chair already saw. */
export const withCommitteeNote = (body: string, note: string | null | undefined): string => {
  const trimmed = note?.trim();
  if (!trimmed) return body;
  return `${body.trimEnd()}\n\n${COMMITTEE_NOTE_LABEL}: ${trimmed}`;
};

export const teacherGrantDecisionEmail = (input: {
  amount: number;
  body?: string;
  chairmanEmail: string;
  chairmanName: string;
  outcome: 'APPROVED' | 'REJECTED';
  rejectionComment?: string | null;
  schoolYear: string;
  semester: 'FALL' | 'SPRING';
  subject?: string;
  teacherEmail: string;
  teacherName: string;
  title: string;
}): GrantDecisionEmail => {
  const draft = decisionEmailDraft(input);
  const subject = input.subject?.trim() || draft.subject;
  const letter = input.body?.replaceAll('\r\n', '\n').trim() || draft.body;
  const body =
    input.outcome === 'REJECTED' ? withCommitteeNote(letter, input.rejectionComment) : letter;

  return {
    html: plainTextToEmailHtml(body),
    replyTo:
      input.outcome === 'APPROVED'
        ? uniqueEmails(input.chairmanEmail, TREASURER_EMAIL)
        : uniqueEmails(input.chairmanEmail),
    subject,
    to: input.teacherEmail,
  };
};
