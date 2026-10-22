import {describe, expect, it} from 'vitest';
import {
  buildEvaluationInstructionsEmail,
  evaluationEmailFromDraft,
  evaluationVoterEmails,
} from '~/lib/evaluation-email';

describe('evaluationVoterEmails', () => {
  it('returns unique emails for voting seats and skips the chair', () => {
    expect(
      evaluationVoterEmails([
        {email: 'treasurer@bheeagles.com', seat: 'treasurer'},
        {email: 'principal@austinisd.org', seat: 'principal'},
        {email: 'faculty@austinisd.org', seat: 'committee'},
        {email: 'board@bheeagles.com', seat: 'committee'},
        {email: 'chair@bheeagles.com', seat: 'chairman'},
        {email: 'Treasurer@bheeagles.com', seat: 'treasurer'},
      ]),
    ).toEqual([
      'treasurer@bheeagles.com',
      'principal@austinisd.org',
      'faculty@austinisd.org',
      'board@bheeagles.com',
    ]);
  });
});

describe('buildEvaluationInstructionsEmail', () => {
  const base = {
    applicationCount: 3,
    budgetLimit: 10_000,
    chairmanEmail: 'chair@bheeagles.com',
    principalName: 'Kati Achtermann',
    requestedTotal: 12_450,
    reviewEndsAt: '2026-10-30T23:59:00Z',
    schoolYear: '2026-27',
    semester: 'FALL' as const,
    to: ['treasurer@bheeagles.com', 'principal@austinisd.org'],
  };

  it('fills cycle details and sets reply-to to the chair', () => {
    const email = buildEvaluationInstructionsEmail(base);
    expect(email.replyTo).toEqual(['chair@bheeagles.com']);
    expect(email.to).toEqual(base.to);
    expect(email.subject).toContain('Fall');
    expect(email.subject).toContain('2026-2027');
    expect(email.html).toContain('3 applications');
    expect(email.html).toContain('$12,450.00');
    expect(email.html).toContain('$10,000.00');
    expect(email.html).toContain('Kati Achtermann');
    expect(email.html).toMatch(/October 30, 2026/);
    expect(email.html).not.toContain('[PHONE]');
    expect(email.html).not.toContain('[SEMESTER]');
    expect(email.html).not.toContain('[#]');
  });

  it('errors when there are no recipients', () => {
    expect(buildEvaluationInstructionsEmail({...base, to: []})).toEqual({
      error: 'Add committee members before emailing evaluation instructions.',
    });
  });
});

describe('evaluationEmailFromDraft', () => {
  it('sends the chair’s edited subject and body', () => {
    const email = evaluationEmailFromDraft({
      body: 'Please rank by Friday.',
      chairmanEmail: 'chair@bheeagles.com',
      subject: 'Ranks due Friday',
      to: ['principal@austinisd.org'],
    });
    if ('error' in email) throw new Error(email.error);
    expect(email.subject).toBe('Ranks due Friday');
    expect(email.html).toContain('Please rank by Friday.');
    expect(email.replyTo).toEqual(['chair@bheeagles.com']);
    expect(email.to).toEqual(['principal@austinisd.org']);
  });

  it('rejects an empty draft', () => {
    expect(
      evaluationEmailFromDraft({
        body: '   ',
        chairmanEmail: 'chair@bheeagles.com',
        subject: 'Hello',
        to: ['principal@austinisd.org'],
      }),
    ).toEqual({error: 'Add a subject and message before sending.'});
  });
});
