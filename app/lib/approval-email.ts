import {escapeHtml} from '~/lib/html';
import {TREASURER_EMAIL} from '~/lib/login-email';
import {formatUsd} from '~/lib/money';

export const REIMBURSEMENT_FORM_URL = 'https://bheeagles.com/reimbursement';

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';

const uniqueEmails = (...emails: string[]): string[] => [
  ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
];

export type GrantDecisionEmail = {
  html: string;
  replyTo: string[];
  subject: string;
  to: string;
};

export const teacherGrantDecisionEmail = (input: {
  amount: number;
  chairmanEmail: string;
  chairmanName: string;
  outcome: 'APPROVED' | 'REJECTED';
  teacherEmail: string;
  teacherName: string;
  title: string;
}): GrantDecisionEmail | null => {
  if (input.outcome !== 'APPROVED') return null;

  const greeting = firstName(input.teacherName) || 'there';
  const amount = escapeHtml(formatUsd(input.amount));
  const title = escapeHtml(input.title);
  const chair = escapeHtml(input.chairmanName);

  return {
    html: `<p>Hello ${escapeHtml(greeting)}!</p>
<p>Congratulations! Your grant request for ${amount} for your ${title} has been approved by the BHE PTA Grant Committee. We're excited to support your project!</p>
<p><strong>Next Steps — Choose Your Payment Option:</strong></p>
<p><strong>Option 1: Buy &amp; Get Reimbursed</strong><br>
Purchase the items yourself, then <a href="${REIMBURSEMENT_FORM_URL}">complete the online reimbursement form</a>. If you cannot upload receipts digitally: print the form, attach receipts, place them in the PTA folder in the main office, and email Caleb at ${TREASURER_EMAIL} when it is ready for pickup.<br>
Important: Use our tax-exempt form to avoid sales tax (we cannot reimburse taxes paid).</p>
<p><strong>Option 2: We Pay the Vendor</strong><br>
Get an invoice from your vendor and submit it with the reimbursement form (same process as Option 1). We'll send payment directly to the vendor.</p>
<p><strong>Option 3: We Purchase for You</strong><br>
Email our treasurer, Caleb — ${TREASURER_EMAIL} — and he'll handle the entire purchase. Great for Amazon orders — we have a tax-exempt account!</p>
<p><strong>Timeline:</strong> Please make your purchase and submit for reimbursement within 3-4 weeks.</p>
<p>Questions? Reply to this email (it reaches me and Caleb at ${TREASURER_EMAIL}). We're here to make this as easy as possible for you!</p>
<p>Thank you for all you do for our BHE students. We can't wait to see your project in action!</p>
<p>Best,<br>
${chair}<br>
BHE PTA Teacher Grant Chair</p>`,
    replyTo: uniqueEmails(input.chairmanEmail, TREASURER_EMAIL),
    subject: `Your grant request for ${input.title} has been approved`,
    to: input.teacherEmail,
  };
};
