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

describe('teacherGrantDecisionEmail', () => {
  it('returns null when the chairman rejects', () => {
    expect(teacherGrantDecisionEmail({...approved, outcome: 'REJECTED'})).toBeNull();
  });

  it('emails the teacher with the chairman and treasurer on reply-to', () => {
    const email = teacherGrantDecisionEmail(approved);
    expect(email?.to).toBe(approved.teacherEmail);
    expect(email?.replyTo).toEqual([approved.chairmanEmail, TREASURER_EMAIL]);
    expect(email?.subject).toBe(
      'Your grant request for Kinder Classroom Supplies has been approved',
    );
  });

  it('greets the teacher by first name and fills amount, title, and chair signature', () => {
    const html = teacherGrantDecisionEmail(approved)?.html ?? '';
    expect(html).toContain('Hello Caroline!');
    expect(html).toContain('$465.00');
    expect(html).toContain('Kinder Classroom Supplies');
    expect(html).toContain('approved by the BHE PTA Grant Committee');
    expect(html).toContain('Laurin Samuelson');
    expect(html).toContain('BHE PTA Teacher Grant Chair');
    expect(html).toContain(TREASURER_EMAIL);
    expect(html).toContain('https://bheeagles.com/reimbursement');
  });

  it('includes the three payment options and omits ad-hoc Amazon asides', () => {
    const html = teacherGrantDecisionEmail(approved)?.html ?? '';
    expect(html).toContain('Buy &amp; Get Reimbursed');
    expect(html).toContain('We Pay the Vendor');
    expect(html).toContain('We Purchase for You');
    expect(html).toContain('tax-exempt');
    expect(html).toContain('3-4 weeks');
    expect(html).not.toContain('@Caleb');
    expect(html).not.toContain('please purchase the items');
  });

  it('escapes teacher-provided title text', () => {
    const html =
      teacherGrantDecisionEmail({
        ...approved,
        title: 'Art & "Music" <supplies>',
      })?.html ?? '';
    expect(html).toContain('Art &amp; &quot;Music&quot; &lt;supplies&gt;');
    expect(html).not.toContain('Art & "Music" <supplies>');
  });
});
