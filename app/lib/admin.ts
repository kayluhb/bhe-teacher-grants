import {newId} from '~/lib/db';
import {
  type CycleInput,
  fromDatetimeLocalValue,
  parseCycleSemester,
  validateCycleInput,
} from '~/lib/grant-cycle';
import {
  deleteUserError,
  displayRole,
  isLockedRosterEmail,
  normalizeEmail,
  persistableRole,
  rosterLockError,
} from '~/lib/login-email';
import {money} from '~/lib/money';
import {committeeAddError, committeeRemoveError, draftUserFromEmail} from '~/lib/people';
import {rosterAssignments, validateReviewerRoster} from '~/lib/reviewers';
import {normalizeRole, type Role} from '~/lib/roles';
import {validateSchoolYearDates, validateSchoolYearInput} from '~/lib/school-year';
import type {Result} from '~/lib/types';

const parseCycle = (
  input: CycleInput,
): Result<{
  budgetLimit: number;
  chairmanUserId: string;
  committeeUserIds: string[];
  endsAt: string;
  isActive: boolean;
  name: string;
  principalUserId: string;
  reviewEndsAt: string;
  reviewStartsAt: string;
  schoolYearId: string;
  semester: 'FALL' | 'SPRING';
  startsAt: string;
  treasurerUserId: string;
}> => {
  const error = validateCycleInput(input) ?? validateReviewerRoster(input);
  if (error) return {error};
  const semester = parseCycleSemester(input.semester);
  if (!semester) return {error: 'Pick Fall or Spring.'};
  return {
    budgetLimit: money(input.budgetLimit),
    chairmanUserId: input.chairmanUserId,
    committeeUserIds: input.committeeUserIds,
    endsAt: fromDatetimeLocalValue(input.endsAt),
    isActive: input.isActive,
    name: input.name.trim(),
    principalUserId: input.principalUserId,
    reviewEndsAt: fromDatetimeLocalValue(input.reviewEndsAt),
    reviewStartsAt: fromDatetimeLocalValue(input.reviewStartsAt),
    schoolYearId: input.schoolYearId,
    semester,
    startsAt: fromDatetimeLocalValue(input.startsAt),
    treasurerUserId: input.treasurerUserId,
  };
};

const reviewerStatements = (db: D1Database, cycleId: string, input: CycleInput) => [
  db.prepare('DELETE FROM cycle_reviewers WHERE cycle_id = ?').bind(cycleId),
  ...rosterAssignments(input).map((row) =>
    db
      .prepare('INSERT INTO cycle_reviewers (id, cycle_id, user_id, seat) VALUES (?, ?, ?, ?)')
      .bind(newId(), cycleId, row.userId, row.seat),
  ),
];

export type UserRow = {
  created_at: string;
  email: string;
  id: string;
  name: string;
  role: Role;
};

export const listUsers = async (db: D1Database) => {
  const rows = await db
    .prepare('SELECT id, email, name, role, created_at FROM users ORDER BY name')
    .all<UserRow>();
  return (rows.results ?? []).map((row) => ({
    ...row,
    role: displayRole(row.email, normalizeRole(row.role) ?? row.role),
  }));
};

export const listCycleReviewers = async (db: D1Database, cycleId: string) => {
  const rows = await db
    .prepare(
      `SELECT r.user_id, r.seat, u.name, u.email
       FROM cycle_reviewers r
       JOIN users u ON u.id = r.user_id
       WHERE r.cycle_id = ?
       ORDER BY r.seat, u.name`,
    )
    .bind(cycleId)
    .all<{email: string; name: string; seat: string; user_id: string}>();
  return rows.results ?? [];
};

const toUserRow = (row: UserRow): UserRow => ({
  ...row,
  role: displayRole(row.email, normalizeRole(row.role) ?? row.role),
});

export const findOrCreateUser = async (
  db: D1Database,
  input: {email: string; name?: string},
): Promise<Result<UserRow>> => {
  const email = normalizeEmail(input.email);
  const existing = await db
    .prepare('SELECT id, email, name, role, created_at FROM users WHERE email = ?')
    .bind(email)
    .first<UserRow>();
  if (existing) return toUserRow(existing);

  const draft = draftUserFromEmail(email);
  if ('error' in draft) return draft;
  const id = newId();
  const name = input.name?.trim() || draft.name;
  await db
    .prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
    .bind(id, draft.email, name, persistableRole(draft.role))
    .run();
  const created = await db
    .prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
    .bind(id)
    .first<UserRow>();
  if (!created) return {error: 'Could not add that person.'};
  return toUserRow(created);
};

export const addCommitteeMember = async (
  db: D1Database,
  input: {cycleId: string; email: string; name?: string},
): Promise<Result<UserRow>> => {
  const cycle = await db
    .prepare('SELECT id FROM grant_cycles WHERE id = ?')
    .bind(input.cycleId)
    .first();
  if (!cycle) return {error: 'Grant window not found.'};

  const user = await findOrCreateUser(db, input);
  if ('error' in user) return user;
  if (isLockedRosterEmail(user.email)) {
    return {error: 'Committee reviewers cannot also hold an officer seat.'};
  }

  const reviewers = await listCycleReviewers(db, input.cycleId);
  const officerIds = reviewers.filter((row) => row.seat !== 'committee').map((row) => row.user_id);
  const committeeIds = reviewers
    .filter((row) => row.seat === 'committee')
    .map((row) => row.user_id);
  const error = committeeAddError(user.id, officerIds, committeeIds);
  if (error) return {error};
  if (committeeIds.includes(user.id)) return user;

  await db
    .prepare('INSERT INTO cycle_reviewers (id, cycle_id, user_id, seat) VALUES (?, ?, ?, ?)')
    .bind(newId(), input.cycleId, user.id, 'committee')
    .run();
  return user;
};

export const removeCommitteeMember = async (
  db: D1Database,
  input: {cycleId: string; userId: string},
): Promise<Result<{ok: true}>> => {
  const reviewers = await listCycleReviewers(db, input.cycleId);
  const committee = reviewers.filter((row) => row.seat === 'committee');
  if (!committee.some((row) => row.user_id === input.userId)) {
    return {error: 'That person is not on this committee.'};
  }
  const error = committeeRemoveError(committee.length - 1);
  if (error) return {error};

  await db
    .prepare(
      `DELETE FROM cycle_reviewers WHERE cycle_id = ? AND user_id = ? AND seat = 'committee'`,
    )
    .bind(input.cycleId, input.userId)
    .run();
  return {ok: true};
};

export const updateUserRole = async (
  db: D1Database,
  input: {role: Role; userId: string},
): Promise<Result<{ok: true}>> => {
  const role = normalizeRole(input.role);
  if (!role) return {error: 'Invalid role.'};

  const existing = await db
    .prepare('SELECT email FROM users WHERE id = ?')
    .bind(input.userId)
    .first<{email: string}>();
  if (!existing) return {error: 'User not found.'};
  const lock = rosterLockError(existing.email, 'role');
  if (lock) return {error: lock};

  const result = await db
    .prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(persistableRole(role), input.userId)
    .run();
  if (!result.meta.changes) return {error: 'User not found.'};
  return {ok: true};
};

export const deleteUser = async (
  db: D1Database,
  input: {actorId: string; userId: string},
): Promise<Result<{ok: true}>> => {
  const existing = await db
    .prepare('SELECT email FROM users WHERE id = ?')
    .bind(input.userId)
    .first<{email: string}>();
  if (!existing) return {error: 'User not found.'};

  const grant = await db
    .prepare('SELECT id FROM grants WHERE teacher_id = ?')
    .bind(input.userId)
    .first();
  const error = deleteUserError({
    actorId: input.actorId,
    email: existing.email,
    hasGrants: Boolean(grant),
    userId: input.userId,
  });
  if (error) return {error};

  const seat = await db
    .prepare('SELECT seat FROM cycle_reviewers WHERE user_id = ?')
    .bind(input.userId)
    .first();
  if (seat) {
    return {error: 'Remove this person from grant windows before deleting them.'};
  }
  const vote = await db
    .prepare('SELECT 1 FROM grant_votes WHERE voter_id = ?')
    .bind(input.userId)
    .first();
  if (vote) return {error: 'This person has votes on file and cannot be removed.'};

  await db.batch([
    db.prepare('DELETE FROM grant_audit_logs WHERE actor_id = ?').bind(input.userId),
    db.prepare('DELETE FROM login_otps WHERE email = ?').bind(normalizeEmail(existing.email)),
    db.prepare('DELETE FROM users WHERE id = ?').bind(input.userId),
  ]);
  return {ok: true};
};

export const createSchoolYear = async (
  db: D1Database,
  input: {endsOn: string; isDefault: boolean; label: string; startsOn: string},
): Promise<Result<{id: string}>> => {
  const error = validateSchoolYearInput(input);
  if (error) return {error};
  const label = input.label.trim();

  const existing = await db.prepare('SELECT id FROM school_years WHERE id = ?').bind(label).first();
  if (existing) return {error: 'That school year already exists.'};

  const statements: D1PreparedStatement[] = [];
  if (input.isDefault) {
    statements.push(db.prepare('UPDATE school_years SET is_default = 0'));
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO school_years (id, label, starts_on, ends_on, is_default, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        label,
        label,
        input.startsOn,
        input.endsOn,
        input.isDefault ? 1 : 0,
        Number(label.slice(0, 4)),
      ),
  );
  await db.batch(statements);
  return {id: label};
};

export const updateSchoolYear = async (
  db: D1Database,
  input: {endsOn: string; isDefault: boolean; startsOn: string; yearId: string},
): Promise<Result<{ok: true}>> => {
  const error = validateSchoolYearDates(input);
  if (error) return {error};

  const existing = await db
    .prepare('SELECT id FROM school_years WHERE id = ?')
    .bind(input.yearId)
    .first();
  if (!existing) return {error: 'School year not found.'};

  const statements: D1PreparedStatement[] = [];
  if (input.isDefault) {
    statements.push(db.prepare('UPDATE school_years SET is_default = 0'));
  }
  statements.push(
    db
      .prepare(
        `UPDATE school_years
         SET starts_on = ?, ends_on = ?, is_default = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(input.startsOn, input.endsOn, input.isDefault ? 1 : 0, input.yearId),
  );
  await db.batch(statements);
  return {ok: true};
};

export const createCycle = async (
  db: D1Database,
  input: CycleInput,
): Promise<Result<{id: string}>> => {
  const parsed = parseCycle(input);
  if ('error' in parsed) return parsed;

  const clash = await db
    .prepare('SELECT id FROM grant_cycles WHERE school_year_id = ? AND semester = ?')
    .bind(parsed.schoolYearId, parsed.semester)
    .first();
  if (clash) return {error: 'That semester already has a grant window.'};

  const id = newId();
  const statements: D1PreparedStatement[] = [];
  if (parsed.isActive) {
    statements.push(db.prepare('UPDATE grant_cycles SET is_active = 0'));
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO grant_cycles (
           id, school_year_id, semester, name, budget_limit,
           starts_at, ends_at, is_active, review_starts_at, review_ends_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        parsed.schoolYearId,
        parsed.semester,
        parsed.name,
        parsed.budgetLimit,
        parsed.startsAt,
        parsed.endsAt,
        parsed.isActive ? 1 : 0,
        parsed.reviewStartsAt,
        parsed.reviewEndsAt,
      ),
    ...reviewerStatements(db, id, input),
  );
  await db.batch(statements);
  return {id};
};

export const updateCycle = async (
  db: D1Database,
  input: CycleInput & {cycleId: string},
): Promise<Result<{ok: true}>> => {
  const parsed = parseCycle(input);
  if ('error' in parsed) return parsed;

  const existing = await db
    .prepare('SELECT id FROM grant_cycles WHERE id = ?')
    .bind(input.cycleId)
    .first();
  if (!existing) return {error: 'Grant window not found.'};

  const clash = await db
    .prepare('SELECT id FROM grant_cycles WHERE school_year_id = ? AND semester = ? AND id != ?')
    .bind(parsed.schoolYearId, parsed.semester, input.cycleId)
    .first();
  if (clash) return {error: 'That semester already has a grant window.'};

  const statements: D1PreparedStatement[] = [];
  if (parsed.isActive) {
    statements.push(db.prepare('UPDATE grant_cycles SET is_active = 0'));
  }
  statements.push(
    db
      .prepare(
        `UPDATE grant_cycles
         SET school_year_id = ?, semester = ?, name = ?, budget_limit = ?,
             starts_at = ?, ends_at = ?, is_active = ?,
             review_starts_at = ?, review_ends_at = ?
         WHERE id = ?`,
      )
      .bind(
        parsed.schoolYearId,
        parsed.semester,
        parsed.name,
        parsed.budgetLimit,
        parsed.startsAt,
        parsed.endsAt,
        parsed.isActive ? 1 : 0,
        parsed.reviewStartsAt,
        parsed.reviewEndsAt,
        input.cycleId,
      ),
    ...reviewerStatements(db, input.cycleId, input),
  );
  await db.batch(statements);
  return {ok: true};
};

export const setActiveCycle = async (
  db: D1Database,
  cycleId: string,
): Promise<Result<{ok: true}>> => {
  const cycle = await db.prepare('SELECT id FROM grant_cycles WHERE id = ?').bind(cycleId).first();
  if (!cycle) return {error: 'Grant window not found.'};
  await db.batch([
    db.prepare('UPDATE grant_cycles SET is_active = 0'),
    db.prepare('UPDATE grant_cycles SET is_active = 1 WHERE id = ?').bind(cycleId),
  ]);
  return {ok: true};
};

export const listAuditLogs = async (db: D1Database, grantId: string) => {
  const rows = await db
    .prepare(
      `SELECT a.created_at, a.previous_status, a.new_status, a.notes, u.name AS actor_name, a.actor_role
       FROM grant_audit_logs a
       JOIN users u ON u.id = a.actor_id
       WHERE a.grant_id = ?
       ORDER BY a.created_at ASC`,
    )
    .bind(grantId)
    .all<{
      actor_name: string;
      actor_role: string;
      created_at: string;
      new_status: string;
      notes: string;
      previous_status: string | null;
    }>();
  return rows.results;
};
