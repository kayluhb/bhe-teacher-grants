import {hasReviewStarted, isReviewOpen} from '~/lib/grant-cycle';
import {escapeHtml} from '~/lib/html';
import {type ReviewerAssignment, requiredVoterIds} from '~/lib/reviewers';

export type NotificationEmail = {
  html: string;
  subject: string;
  to: string;
};

export type ReminderThreshold = '3d' | '1d';

type Reviewer = ReviewerAssignment & {email: string; name: string};

type CycleNotice = {
  ends_at: string;
  id: string;
  name: string;
  review_ends_at: string | null;
  review_opened_notified_at: string | null;
  review_starts_at: string | null;
  reviewers: Reviewer[];
};

type GrantNotice = {
  chairman_notified_at: string | null;
  cycle_id: string;
  id: string;
  status: string;
  teacher_id: string;
  title: string;
  voter_ids: string[];
};

export type ReviewOpenDelivery = {
  cycleId: string;
  emails: NotificationEmail[];
};

export type ReviewReminderDelivery = {
  email: NotificationEmail;
  stamp: {cycleId: string; threshold: ReminderThreshold; userId: string};
};

export type ReviewChairmanDelivery = {
  email: NotificationEmail;
  grantId: string;
};

export type ReviewNotificationPlan = {
  chairman: ReviewChairmanDelivery[];
  chairmanStamps: string[];
  emails: NotificationEmail[];
  open: ReviewOpenDelivery[];
  openStamps: string[];
  reminders: ReviewReminderDelivery[];
  reminderStamps: {cycleId: string; threshold: ReminderThreshold; userId: string}[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const voterReviewers = (reviewers: Reviewer[]) =>
  reviewers.filter(
    (row) => row.seat === 'treasurer' || row.seat === 'principal' || row.seat === 'committee',
  );

export const reminderThreshold = (
  now: Date,
  reviewEndsAt: string | null,
): ReminderThreshold | null => {
  if (!reviewEndsAt) return null;
  const remaining = Date.parse(reviewEndsAt) - now.getTime();
  if (remaining <= 0) return null;
  if (remaining <= DAY_MS) return '1d';
  if (remaining <= 3 * DAY_MS) return '3d';
  return null;
};

const flattenReviewDeliveries = (input: {
  chairman: ReviewChairmanDelivery[];
  open: ReviewOpenDelivery[];
  reminders: ReviewReminderDelivery[];
}): ReviewNotificationPlan => {
  const {chairman, open, reminders} = input;
  return {
    chairman,
    chairmanStamps: chairman.map((row) => row.grantId),
    emails: [
      ...open.flatMap((row) => row.emails),
      ...reminders.map((row) => row.email),
      ...chairman.map((row) => row.email),
    ],
    open,
    openStamps: open.map((row) => row.cycleId),
    reminders,
    reminderStamps: reminders.map((row) => row.stamp),
  };
};

export const planReviewNotifications = (input: {
  cycles: CycleNotice[];
  grants: GrantNotice[];
  now: Date;
  origin: string;
  sentReminders: {cycleId: string; threshold: ReminderThreshold; userId: string}[];
}): ReviewNotificationPlan => {
  const open: ReviewOpenDelivery[] = [];
  const reminders: ReviewReminderDelivery[] = [];
  const chairman: ReviewChairmanDelivery[] = [];
  const origin = input.origin.replace(/\/$/, '');

  for (const cycle of input.cycles) {
    if (!isReviewOpen(cycle, input.now) || cycle.review_opened_notified_at) continue;
    const emails: NotificationEmail[] = [];
    for (const reviewer of voterReviewers(cycle.reviewers)) {
      emails.push({
        html: `<p>Review is open for ${escapeHtml(cycle.name)}. Please finish your ranks before the deadline.</p><p><a href="${origin}/review">Open the review queue</a></p>`,
        subject: `Review is open: ${cycle.name}`,
        to: reviewer.email,
      });
    }
    if (emails.length > 0) open.push({cycleId: cycle.id, emails});
  }

  for (const cycle of input.cycles) {
    if (!isReviewOpen(cycle, input.now)) continue;
    const threshold = reminderThreshold(input.now, cycle.review_ends_at);
    if (!threshold) continue;
    for (const reviewer of voterReviewers(cycle.reviewers)) {
      const already = input.sentReminders.some(
        (row) =>
          row.cycleId === cycle.id && row.userId === reviewer.userId && row.threshold === threshold,
      );
      if (already) continue;
      const titles = input.grants
        .filter(
          (grant) =>
            grant.cycle_id === cycle.id &&
            grant.status === 'PENDING' &&
            grant.teacher_id !== reviewer.userId &&
            !grant.voter_ids.includes(reviewer.userId),
        )
        .map((grant) => grant.title);
      if (titles.length === 0) continue;
      const when = threshold === '1d' ? 'tomorrow' : 'in 3 days';
      reminders.push({
        email: {
          html: `<p>Review for ${escapeHtml(cycle.name)} closes ${when}. You still need to rank:</p><ul>${titles.map((title) => `<li>${escapeHtml(title)}</li>`).join('')}</ul><p><a href="${origin}/review">Open the review queue</a></p>`,
          subject: `Reminder: ${titles.length} grant${titles.length === 1 ? '' : 's'} still need your rank`,
          to: reviewer.email,
        },
        stamp: {cycleId: cycle.id, threshold, userId: reviewer.userId},
      });
    }
  }

  for (const grant of input.grants) {
    if (grant.status !== 'PENDING' || grant.chairman_notified_at) continue;
    const cycle = input.cycles.find((row) => row.id === grant.cycle_id);
    if (!cycle || !hasReviewStarted(cycle, input.now)) continue;
    const required = requiredVoterIds(cycle.reviewers, grant.teacher_id);
    const complete = required.length > 0 && required.every((id) => grant.voter_ids.includes(id));
    if (!complete) continue;
    const chair = cycle.reviewers.find((row) => row.seat === 'chairman');
    if (!chair) continue;
    chairman.push({
      email: {
        html: `<p>All required reviews are in for “${escapeHtml(grant.title)}”.</p><p><a href="${origin}/chair/${grant.id}">Record the official decision</a></p>`,
        subject: `Ready for your decision: ${grant.title}`,
        to: chair.email,
      },
      grantId: grant.id,
    });
  }

  return flattenReviewDeliveries({chairman, open, reminders});
};

const deliverRowsWithEmail = async <T extends {email: NotificationEmail}>(
  rows: T[],
  send: (email: NotificationEmail) => boolean | Promise<boolean>,
): Promise<T[]> => {
  const succeeded: T[] = [];
  for (const row of rows) {
    if (await send(row.email)) succeeded.push(row);
  }
  return succeeded;
};

/** Stamp only after the related email(s) succeed. Open notices require every recipient to succeed. */
export const deliverReviewNotifications = async (
  plan: ReviewNotificationPlan,
  send: (email: NotificationEmail) => boolean | Promise<boolean>,
): Promise<ReviewNotificationPlan> => {
  const open: ReviewOpenDelivery[] = [];
  for (const row of plan.open) {
    if (row.emails.length === 0) continue;
    const results = await Promise.all(row.emails.map((email) => send(email)));
    if (results.every(Boolean)) open.push(row);
  }

  const reminders = await deliverRowsWithEmail(plan.reminders, send);
  const chairman = await deliverRowsWithEmail(plan.chairman, send);

  return flattenReviewDeliveries({chairman, open, reminders});
};

const loadCycles = async (db: D1Database): Promise<CycleNotice[]> => {
  const cycles = await db
    .prepare(
      `SELECT id, name, ends_at, review_starts_at, review_ends_at, review_opened_notified_at
       FROM grant_cycles`,
    )
    .all<Omit<CycleNotice, 'reviewers'>>();
  const reviewers = await db
    .prepare(
      `SELECT r.cycle_id, r.user_id, r.seat, u.email, u.name
       FROM cycle_reviewers r
       JOIN users u ON u.id = r.user_id`,
    )
    .all<{
      cycle_id: string;
      email: string;
      name: string;
      seat: Reviewer['seat'];
      user_id: string;
    }>();
  const byCycle = new Map<string, Reviewer[]>();
  for (const row of reviewers.results ?? []) {
    const list = byCycle.get(row.cycle_id) ?? [];
    list.push({email: row.email, name: row.name, seat: row.seat, userId: row.user_id});
    byCycle.set(row.cycle_id, list);
  }
  return (cycles.results ?? []).map((cycle) => ({
    ...cycle,
    reviewers: byCycle.get(cycle.id) ?? [],
  }));
};

const loadGrants = async (db: D1Database): Promise<GrantNotice[]> => {
  const grants = await db
    .prepare(
      `SELECT id, cycle_id, teacher_id, title, status, chairman_notified_at
       FROM grants WHERE status = 'PENDING'`,
    )
    .all<Omit<GrantNotice, 'voter_ids'>>();
  const votes = await db
    .prepare('SELECT grant_id, voter_id FROM grant_votes')
    .all<{grant_id: string; voter_id: string}>();
  const voters = new Map<string, string[]>();
  for (const row of votes.results ?? []) {
    const list = voters.get(row.grant_id) ?? [];
    list.push(row.voter_id);
    voters.set(row.grant_id, list);
  }
  return (grants.results ?? []).map((grant) => ({
    ...grant,
    voter_ids: voters.get(grant.id) ?? [],
  }));
};

export const runReviewNotifications = async (input: {
  db: D1Database;
  now: Date;
  origin: string;
  send: (email: NotificationEmail) => boolean | Promise<boolean>;
}) => {
  const [cycles, grants, reminders] = await Promise.all([
    loadCycles(input.db),
    loadGrants(input.db),
    input.db
      .prepare('SELECT cycle_id, user_id, threshold FROM cycle_review_reminders')
      .all<{cycle_id: string; threshold: ReminderThreshold; user_id: string}>(),
  ]);
  const plan = planReviewNotifications({
    cycles,
    grants,
    now: input.now,
    origin: input.origin,
    sentReminders: (reminders.results ?? []).map((row) => ({
      cycleId: row.cycle_id,
      threshold: row.threshold,
      userId: row.user_id,
    })),
  });

  const delivered = await deliverReviewNotifications(plan, input.send);

  const statements: D1PreparedStatement[] = [
    ...delivered.openStamps.map((id) =>
      input.db
        .prepare(`UPDATE grant_cycles SET review_opened_notified_at = datetime('now') WHERE id = ?`)
        .bind(id),
    ),
    ...delivered.chairmanStamps.map((id) =>
      input.db
        .prepare(`UPDATE grants SET chairman_notified_at = datetime('now') WHERE id = ?`)
        .bind(id),
    ),
    ...delivered.reminderStamps.map((row) =>
      input.db
        .prepare(
          `INSERT OR IGNORE INTO cycle_review_reminders (cycle_id, user_id, threshold)
           VALUES (?, ?, ?)`,
        )
        .bind(row.cycleId, row.userId, row.threshold),
    ),
  ];
  if (statements.length) await input.db.batch(statements);
  return delivered;
};
