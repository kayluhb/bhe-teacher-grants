import {isSubmissionOpen} from '~/lib/grant-cycle';
import {escapeHtml} from '~/lib/html';
import {type ReminderThreshold, reminderThreshold, type NotificationEmail} from '~/lib/review-notifications';
import type {ReviewerAssignment} from '~/lib/reviewers';

type Reviewer = ReviewerAssignment & {email: string; name: string};

type CycleDigest = {
  ends_at: string;
  id: string;
  is_active: number;
  name: string;
  review_closed_notified_at: string | null;
  review_ends_at: string | null;
  reviewers: Reviewer[];
  starts_at: string;
  submission_closed_notified_at: string | null;
};

type GrantDigest = {
  chair_digest_notified_at: string | null;
  cycle_id: string;
  id: string;
  status: string;
  title: string;
};

export type ChairDigestPlan = {
  emails: NotificationEmail[];
  grantStamps: string[];
  reviewClosedStamps: string[];
  submissionClosedStamps: string[];
  submissionReminderStamps: {cycleId: string; threshold: ReminderThreshold}[];
};

const buildDigestHtml = (input: {
  approaching: ReminderThreshold | null;
  cycleName: string;
  newGrants: {id: string; title: string}[];
  origin: string;
  reviewClosed: boolean;
  submissionClosed: boolean;
}): string => {
  const origin = input.origin.replace(/\/$/, '');
  const parts: string[] = [`<p>Update for ${escapeHtml(input.cycleName)}.</p>`];

  if (input.newGrants.length > 0) {
    const count = input.newGrants.length;
    parts.push(
      `<p>${count} new grant${count === 1 ? '' : 's'} submitted:</p>`,
      `<ul>${input.newGrants
        .map(
          (grant) =>
            `<li><a href="${origin}/chair/${grant.id}">${escapeHtml(grant.title)}</a></li>`,
        )
        .join('')}</ul>`,
    );
  }

  if (input.approaching) {
    const when = input.approaching === '1d' ? 'tomorrow' : 'in 3 days';
    parts.push(
      `<p>The submission window closes ${when}. Teachers can still submit.</p>`,
    );
  }

  if (input.submissionClosed) {
    parts.push(`<p>The submission window has closed.</p>`);
  }

  if (input.reviewClosed) {
    parts.push(`<p>The review window has closed.</p>`);
  }

  parts.push(`<p><a href="${origin}/chair">Open the chair queue</a></p>`);
  return parts.join('');
};

export const planChairDigest = (input: {
  cycles: CycleDigest[];
  grants: GrantDigest[];
  now: Date;
  origin: string;
  sentSubmissionReminders: {cycleId: string; threshold: ReminderThreshold}[];
}): ChairDigestPlan => {
  const emails: NotificationEmail[] = [];
  const grantStamps: string[] = [];
  const submissionClosedStamps: string[] = [];
  const reviewClosedStamps: string[] = [];
  const submissionReminderStamps: {cycleId: string; threshold: ReminderThreshold}[] = [];
  const origin = input.origin.replace(/\/$/, '');

  for (const cycle of input.cycles) {
    const chairman = cycle.reviewers.find((row) => row.seat === 'chairman');
    if (!chairman?.email) continue;

    const newGrants = input.grants.filter(
      (grant) =>
        grant.cycle_id === cycle.id &&
        grant.status === 'PENDING' &&
        !grant.chair_digest_notified_at,
    );

    const submissionStillOpen = isSubmissionOpen(
      {ends_at: cycle.ends_at, is_active: cycle.is_active, starts_at: cycle.starts_at},
      input.now,
    );
    const threshold = submissionStillOpen
      ? reminderThreshold(input.now, cycle.ends_at)
      : null;
    const alreadyReminded =
      threshold != null &&
      input.sentSubmissionReminders.some(
        (row) => row.cycleId === cycle.id && row.threshold === threshold,
      );
    const approaching = threshold && !alreadyReminded ? threshold : null;

    const submissionClosed =
      !cycle.submission_closed_notified_at &&
      Date.parse(cycle.ends_at) <= input.now.getTime();
    const reviewClosed =
      !!cycle.review_ends_at &&
      !cycle.review_closed_notified_at &&
      Date.parse(cycle.review_ends_at) <= input.now.getTime();

    if (
      newGrants.length === 0 &&
      !approaching &&
      !submissionClosed &&
      !reviewClosed
    ) {
      continue;
    }

    for (const grant of newGrants) grantStamps.push(grant.id);
    if (approaching) {
      submissionReminderStamps.push({cycleId: cycle.id, threshold: approaching});
    }
    if (submissionClosed) submissionClosedStamps.push(cycle.id);
    if (reviewClosed) reviewClosedStamps.push(cycle.id);

    emails.push({
      html: buildDigestHtml({
        approaching,
        cycleName: cycle.name,
        newGrants: newGrants.map((grant) => ({id: grant.id, title: grant.title})),
        origin,
        reviewClosed,
        submissionClosed,
      }),
      subject: `Chair update: ${cycle.name}`,
      to: chairman.email,
    });
  }

  return {
    emails,
    grantStamps,
    reviewClosedStamps,
    submissionClosedStamps,
    submissionReminderStamps,
  };
};

const loadCycles = async (db: D1Database): Promise<CycleDigest[]> => {
  const cycles = await db
    .prepare(
      `SELECT id, name, starts_at, ends_at, is_active,
              review_ends_at, submission_closed_notified_at, review_closed_notified_at
       FROM grant_cycles`,
    )
    .all<Omit<CycleDigest, 'reviewers'>>();
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

const loadGrants = async (db: D1Database): Promise<GrantDigest[]> => {
  const grants = await db
    .prepare(
      `SELECT id, cycle_id, title, status, chair_digest_notified_at
       FROM grants WHERE status = 'PENDING' AND chair_digest_notified_at IS NULL`,
    )
    .all<GrantDigest>();
  return grants.results ?? [];
};

export const runChairDigest = async (input: {
  db: D1Database;
  now: Date;
  origin: string;
  send: (email: NotificationEmail) => void;
}) => {
  const [cycles, grants, reminders] = await Promise.all([
    loadCycles(input.db),
    loadGrants(input.db),
    input.db
      .prepare('SELECT cycle_id, threshold FROM cycle_chair_submission_reminders')
      .all<{cycle_id: string; threshold: ReminderThreshold}>(),
  ]);
  const plan = planChairDigest({
    cycles,
    grants,
    now: input.now,
    origin: input.origin,
    sentSubmissionReminders: (reminders.results ?? []).map((row) => ({
      cycleId: row.cycle_id,
      threshold: row.threshold,
    })),
  });

  for (const email of plan.emails) input.send(email);

  const statements: D1PreparedStatement[] = [
    ...plan.grantStamps.map((id) =>
      input.db
        .prepare(`UPDATE grants SET chair_digest_notified_at = datetime('now') WHERE id = ?`)
        .bind(id),
    ),
    ...plan.submissionClosedStamps.map((id) =>
      input.db
        .prepare(
          `UPDATE grant_cycles SET submission_closed_notified_at = datetime('now') WHERE id = ?`,
        )
        .bind(id),
    ),
    ...plan.reviewClosedStamps.map((id) =>
      input.db
        .prepare(
          `UPDATE grant_cycles SET review_closed_notified_at = datetime('now') WHERE id = ?`,
        )
        .bind(id),
    ),
    ...plan.submissionReminderStamps.map((row) =>
      input.db
        .prepare(
          `INSERT OR IGNORE INTO cycle_chair_submission_reminders (cycle_id, threshold)
           VALUES (?, ?)`,
        )
        .bind(row.cycleId, row.threshold),
    ),
  ];
  if (statements.length) await input.db.batch(statements);
  return plan;
};
