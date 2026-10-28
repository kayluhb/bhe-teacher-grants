import {
  COMMUNITY_BLURB_MAX,
  COMMUNITY_GRANT_STATUSES,
  communityItemLines,
  isCommunityPublished,
  storedCommunityBlurb,
  validateCommunityIntro,
} from '~/lib/community';
import type {Role} from '~/lib/roles';
import type {Result} from '~/lib/types';

export type CommunityCycle = {
  community_intro: string;
  community_published_at: string | null;
  id: string;
  name: string;
  school_year: string;
  semester: 'FALL' | 'SPRING';
};

export type CommunityGrantView = {
  community_blurb: string | null;
  grade_level_subject: string;
  id: string;
  impact_statement: string;
  items: string[];
  teacher_name: string;
  title: string;
};

type Actor = {id: string; role: Role | string};

const statusPlaceholders = COMMUNITY_GRANT_STATUSES.map(() => '?').join(', ');

const cycleSelect = `SELECT c.id, c.name, c.semester, c.community_intro, c.community_published_at,
            y.label AS school_year
     FROM grant_cycles c
     JOIN school_years y ON y.id = c.school_year_id`;

export const listEditableCycles = async (
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

const canEditCycle = async (db: D1Database, actor: Actor, cycleId: string): Promise<boolean> => {
  if (actor.role === 'admin' || actor.role === 'chair') {
    const cycle = await db
      .prepare('SELECT id FROM grant_cycles WHERE id = ?')
      .bind(cycleId)
      .first();
    return Boolean(cycle);
  }
  const seat = await db
    .prepare(
      `SELECT 1 AS ok FROM cycle_reviewers
       WHERE cycle_id = ? AND user_id = ? AND seat = 'chairman'`,
    )
    .bind(cycleId, actor.id)
    .first();
  return Boolean(seat);
};

export const getCommunityCycle = async (db: D1Database, cycleId: string) =>
  db.prepare(`${cycleSelect} WHERE c.id = ?`).bind(cycleId).first<CommunityCycle>();

export const listCommunityGrants = async (
  db: D1Database,
  cycleId: string,
): Promise<CommunityGrantView[]> => {
  const grants = await db
    .prepare(
      `SELECT g.id, g.title, g.grade_level_subject, g.impact_statement, g.community_blurb,
              u.name AS teacher_name
       FROM grants g
       JOIN users u ON u.id = g.teacher_id
       WHERE g.cycle_id = ? AND g.status IN (${statusPlaceholders})
       ORDER BY u.name, g.title`,
    )
    .bind(cycleId, ...COMMUNITY_GRANT_STATUSES)
    .all<Omit<CommunityGrantView, 'items'>>();
  const rows = grants.results ?? [];
  if (rows.length === 0) return [];

  const items = await db
    .prepare(
      `SELECT grant_id, item_description, is_ad_hoc, item_status
       FROM grant_items
       WHERE grant_id IN (${rows.map(() => '?').join(', ')})
       ORDER BY created_at ASC`,
    )
    .bind(...rows.map((grant) => grant.id))
    .all<{
      grant_id: string;
      is_ad_hoc: number;
      item_description: string;
      item_status: string;
    }>();
  const byGrant = new Map<
    string,
    {is_ad_hoc: number; item_description: string; item_status: string}[]
  >();
  for (const item of items.results ?? []) {
    const list = byGrant.get(item.grant_id) ?? [];
    list.push(item);
    byGrant.set(item.grant_id, list);
  }
  return rows.map((grant) => ({
    ...grant,
    items: communityItemLines(byGrant.get(grant.id) ?? []),
  }));
};

export const loadPublishedCommunity = async (db: D1Database, cycleId: string) => {
  const cycle = await getCommunityCycle(db, cycleId);
  if (!cycle || !isCommunityPublished(cycle)) return null;
  const grants = await listCommunityGrants(db, cycleId);
  return {cycle, grants};
};

export const saveCommunityPage = async (
  db: D1Database,
  input: {
    actor: Actor;
    blurbs: {blurb: string; grantId: string}[];
    cycleId: string;
    intro: string;
    publish: boolean;
  },
): Promise<Result<{ok: true}>> => {
  if (!(await canEditCycle(db, input.actor, input.cycleId))) return {error: 'Not allowed.'};

  const intro = validateCommunityIntro(input.intro);
  if ('error' in intro) return intro;

  const existing = await db
    .prepare(
      `SELECT id, impact_statement FROM grants
       WHERE cycle_id = ? AND status IN (${statusPlaceholders})`,
    )
    .bind(input.cycleId, ...COMMUNITY_GRANT_STATUSES)
    .all<{id: string; impact_statement: string}>();
  const impacts = new Map(
    (existing.results ?? []).map((grant) => [grant.id, grant.impact_statement]),
  );

  const updates: {blurb: string | null; grantId: string}[] = [];
  for (const row of input.blurbs) {
    const impact = impacts.get(row.grantId);
    if (impact == null) continue;
    if (row.blurb.trim().length > COMMUNITY_BLURB_MAX) return {error: 'A description is too long.'};
    updates.push({blurb: storedCommunityBlurb(row.blurb, impact), grantId: row.grantId});
  }

  await db.batch([
    db
      .prepare(
        `UPDATE grant_cycles
         SET community_intro = ?,
             community_published_at = CASE
               WHEN ? = 1 THEN COALESCE(community_published_at, datetime('now'))
               ELSE NULL
             END
         WHERE id = ?`,
      )
      .bind(intro.intro, input.publish ? 1 : 0, input.cycleId),
    ...updates.map((row) =>
      db
        .prepare(
          `UPDATE grants SET community_blurb = ?, updated_at = datetime('now')
           WHERE id = ? AND cycle_id = ?`,
        )
        .bind(row.blurb, row.grantId, input.cycleId),
    ),
  ]);
  return {ok: true};
};
