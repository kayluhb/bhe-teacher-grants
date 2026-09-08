import {formatSchoolDateTime} from '~/lib/grant-cycle';
import {EMAIL_TEMPLATES} from '~/lib/grant-process';
import {escapeHtml} from '~/lib/html';
import {formatUsd} from '~/lib/money';
import {type ReviewerSeat, VOTER_SEATS} from '~/lib/reviewers';
import {formatSchoolYearLong, semesterLabel} from '~/lib/school-year';
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

const fill = (template: string, values: Record<string, string>) => {
  let next = template;
  for (const [token, value] of Object.entries(values)) {
    next = next.replaceAll(token, value);
  }
  return next;
};

const toHtml = (body: string): string =>
  body
    .split(/\n\n+/)
    .map((paragraph) => {
      const lines = paragraph
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br>\n');
      return `<p>${lines}</p>`;
    })
    .join('\n');

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

  const semester = semesterLabel(input.semester);
  const year = formatSchoolYearLong(input.schoolYear);
  const deadline = input.reviewEndsAt
    ? formatSchoolDateTime(input.reviewEndsAt)
    : 'the review deadline';
  const principal = input.principalName.trim() || 'Principal';

  const values = {
    '[#]': String(input.applicationCount),
    '[$]': formatUsd(input.requestedTotal),
    '[DATE]': deadline,
    '[PHONE]': '',
    '[PRINCIPAL NAME]': principal,
    '[SEMESTER]': semester,
    '[YEAR]': year,
    '$10,000': formatUsd(input.budgetLimit),
  };

  const subject = fill(template.subject, values);
  const body = fill(template.body, values).replace(/\s+or contact me at\s*\./g, '.');

  return {
    html: toHtml(body),
    replyTo: [input.chairmanEmail.trim().toLowerCase()].filter(Boolean),
    subject,
    to: input.to,
  };
};
