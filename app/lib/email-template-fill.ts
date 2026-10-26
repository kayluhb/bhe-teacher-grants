import {
  formatSchoolDate,
  formatSchoolDateTime,
  formatSchoolWeekday,
} from '~/lib/grant-cycle';
import {EMAIL_TEMPLATES} from '~/lib/grant-process';
import {formatUsd} from '~/lib/money';
import {formatSchoolYearLong, semesterLabel} from '~/lib/school-year';

export const CHAIR_TITLE = 'Grant Committee Chair';

export type EmailPlaceholderInput = {
  applicationCount?: number;
  budgetLimit?: number;
  chairName?: string;
  chairTitle?: string;
  endsAt?: string | null;
  principalName?: string;
  requestedTotal?: number;
  reviewEndsAt?: string | null;
  school_year: string;
  semester: 'FALL' | 'SPRING';
};

export const fillTemplate = (template: string, values: Record<string, string>) => {
  let next = template;
  for (const [token, value] of Object.entries(values)) {
    next = next.replaceAll(token, value);
  }
  return next;
};

/** Drop empty phone clause left by an unfilled [PHONE] token. */
export const scrubFilledEmailBody = (body: string) =>
  body.replace(/\s+or contact me at\s*\./g, '.');

export const fillEmailBody = (template: string, values: Record<string, string>) =>
  scrubFilledEmailBody(fillTemplate(template, values));

const deadlineTokens = (endsAt: string | null | undefined): Record<string, string> => {
  if (!endsAt) return {};
  return {
    '[DATE]': formatSchoolDate(endsAt),
    '[DAY]': formatSchoolWeekday(endsAt),
    '[DEADLINE DATE]': formatSchoolDate(endsAt),
  };
};

const reviewDateToken = (reviewEndsAt: string | null | undefined): Record<string, string> => {
  if (!reviewEndsAt) {
    return {'[DATE]': 'the review deadline'};
  }
  return {'[DATE]': formatSchoolDateTime(reviewEndsAt)};
};

/** Shared tokens for every template. [DATE]/[DAY] depend on the template — see below. */
export const emailPlaceholders = (input: EmailPlaceholderInput): Record<string, string> => {
  const values: Record<string, string> = {
    '[SEMESTER]': semesterLabel(input.semester),
    '[YEAR]': formatSchoolYearLong(input.school_year),
  };

  if (input.endsAt) {
    Object.assign(values, deadlineTokens(input.endsAt));
  }

  if (input.chairName?.trim()) {
    values['[YOUR NAME]'] = input.chairName.trim();
  }
  values['[YOUR TITLE]'] = input.chairTitle?.trim() || CHAIR_TITLE;

  if (input.principalName?.trim()) {
    values['[PRINCIPAL NAME]'] = input.principalName.trim();
  }

  if (input.applicationCount != null) {
    values['[#]'] = String(input.applicationCount);
  }
  if (input.requestedTotal != null) {
    values['[$]'] = formatUsd(input.requestedTotal);
  }
  if (input.budgetLimit != null) {
    values['$10,000'] = formatUsd(input.budgetLimit);
  }

  values['[PHONE]'] = '';

  return values;
};

/** Reminder uses submission [DATE]; evaluation uses review [DATE]. */
export const emailPlaceholdersForTemplate = (
  templateId: string,
  input: EmailPlaceholderInput,
): Record<string, string> => {
  const values = emailPlaceholders(input);

  if (templateId === 'evaluation-instructions') {
    Object.assign(values, reviewDateToken(input.reviewEndsAt));
  } else if (input.endsAt) {
    Object.assign(values, deadlineTokens(input.endsAt));
  }

  return values;
};

export const emailPlaceholdersByTemplateId = (
  input: EmailPlaceholderInput,
): Record<string, Record<string, string>> =>
  Object.fromEntries(
    EMAIL_TEMPLATES.map((template) => [
      template.id,
      emailPlaceholdersForTemplate(template.id, input),
    ]),
  );

/** @deprecated Prefer emailPlaceholders / emailPlaceholdersByTemplateId */
export const cycleEmailPlaceholders = (cycle: {
  budget_limit?: number;
  ends_at?: string | null;
  review_ends_at?: string | null;
  school_year: string;
  semester: 'FALL' | 'SPRING';
}): Record<string, string> =>
  emailPlaceholders({
    budgetLimit: cycle.budget_limit,
    endsAt: cycle.ends_at,
    reviewEndsAt: cycle.review_ends_at,
    school_year: cycle.school_year,
    semester: cycle.semester,
  });
