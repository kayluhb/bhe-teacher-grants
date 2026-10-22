import {describe, expect, it} from 'vitest';
import {
  CHAIR_TITLE,
  cycleEmailPlaceholders,
  emailPlaceholders,
  emailPlaceholdersForTemplate,
  fillEmailBody,
  fillTemplate,
} from '~/lib/email-template-fill';
import {EMAIL_TEMPLATES} from '~/lib/grant-process';

describe('fillTemplate', () => {
  it('replaces every occurrence of each token', () => {
    expect(
      fillTemplate('Hello [SEMESTER] [YEAR] — [SEMESTER] again', {
        '[SEMESTER]': 'Fall',
        '[YEAR]': '2026-2027',
      }),
    ).toBe('Hello Fall 2026-2027 — Fall again');
  });
});

describe('fillEmailBody', () => {
  it('scrubs an empty phone clause', () => {
    expect(
      fillEmailBody('Reply or contact me at [PHONE]. Thanks!', {'[PHONE]': ''}),
    ).toBe('Reply. Thanks!');
  });
});

describe('cycleEmailPlaceholders', () => {
  it('maps cycle semester and school year to display tokens', () => {
    expect(
      cycleEmailPlaceholders({school_year: '2026-27', semester: 'SPRING'}),
    ).toEqual({
      '[PHONE]': '',
      '[SEMESTER]': 'Spring',
      '[YEAR]': '2026-2027',
      '[YOUR TITLE]': CHAIR_TITLE,
    });
  });
});

describe('emailPlaceholders', () => {
  const cycle = {
    applicationCount: 4,
    budgetLimit: 10_000,
    chairName: 'Chris Hall',
    endsAt: '2026-10-24T05:00:00.000Z',
    principalName: 'Kati Achtermann',
    requestedTotal: 8_250,
    reviewEndsAt: '2026-10-30T23:59:00.000Z',
    school_year: '2026-27',
    semester: 'FALL' as const,
  };

  it('fills cycle, chair, principal, and budget tokens', () => {
    const values = emailPlaceholders(cycle);
    expect(values['[SEMESTER]']).toBe('Fall');
    expect(values['[YEAR]']).toBe('2026-2027');
    expect(values['[YOUR NAME]']).toBe('Chris Hall');
    expect(values['[YOUR TITLE]']).toBe(CHAIR_TITLE);
    expect(values['[PRINCIPAL NAME]']).toBe('Kati Achtermann');
    expect(values['[#]']).toBe('4');
    expect(values['[$]']).toBe('$8,250.00');
    expect(values['$10,000']).toBe('$10,000.00');
    expect(values['[DEADLINE DATE]']).toMatch(/October/);
    expect(values['[DAY]']).toMatch(/day$/);
  });

  it('uses submission date for reminder and review date for evaluation', () => {
    const reminder = emailPlaceholdersForTemplate('reminder-kati', cycle);
    const evaluation = emailPlaceholdersForTemplate('evaluation-instructions', cycle);
    expect(reminder['[DATE]']).toMatch(/October 2[34]/);
    expect(reminder['[DATE]']).not.toContain('CDT');
    expect(evaluation['[DATE]']).toMatch(/October 30/);
    expect(evaluation['[DATE]']).toMatch(/CDT|CST/);
  });

  it('leaves no cycle/chair tokens in copyable templates', () => {
    const skipPerGrant = new Set(['[NAME]', '[AMOUNT]', '[PROJECT TITLE]']);
    for (const template of EMAIL_TEMPLATES) {
      const values = emailPlaceholdersForTemplate(template.id, cycle);
      const filled = fillEmailBody(template.body, values);
      const subject = fillTemplate(template.subject, values);
      for (const match of `${subject}\n${filled}`.matchAll(/\[[A-Z#$\s]+\]/g)) {
        expect(skipPerGrant.has(match[0])).toBe(true);
      }
    }
  });
});
