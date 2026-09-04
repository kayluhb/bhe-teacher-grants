import {describe, expect, it} from 'vitest';
import {teacherGrantDecisionEmail} from '~/lib/approval-email';
import {TREASURER_EMAIL} from '~/lib/login-email';

const approved = {
  amount: 465,
  chairmanEmail: 'laurin@bheeagles.com',
  chairmanName: 'Laurin Samuelson',
  outcome: 'APPROVED' as const,
  teacherEmail: 'caroline.smith@austinisd.org',
  teacherName: 'Caroline Smith',
  title: 'Kinder Classroom Supplies',
};

const rejected = {
  ...approved,
  outcome: 'REJECTED' as const,
};

describe('teacherGrantDecisionEmail — approval', () => {
  it('emails the teacher with the chairman and treasurer on reply-to', () => {
    const email = teacherGrantDecisionEmail(approved);
    expect(email.to).toBe(approved.teacherEmail);
    expect(email.replyTo).toEqual([approved.chairmanEmail, TREASURER_EMAIL]);
    expect(email.subject).toContain('Congratulations');
    expect(email.subject).toContain('approved');
  });

  it('greets the teacher by first name and fills amount, title, and committee signature', () => {
    const html = teacherGrantDecisionEmail(approved).html;
    expect(html).toContain('Hello Caroline!');
    expect(html).toContain('$465.00');
    expect(html).toContain('Kinder Classroom Supplies');
    expect(html).toContain('approved by the BHE PTA Grant Committee');
    expect(html).toContain('Laurin Samuelson');
    expect(html).toContain('BHE PTA Grant Committee');
    expect(html).toContain(TREASURER_EMAIL);
    expect(html).toContain('https://bheeagles.com/reimbursement');
  });

  it('includes the three payment options', () => {
    const html = teacherGrantDecisionEmail(approved).html;
    expect(html).toContain('Buy &amp; Get Reimbursed');
    expect(html).toContain('We Pay the Vendor');
    expect(html).toContain('We Purchase for You');
    expect(html).toContain('tax-exempt');
    expect(html).toContain('3–4 weeks');
  });

  it('escapes teacher-provided title text', () => {
    const html = teacherGrantDecisionEmail({
      ...approved,
      title: 'Art & "Music" <supplies>',
    }).html;
    expect(html).toContain('Art &amp; &quot;Music&quot; &lt;supplies&gt;');
    expect(html).not.toContain('Art & "Music" <supplies>');
  });
});

describe('teacherGrantDecisionEmail — rejection', () => {
  it('sends a rejection email (no longer returns null)', () => {
    const email = teacherGrantDecisionEmail(rejected);
    expect(email).not.toBeNull();
    expect(email.to).toBe(rejected.teacherEmail);
  });

  it('emails teacher with chair on reply-to (no treasurer for rejection)', () => {
    const email = teacherGrantDecisionEmail(rejected);
    expect(email.replyTo).toEqual([rejected.chairmanEmail]);
  });

  it('has an appropriate subject', () => {
    const email = teacherGrantDecisionEmail(rejected);
    expect(email.subject).toContain('Kinder Classroom Supplies');
    expect(email.subject).not.toContain('Congratulations');
  });

  it('includes encouragement to reapply and contact info', () => {
    const html = teacherGrantDecisionEmail(rejected).html;
    expect(html).toContain('Hello Caroline');
    expect(html).toContain('Laurin Samuelson');
    expect(html).toContain('next grant cycle');
    expect(html).toContain('pta@bheeagles.com');
  });

  it('includes rejection comment when provided', () => {
    const html = teacherGrantDecisionEmail({
      ...rejected,
      rejectionComment: 'Similar project funded last semester.',
    }).html;
    expect(html).toContain('Similar project funded last semester.');
  });

  it('omits committee note block when no comment', () => {
    const html = teacherGrantDecisionEmail(rejected).html;
    expect(html).not.toContain('Note from the committee');
  });

  it('escapes rejection comment', () => {
    const html = teacherGrantDecisionEmail({
      ...rejected,
      rejectionComment: '<script>alert(1)</script>',
    }).html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
