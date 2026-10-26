import {emailPlaceholdersForTemplate, fillEmailBody, fillTemplate} from '~/lib/email-template-fill';
import {EMAIL_TEMPLATES} from '~/lib/grant-process';
import {plainTextToEmailHtml} from '~/lib/html';
import {type ReviewerSeat, VOTER_SEATS} from '~/lib/reviewers';
import type {Result} from '~/lib/types';

export type EvaluationEmail = {
  html: string;
  replyTo: string[];
  subject: string;
  to: string[];
};

export const evaluationVoterEmails = (
  reviewers: {email: string; seat: ReviewerSeat}[],
): string[] => {
  const emails: string[] = [];
  const seen = new Set<string>();
  for (const row of reviewers) {
    if (!VOTER_SEATS.includes(row.seat)) continue;
    const email = row.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
};

const evaluationTemplate = () =>
  EMAIL_TEMPLATES.find((item) => item.id === 'evaluation-instructions');

export const buildEvaluationInstructionsEmail = (input: {
  applicationCount: number;
  budgetLimit: number;
  chairmanEmail: string;
  principalName: string;
  requestedTotal: number;
  reviewEndsAt: string | null;
  schoolYear: string;
  semester: 'FALL' | 'SPRING';
  to: string[];
}): Result<EvaluationEmail> => {
  if (input.to.length === 0) {
    return {error: 'Add committee members before emailing evaluation instructions.'};
  }
  const template = evaluationTemplate();
  if (!template) return {error: 'Evaluation instructions template is missing.'};

  const values = emailPlaceholdersForTemplate('evaluation-instructions', {
    applicationCount: input.applicationCount,
    budgetLimit: input.budgetLimit,
    principalName: input.principalName.trim() || 'Principal',
    requestedTotal: input.requestedTotal,
    reviewEndsAt: input.reviewEndsAt,
    school_year: input.schoolYear,
    semester: input.semester,
  });

  const subject = fillTemplate(template.subject, values);
  const body = fillEmailBody(template.body, values);

  return {
    html: plainTextToEmailHtml(body),
    replyTo: [input.chairmanEmail.trim().toLowerCase()].filter(Boolean),
    subject,
    to: input.to,
  };
};

const DRAFT_SUBJECT_MAX = 300;
const DRAFT_BODY_MAX = 20_000;

export const evaluationEmailFromDraft = (input: {
  body: string;
  chairmanEmail: string;
  subject: string;
  to: string[];
}): Result<EvaluationEmail> => {
  if (input.to.length === 0) {
    return {error: 'Add committee members before emailing evaluation instructions.'};
  }
  const subject = input.subject.trim();
  const body = input.body.replaceAll('\r\n', '\n').trim();
  if (!subject || !body) return {error: 'Add a subject and message before sending.'};
  if (subject.length > DRAFT_SUBJECT_MAX) return {error: 'Subject is too long.'};
  if (body.length > DRAFT_BODY_MAX) return {error: 'Message is too long.'};
  return {
    html: plainTextToEmailHtml(body),
    replyTo: [input.chairmanEmail.trim().toLowerCase()].filter(Boolean),
    subject,
    to: input.to,
  };
};
