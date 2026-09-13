import {semesterLabel} from '~/lib/school-year';

const SCHOOL_TIME_ZONE = 'America/Chicago';
const newCycleId = (): string => crypto.randomUUID().replaceAll('-', '');

export type SourceCycle = {
  budget_limit: number;
  ends_at: string;
  id: string;
  name: string;
  review_ends_at: string | null;
  review_starts_at: string | null;
  semester: 'FALL' | 'SPRING';
  starts_at: string;
};

export type SourceReviewer = {
  cycle_id: string;
  seat: string;
  user_id: string;
};

export type RolloverWindow = {
  budgetLimit: number;
  endsAt: string;
  name: string;
  reviewEndsAt: string | null;
  reviewStartsAt: string | null;
  semester: 'FALL' | 'SPRING';
  sourceCycleId: string;
  startsAt: string;
};

export type RolloverReviewer = {
  cycleId: string;
  seat: string;
  userId: string;
};

export type UpcomingSchoolYear = {
  endsOn: string;
  label: string;
  previousLabel: string;
  startsOn: string;
};

const chicagoParts = (now: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'numeric',
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {day: value('day'), month: value('month'), year: value('year')};
};

export const isJuly1InChicago = (now: Date): boolean => {
  const {day, month} = chicagoParts(now);
  return month === 7 && day === 1;
};

/** True when Chicago local date is July 1 or later in the calendar year. */
export const isOnOrAfterJuly1InChicago = (now: Date): boolean => {
  const {day, month} = chicagoParts(now);
  return month > 7 || (month === 7 && day >= 1);
};

const labelForStartYear = (startYear: number): string =>
  `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;

export const schoolYearForJuly1 = (now: Date): UpcomingSchoolYear => {
  const {year} = chicagoParts(now);
  return {
    endsOn: `${year + 1}-07-31`,
    label: labelForStartYear(year),
    previousLabel: labelForStartYear(year - 1),
    startsOn: `${year}-08-01`,
  };
};

export const shiftTimestampByYears = (value: string | null, years: number): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString();
};

export const buildRolloverWindows = (
  previousCycles: SourceCycle[],
  newLabel: string,
  existingSemesters: Set<'FALL' | 'SPRING'>,
): RolloverWindow[] => {
  const windows: RolloverWindow[] = [];
  for (const semester of ['FALL', 'SPRING'] as const) {
    if (existingSemesters.has(semester)) continue;
    const source = previousCycles.find((cycle) => cycle.semester === semester);
    if (!source) continue;
    const startsAt = shiftTimestampByYears(source.starts_at, 1);
    const endsAt = shiftTimestampByYears(source.ends_at, 1);
    if (!startsAt || !endsAt) continue;
    windows.push({
      budgetLimit: source.budget_limit,
      endsAt,
      name: `${semesterLabel(semester)} ${newLabel} Teacher Grants`,
      reviewEndsAt: shiftTimestampByYears(source.review_ends_at, 1),
      reviewStartsAt: shiftTimestampByYears(source.review_starts_at, 1),
      semester,
      sourceCycleId: source.id,
      startsAt,
    });
  }
  return windows;
};

export const buildRolloverReviewers = (
  windows: Array<{cycleId: string; sourceCycleId: string}>,
  reviewers: SourceReviewer[],
): RolloverReviewer[] => {
  const cycleIdBySource = new Map(windows.map((window) => [window.sourceCycleId, window.cycleId]));
  const seats: RolloverReviewer[] = [];
  for (const reviewer of reviewers) {
    const cycleId = cycleIdBySource.get(reviewer.cycle_id);
    if (!cycleId) continue;
    seats.push({
      cycleId,
      seat: reviewer.seat,
      userId: reviewer.user_id,
    });
  }
  return seats;
};

export const ensureSchoolYearRollover = async (input: {
  db: D1Database;
  now: Date;
}): Promise<{createdWindows: number; label: string | null}> => {
  const year = schoolYearForJuly1(input.now);
  const existingYear = await input.db
    .prepare('SELECT id FROM school_years WHERE id = ?')
    .bind(year.label)
    .first<{id: string}>();

  // July 1 always runs. After July 1, catch up only if the new year was never created
  // (missed cron). Before July 1 is a no-op.
  if (!isJuly1InChicago(input.now)) {
    if (!isOnOrAfterJuly1InChicago(input.now) || existingYear) {
      return {createdWindows: 0, label: null};
    }
  }

  const statements: D1PreparedStatement[] = [
    input.db.prepare('UPDATE school_years SET is_default = 0'),
  ];

  if (existingYear) {
    statements.push(
      input.db
        .prepare(
          `UPDATE school_years
           SET starts_on = ?, ends_on = ?, is_default = 1, updated_at = datetime('now')
           WHERE id = ?`,
        )
        .bind(year.startsOn, year.endsOn, year.label),
    );
  } else {
    statements.push(
      input.db
        .prepare(
          `INSERT INTO school_years (id, label, starts_on, ends_on, is_default, sort_order)
           VALUES (?, ?, ?, ?, 1, ?)`,
        )
        .bind(year.label, year.label, year.startsOn, year.endsOn, Number(year.label.slice(0, 4))),
    );
  }

  const existingSemesters = await input.db
    .prepare('SELECT semester FROM grant_cycles WHERE school_year_id = ?')
    .bind(year.label)
    .all<{semester: 'FALL' | 'SPRING'}>();
  const semesterSet = new Set((existingSemesters.results ?? []).map((row) => row.semester));

  const previousCycles = await input.db
    .prepare(
      `SELECT id, semester, name, budget_limit, starts_at, ends_at, review_starts_at, review_ends_at
       FROM grant_cycles WHERE school_year_id = ?`,
    )
    .bind(year.previousLabel)
    .all<SourceCycle>();

  const windows = buildRolloverWindows(previousCycles.results ?? [], year.label, semesterSet);
  const createdWindows = windows.map((window) => ({
    ...window,
    cycleId: newCycleId(),
  }));

  for (const window of createdWindows) {
    statements.push(
      input.db
        .prepare(
          `INSERT INTO grant_cycles (
             id, school_year_id, semester, name, budget_limit,
             starts_at, ends_at, is_active, review_starts_at, review_ends_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        )
        .bind(
          window.cycleId,
          year.label,
          window.semester,
          window.name,
          window.budgetLimit,
          window.startsAt,
          window.endsAt,
          window.reviewStartsAt,
          window.reviewEndsAt,
        ),
    );
  }

  if (createdWindows.length) {
    const sourceIds = createdWindows.map((window) => window.sourceCycleId);
    const placeholders = sourceIds.map(() => '?').join(', ');
    const previousReviewers = await input.db
      .prepare(
        `SELECT cycle_id, user_id, seat FROM cycle_reviewers WHERE cycle_id IN (${placeholders})`,
      )
      .bind(...sourceIds)
      .all<SourceReviewer>();

    for (const seat of buildRolloverReviewers(createdWindows, previousReviewers.results ?? [])) {
      statements.push(
        input.db
          .prepare('INSERT INTO cycle_reviewers (id, cycle_id, user_id, seat) VALUES (?, ?, ?, ?)')
          .bind(newCycleId(), seat.cycleId, seat.userId, seat.seat),
      );
    }
  }

  await input.db.batch(statements);
  return {createdWindows: createdWindows.length, label: year.label};
};
