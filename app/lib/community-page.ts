import {COMMUNITY_GRANT_STATUSES, type SummaryItem} from '~/lib/community';
import type {Role} from '~/lib/roles';

export type CommunityCycle = {
  id: string;
  name: string;
  school_year: string;
  semester: 'FALL' | 'SPRING';
};

type Actor = {id: string; role: Role | string};

type ItemRow = {
  benefit_scope: string;
  description: string;
  grade: string;
  id: string;
  teacher_name: string;
};

const statusPlaceholders = COMMUNITY_GRANT_STATUSES.map(() => '?').join(', ');

const cycleSelect = `SELECT c.id, c.name, c.semester, y.label AS school_year
     FROM grant_cycles c
     JOIN school_years y ON y.id = c.school_year_id`;

export const listSummaryCycles = async (
  db: D1Database,
  actor: Actor,
): Promise<CommunityCycle[]> => {
  const rows =
    actor.role === 'admin' || actor.role === 'chair'
      ? await db
          .prepare(`${cycleSelect} ORDER BY y.sort_order DESC, c.semester ASC`)
          .all<CommunityCycle>()
      : await db
          .prepare(
            `${cycleSelect}
             JOIN cycle_reviewers r ON r.cycle_id = c.id AND r.user_id = ? AND r.seat = 'chairman'
             ORDER BY y.sort_order DESC, c.semester ASC`,
          )
          .bind(actor.id)
          .all<CommunityCycle>();
  return rows.results ?? [];
};

export const getSummaryCycle = async (db: D1Database, cycleId: string) =>
  db.prepare(`${cycleSelect} WHERE c.id = ?`).bind(cycleId).first<CommunityCycle>();

export const listSummaryItems = async (db: D1Database, cycleId: string): Promise<SummaryItem[]> => {
  const rows = await db
    .prepare(
      `SELECT i.id, i.item_description AS description, g.grade_level_subject AS grade,
              g.benefit_scope, u.name AS teacher_name
       FROM grant_items i
       JOIN grants g ON g.id = i.grant_id
       JOIN users u ON u.id = g.teacher_id
       WHERE g.cycle_id = ? AND g.status IN (${statusPlaceholders})
         AND i.is_ad_hoc = 0 AND i.item_status != 'CANCELLED'
       ORDER BY u.name, g.title, i.created_at`,
    )
    .bind(cycleId, ...COMMUNITY_GRANT_STATUSES)
    .all<ItemRow>();
  return (rows.results ?? []).flatMap((row) => {
    const description = row.description.trim();
    if (!description) return [];
    return [
      {
        benefitScope: row.benefit_scope,
        description,
        grade: row.grade,
        id: row.id,
        teacherName: row.teacher_name,
      },
    ];
  });
};
