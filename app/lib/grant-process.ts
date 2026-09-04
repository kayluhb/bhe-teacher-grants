// ---------------------------------------------------------------------------
// BHE PTA Teacher Grants – Process guide content
// Source of truth: "Teacher Grants: Procedures" document
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Cycle steps
// ---------------------------------------------------------------------------

export type ProcessStep = {
  id: string;
  label: string;
  description: string;
  /** App route this step's work lives on, if any */
  href?: string;
  /** Short link label */
  linkLabel?: string;
};

export const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 'publish',
    label: 'Publish the grant cycle',
    description:
      'Update the grant cycle dates in Admin (the submission window and review window), then set this cycle as active so teachers can submit. Make sure submission and review dates are correct.',
    href: '/admin',
    linkLabel: 'Open Admin',
  },
  {
    id: 'notify-kati',
    label: 'Notify Kati & send teacher email',
    description:
      'Email Kati Achtermann to let her know the program is live. Include the teacher launch email below so she can distribute it directly to staff. Follow up with a reminder before the deadline if applications are light.',
  },
  {
    id: 'committee',
    label: 'Recruit & confirm the Grant Committee',
    description:
      'Confirm your five-member committee through PTA. Assign seats in the Chair view. See the committee composition rules and alternate guidelines below.',
    href: '/chair',
    linkLabel: 'Open Chair',
  },
  {
    id: 'monitor',
    label: 'Monitor submissions',
    description:
      'Keep an eye on incoming applications. Send a reminder to Kati before the deadline if needed — use the reminder email template below.',
    href: '/grants',
    linkLabel: 'View all grants',
  },
  {
    id: 'vote',
    label: 'Request committee ranks',
    description:
      'When the review window opens, the committee receives an automated email. Send the evaluation instructions email (below) so reviewers understand the scoring criteria and their role.',
    href: '/review',
    linkLabel: 'Open Review',
  },
  {
    id: 'decide',
    label: 'Record decisions & email applicants',
    description:
      'After all required ranks are in, record the official outcome for each grant. The app automatically emails approved teachers with next steps. Send the rejection email (below) for any grants not selected.',
    href: '/chair',
    linkLabel: 'Open Chair',
  },
  {
    id: 'fulfill',
    label: 'Track reimbursements & spending',
    description:
      'Work with the Treasurer to track purchase submissions and send reminders to teachers about the 3–4 week reimbursement deadline.',
    href: '/fulfill',
    linkLabel: 'Open Fulfill',
  },
  {
    id: 'stories',
    label: 'Request outcome stories',
    description:
      'At cycle end, reach out to funded teachers for impact stories and photos to share with the PTA community.',
  },
];

// ---------------------------------------------------------------------------
// Committee composition
// ---------------------------------------------------------------------------

export type CommitteeSeat = {
  seat: string;
  pta_title: string;
  alternates: string;
};

export const COMMITTEE_SEATS: CommitteeSeat[] = [
  {
    seat: 'principal',
    pta_title: 'Principal',
    alternates: 'BHE professional staff member volunteer',
  },
  {
    seat: 'faculty-rep',
    pta_title: 'BHE PTA Faculty Representative',
    alternates: 'BHE professional staff member volunteer',
  },
  {
    seat: 'finance-chair',
    pta_title: 'BHE PTA Finance Committee Chair (Treasurer)',
    alternates: 'BHE PTA President or Vice-President',
  },
  {
    seat: 'board-1',
    pta_title: 'Additional PTA Board Member / Committee Chair',
    alternates: 'BHE PTA President or Vice-President',
  },
  {
    seat: 'board-2',
    pta_title: 'Additional PTA Board Member / Committee Chair',
    alternates: 'BHE PTA President or Vice-President',
  },
];

export const COMMITTEE_NOTE =
  'Alternates may serve in case of absence or conflict of interest. Alternates for the Principal and Faculty Rep pull from BHE professional staff volunteers; alternates for the Finance Chair and board members are the BHE PTA President and Vice-President.';

// ---------------------------------------------------------------------------
// Ranking criteria (the five evaluation questions)
// ---------------------------------------------------------------------------

export const RANKING_CRITERIA: string[] = [
  "Does this grant support students' health, well-being, or educational success?",
  'Is the proposal bringing new, unique, or innovative tools, techniques, materials, or instruction to BHE?',
  'How many students will this grant benefit?',
  'Has this individual, group, or project already received BHE PTA funding this school year (if applicable)?',
  'If YES to prior funding — could this request be funded by other means?',
];

// ---------------------------------------------------------------------------
// Priority guidelines
// ---------------------------------------------------------------------------

export type Priority = {
  value: 'HIGH' | 'MEDIUM' | 'LOW';
  label: string;
  guideline: string;
};

export const PRIORITY_GUIDELINES: Priority[] = [
  {
    value: 'HIGH',
    label: 'High Priority',
    guideline: 'Fund first — greatest student impact or most urgent need.',
  },
  {
    value: 'MEDIUM',
    label: 'Medium Priority',
    guideline: 'Fund if budget allows — valuable but less time-sensitive.',
  },
  {
    value: 'LOW',
    label: 'Low Priority',
    guideline: 'Fund last if budget remains — nice to have but least urgent.',
  },
];

export const PRIORITY_PREAMBLE =
  'There is no required distribution — mark as many "High Priority" as warranted. The goal is to fund all grants; rankings help sequence spending if the budget is tight or purchases need to be staged across the year.';

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

export type EmailTemplate = {
  id: string;
  label: string;
  /** Short description of when to send */
  when: string;
  subject: string;
  body: string;
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'launch-kati',
    label: 'Launch — email to Kati',
    when: 'Send to Kati Achtermann when the cycle goes live.',
    subject: 'Teacher Grant Program is Live – [SEMESTER] [YEAR]',
    body: `Hi, Kati!

I'm excited to help support our Teacher Grants this year through PTA.

Below is an email for the teachers for you to share, including the [SEMESTER] Teacher Grant portal details. We've set a deadline of [DEADLINE DATE]. Will still consider applications that come in after, but wanted to put a deadline on it to get this out the door quickly for the semester. If you think there's a concern with that date definitely let me know.

[YOUR NAME]`,
  },
  {
    id: 'launch-teachers',
    label: 'Launch — email to teachers (via Kati)',
    when: 'Kati distributes this to all BHE teachers.',
    subject: 'Teacher Grants Are Back – Up to $10,000 Available!',
    body: `Hi Teachers!

Ready for some good news? The Barton Hills PTA is excited to launch our Teacher Grant Program again this year!

Here's what you need to know:
• Up to $10,000 in total grants available
• Support for classroom needs, grade-level projects, or school-wide initiatives
• New teachers — we especially want to hear from you!
• Quick, simple application (seriously, it won't take long!)

Got an idea that would help your students? We want to fund it! Whether it's innovative classroom materials, new learning tools, or something bigger (or smaller) — if it benefits our kids, we're interested.

Deadline: [DEADLINE DATE]

Ready to apply? Use this grant portal — it's quick, we promise!
[PORTAL LINK]

Need help brainstorming or have questions? We're here for you! Email us at pta@bheeagles.com

Our goal is simple: give away ALL the grant money to our amazing BHE teachers. Don't let us down!

Thanks for all you do for our students.
The BHE PTA Grant Committee`,
  },
  {
    id: 'reminder-kati',
    label: 'Reminder — email to Kati (before deadline)',
    when: 'Send to Kati a few days before the submission deadline if applications are light.',
    subject: 'Reminder: Grant Deadline [DAY], [DATE]',
    body: `Hi Kati,

Just a quick heads-up — grant applications are due [DAY], [DATE] and we still have plenty of funding available. Would you be able to send another reminder to staff?

Feel free to use the template below:

——

Subject: Reminder: Grant Deadline This [DAY]!

Hi BHE Teachers!

Just a friendly reminder that grant applications are due THIS [DAY], [DATE] — and we still have plenty of funding available!

Stuck on ideas? Here are some projects your colleagues have gotten funded in the past:

Classroom Essentials:
• Creation station supplies and craft materials
• Books for classroom libraries and read-alouds
• Flexible seating (wobble stools, bean bags, standing desks)
• Technology tools (iPads, charging towers, typing software)

Innovative Learning:
• Screen printing supplies for hands-on art projects
• 3D printers for STEM projects
• STEAM day materials
• Dyslexia intervention materials and games

School-Wide Impact:
• SEL literature aligned with our curriculum
• Heritage month read-aloud collections
• Community art projects (Kindness Rocks!)
• Software licenses for all students

Wellness & Environment:
• Calming corner supplies
• Light covers to reduce harsh fluorescent lighting
• Movement tools (bouncy bands for chair feet, fidget toys)
• Sensory materials for students who need breaks

Grant amounts have ranged from $115 to $2,700 — no idea is too big or too small!

Remember:
✓ Classroom, grade-level, OR whole school projects welcome
✓ Quick application (really, it takes just minutes!)
✓ We want to give away ALL $10,000!

Use this grant portal to apply: [PORTAL LINK]

Questions or want to brainstorm? Email us at pta@bheeagles.com — we're happy to help!
The BHE PTA Grant Committee`,
  },
  {
    id: 'evaluation-instructions',
    label: 'Evaluation instructions — email to committee',
    when: 'Send when the review window opens, alongside the automatic system email.',
    subject: 'Grant Evaluation Instructions – [SEMESTER] [YEAR]',
    body: `Hello [SEMESTER] Grant Evaluation Team,

Thank you for volunteering to evaluate this round's teacher grant applications! We have [#] applications requesting a high-end estimated total of [$], with $10,000 available to award.

Your Task: Review each application and indicate your funding priority. We plan to fund as much as possible, and hopefully all requests. This scoring helps us sequence funding if we need to stage purchases across the year or if we're slightly over budget. Please complete your evaluation by [DATE].

Priority Guidelines:
For each grant, indicate:
  High Priority — Fund first (greatest student impact or most urgent need)
  Medium Priority — Fund if budget allows (valuable but less time-sensitive)
  Low Priority — Fund last if budget remains (nice to have but least urgent)

There's no required distribution — you can mark as many "High Priority" as you feel are warranted. We're not looking to reject grants; we're simply organizing our funding approach.

Principal's Role: [PRINCIPAL NAME], please review each application and flag any grants that shouldn't move forward for school-related reasons, along with a brief note.

How to Access the Review Portal:
1. Visit grants.bheeagles.com and sign in with your email
2. Open the Review queue
3. Rank each grant High, Medium, or Low (or Abstain if you have a conflict)

Questions or Comments? Reply to this email or contact me at [PHONE].

Thank you for helping us support our wonderful BHE teachers!`,
  },
  {
    id: 'approval',
    label: 'Approval — email to teacher',
    when: 'Sent automatically by the app when the chair records an approval. Shown here for reference.',
    subject: '🎉 Congratulations [NAME]! Your Grant Has Been Approved – [SEMESTER] [YEAR]',
    body: `Hello [NAME]!

Congratulations! Your grant request for [AMOUNT] for [PROJECT TITLE] has been approved by the BHE PTA Grant Committee. We're excited to support your project!

Next Steps — Choose Your Payment Option:

Option 1: Buy & Get Reimbursed
Purchase items yourself, then complete the online reimbursement form at bheeagles.com/reimbursement.
If unable to upload receipts digitally: Print form, attach receipts, and place in PTA folder (main office) and email the treasurer when it's ready for pickup.
Important: Use our tax-exempt form to avoid sales tax (we can't reimburse taxes paid).

Option 2: We Pay the Vendor
Get an invoice from your vendor. Submit with reimbursement form (same process as Option 1). We'll send payment directly to the vendor.

Option 3: We Purchase for You
Email our treasurer at treasurer@bheeagles.com and they'll handle the entire purchase process.
Great for Amazon orders — we have a tax-exempt account!

Timeline: Please make your purchase and submit reimbursement within 3–4 weeks.

Questions? Reply to this email or reach the treasurer at treasurer@bheeagles.com. We're here to make this as easy as possible for you!

Thank you for all you do for our BHE students. We can't wait to see your project in action!

Best,
[YOUR NAME]
[YOUR TITLE], BHE PTA`,
  },
  {
    id: 'rejection',
    label: 'Rejection — email to teacher',
    when: 'Sent automatically by the app when the chair records a rejection. Shown here for reference.',
    subject: 'Update on Your Grant Application – [SEMESTER] [YEAR]',
    body: `Hello [NAME],

Thank you for taking the time to submit a grant application to the BHE PTA. We truly appreciate your dedication to enhancing our students' learning experience.

Unfortunately, your grant request was not selected for funding in this round. This was a difficult decision — we received many wonderful applications and had to make tough choices with our available budget.

Please don't let this discourage you! We strongly encourage you to:
• Apply again in our next grant cycle
• Reach out to us at pta@bheeagles.com if you'd like feedback on your application
• Consider resubmitting the same project or a modified version next time

Your commitment to our BHE students means everything to us, and we hope you'll continue to share your innovative ideas with the Grant Committee.

Thank you again for all you do for our school community.

Warm regards,
[YOUR NAME]
BHE PTA Grant Committee

P.S. Keep an eye out for our next grant cycle announcement — we'd love to see another application from you!`,
  },
  {
    id: 'spring-launch',
    label: 'Spring cycle launch — email to teachers (via Kati)',
    when: 'Use instead of the standard launch template when opening the Spring cycle.',
    subject: '🌸 Teacher Grants Are Back – Spring Edition!',
    body: `Hi Teachers!

Ready for some good news to energize your spring semester? The Barton Hills PTA is excited to open applications for our Spring Teacher Grant Program!

Here's what you need to know (same as the Fall):
• Up to $10,000 in total grants available
• Support for classroom needs, grade-level projects, or school-wide initiatives
• New teachers — we especially want to hear from you!
• Quick, simple application (seriously, it won't take long!)

Have an idea that would make the rest of this school year even better for your students? We want to fund it! Whether it's innovative classroom materials, new learning tools, enrichment activities, or a special end-of-year project — if it benefits our kids, we're interested.

Deadline: [DEADLINE DATE]

Ready to apply? Use this grant portal:
[PORTAL LINK]

Need help brainstorming or have questions? We're happy to help!
Email us at pta@bheeagles.com

Thank you for everything you do for our students — this PTA is proud to support you.
The BHE PTA Grant Committee`,
  },
  {
    id: 'outcome-request',
    label: 'Outcome stories request — email to funded teachers',
    when: 'Send at cycle end to collect impact stories and photos.',
    subject: 'Share Your Grant Story! – [SEMESTER] [YEAR]',
    body: `Hi [NAME],

We hope your [PROJECT TITLE] grant has been put to great use! As we wrap up this grant cycle, we'd love to hear how it went.

Could you share a brief update?
• A sentence or two about how you used the grant
• Any student reactions or outcomes you're proud of
• A photo or two if you have them (optional but always appreciated!)

Your story helps us show the BHE community the impact of their PTA investment — and it inspires other teachers to apply next cycle.

Just reply to this email with your update whenever you have a moment.

Thank you so much for sharing your ideas with us!

[YOUR NAME]
BHE PTA Grant Committee`,
  },
];
