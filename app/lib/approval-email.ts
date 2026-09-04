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
  rejectionComment?: string | null;
  teacherEmail: string;
  teacherName: string;
  title: string;
}): GrantDecisionEmail => {
  const greeting = escapeHtml(firstName(input.teacherName) || 'there');
  const chair = escapeHtml(input.chairmanName);

  if (input.outcome === 'REJECTED') {
    return {
      html: `<p>Hello ${greeting},</p>
<p>Thank you for taking the time to submit a grant application to the BHE PTA. We truly appreciate your dedication to enhancing our students' learning experience.</p>
<p>Unfortunately, your grant request for <strong>${escapeHtml(input.title)}</strong> was not selected for funding in this round. This was a difficult decision — we received many wonderful applications and had to make tough choices with our available budget.</p>
${input.rejectionComment ? `<p><strong>Note from the committee:</strong> ${escapeHtml(input.rejectionComment)}</p>` : ''}
<p>Please don't let this discourage you! We strongly encourage you to:</p>
<ul>
<li>Apply again in our next grant cycle</li>
<li>Reach out to us at <a href="mailto:pta@bheeagles.com">pta@bheeagles.com</a> if you'd like feedback on your application</li>
<li>Consider resubmitting the same project or a modified version next time</li>
</ul>
<p>Your commitment to our BHE students means everything to us, and we hope you'll continue to share your innovative ideas with the Grant Committee.</p>
<p>Thank you again for all you do for our school community.</p>
<p>Warm regards,<br>
${chair}<br>
BHE PTA Grant Committee</p>
<p><em>Keep an eye out for our next grant cycle announcement — we'd love to see another application from you!</em></p>`,
      replyTo: uniqueEmails(input.chairmanEmail),
      subject: `Update on your grant application — ${escapeHtml(input.title)}`,
      to: input.teacherEmail,
    };
  }

  const amount = escapeHtml(formatUsd(input.amount));
  const title = escapeHtml(input.title);

  return {
    html: `<p>Hello ${greeting}!</p>
<p>Congratulations! Your grant request for ${amount} for your ${title} has been approved by the BHE PTA Grant Committee. We're excited to support your project!</p>
<p><strong>Next Steps — Choose Your Payment Option:</strong></p>
<p><strong>Option 1: Buy &amp; Get Reimbursed</strong><br>
Purchase the items yourself, then <a href="${REIMBURSEMENT_FORM_URL}">complete the online reimbursement form</a>. If you cannot upload receipts digitally: print the form, attach receipts, place them in the PTA folder in the main office, and email the treasurer at ${TREASURER_EMAIL} when it is ready for pickup.<br>
<em>Important: Use our tax-exempt form to avoid sales tax (we cannot reimburse taxes paid).</em></p>
<p><strong>Option 2: We Pay the Vendor</strong><br>
Get an invoice from your vendor and submit it with the reimbursement form (same process as Option 1). We'll send payment directly to the vendor.</p>
<p><strong>Option 3: We Purchase for You</strong><br>
Email our treasurer at ${TREASURER_EMAIL} and they'll handle the entire purchase. Great for Amazon orders — we have a tax-exempt account!</p>
<p><strong>Timeline:</strong> Please make your purchase and submit for reimbursement within 3–4 weeks.</p>
<p>Questions? Reply to this email or reach the treasurer at ${TREASURER_EMAIL}. We're here to make this as easy as possible for you!</p>
<p>Thank you for all you do for our BHE students. We can't wait to see your project in action!</p>
<p>Best,<br>
${chair}<br>
BHE PTA Grant Committee</p>`,
    replyTo: uniqueEmails(input.chairmanEmail, TREASURER_EMAIL),
    subject: `🎉 Congratulations! Your grant for "${input.title}" has been approved`,
    to: input.teacherEmail,
  };
};
