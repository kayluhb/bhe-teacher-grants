import {normalizeRole, type Role} from '~/lib/auth';
import {newId} from '~/lib/db';
import {type CycleInput, parseCycleSemester, validateCycleInput} from '~/lib/grant-cycle';
import {displayRole, normalizeEmail, PRINCIPAL_EMAIL, persistableRole} from '~/lib/login-email';
import {money} from '~/lib/money';
import {rosterAssignments, validateReviewerRoster} from '~/lib/reviewers';
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
    endsAt: input.endsAt,
    isActive: input.isActive,
    name: input.name.trim(),
    principalUserId: input.principalUserId,
    reviewEndsAt: input.reviewEndsAt,
    reviewStartsAt: input.reviewStartsAt,
    schoolYearId: input.schoolYearId,
    semester,
    startsAt: input.startsAt,
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
  if (normalizeEmail(existing.email) === PRINCIPAL_EMAIL) {
    return {error: 'The principal role is tied to that AISD email.'};
  }

  const result = await db
    .prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(persistableRole(role), input.userId)
    .run();
  if (!result.meta.changes) return {error: 'User not found.'};
  return {ok: true};
};

export const createSchoolYear = async (
  db: D1Database,
  input: {endsOn: string; isDefault: boolean; label: string; startsOn: string},
): Promise<Result<{id: string}>> => {
  const label = input.label.trim();
  if (!/^\d{4}-\d{2}$/.test(label)) return {error: 'Use a label like 2026-27.'};
  if (!input.startsOn || !input.endsOn) return {error: 'Start and end dates are required.'};

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
