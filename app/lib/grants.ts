import type {User} from '~/lib/auth';
import {newId} from '~/lib/db';
import {type ListSearch, pickListFilters} from '~/lib/filters';
import {
  type AdHocItemInput,
  type FulfillmentItemInput,
  sumActuals,
  variance,
} from '~/lib/fulfillment';
import {validateGrantNarrative} from '~/lib/grant-application';
import {hasReviewStarted, isReviewOpen, isSubmissionOpen} from '~/lib/grant-cycle';
import {finiteMoney, money} from '~/lib/money';
import {asinFromUrl, itemImageUrl, stackPreviewImages} from '~/lib/product-preview';
import {type ReviewerAssignment, type ReviewerSeat, requiredVoterIds} from '~/lib/reviewers';
import type {Actor, CycleRow, GrantItemInput, GrantItemRow, GrantRow, Result} from '~/lib/types';
import {tallyVotes, validateChairDecision} from '~/lib/votes';
import {normalizeWishlistUrl} from '~/lib/wishlist';

const GRANT_SELECT = `
  SELECT g.*, u.name AS teacher_name, u.email AS teacher_email,
         c.semester, c.school_year_id, y.label AS school_year
  FROM grants g
  JOIN users u ON u.id = g.teacher_id
  JOIN grant_cycles c ON c.id = g.cycle_id
  JOIN school_years y ON y.id = c.school_year_id
`;

export const listSchoolYears = async (db: D1Database) => {
  const rows = await db
    .prepare(
      'SELECT id, label, starts_on, ends_on, is_default, sort_order FROM school_years ORDER BY sort_order DESC',
    )
    .all<{
      ends_on: string;
      id: string;
      is_default: number;
      label: string;
      sort_order: number;
      starts_on: string;
    }>();
  return rows.results;
};

export const listCycles = async (db: D1Database) => {
  const rows = await db
    .prepare(
      `SELECT c.*, y.label AS school_year
       FROM grant_cycles c
       JOIN school_years y ON y.id = c.school_year_id
       ORDER BY y.sort_order DESC, c.semester ASC`,
    )
    .all<CycleRow>();
  return rows.results;
};

export const listChairCycles = async (db: D1Database, userId: string) => {
  const rows = await db
    .prepare(
      `SELECT c.*, y.label AS school_year
       FROM grant_cycles c
       JOIN school_years y ON y.id = c.school_year_id
       JOIN cycle_reviewers r ON r.cycle_id = c.id AND r.user_id = ? AND r.seat = 'chairman'
       ORDER BY y.sort_order DESC, c.semester ASC`,
    )
    .bind(userId)
    .all<CycleRow>();
  return rows.results ?? [];
};

export const getActiveCycle = async (db: D1Database) => {
  return db
    .prepare(
      `SELECT c.*, y.label AS school_year
       FROM grant_cycles c
       JOIN school_years y ON y.id = c.school_year_id
       WHERE c.is_active = 1
       LIMIT 1`,
    )
    .first<CycleRow>();
};

export const getCycle = async (db: D1Database, cycleId: string) => {
  return db
    .prepare(
      `SELECT c.*, y.label AS school_year
       FROM grant_cycles c
       JOIN school_years y ON y.id = c.school_year_id
       WHERE c.id = ?
       LIMIT 1`,
    )
    .bind(cycleId)
    .first<CycleRow>();
};

export const resolveListFilters = async (db: D1Database, search: ListSearch) => {
  const [years, cycles] = await Promise.all([listSchoolYears(db), listCycles(db)]);
  return pickListFilters(years, cycles, search);
};

export const listGrants = async (
  db: D1Database,
  filters: {
    cycleId?: string;
    schoolYearId?: string;
    semester?: 'FALL' | 'SPRING';
    teacherId?: string;
  },
) => {
  const parts: string[] = [];
  const bindings: string[] = [];
  if (filters.teacherId) {
    parts.push('g.teacher_id = ?');
    bindings.push(filters.teacherId);
  }
  if (filters.cycleId) {
    parts.push('g.cycle_id = ?');
    bindings.push(filters.cycleId);
  }
  if (filters.schoolYearId) {
    parts.push('c.school_year_id = ?');
    bindings.push(filters.schoolYearId);
  }
  if (filters.semester) {
    parts.push('c.semester = ?');
    bindings.push(filters.semester);
  }
  const where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
  const rows = await db
    .prepare(`${GRANT_SELECT} ${where} ORDER BY g.created_at DESC`)
    .bind(...bindings)
    .all<GrantRow>();
  return attachPreviewImages(db, rows.results ?? []);
};

export const getGrant = async (db: D1Database, grantId: string) => {
  return db.prepare(`${GRANT_SELECT} WHERE g.id = ?`).bind(grantId).first<GrantRow>();
};

export const userCanAccessGrant = async (
  db: D1Database,
  user: User,
  grant: GrantRow,
): Promise<boolean> => {
  if (user.role === 'admin') return true;
  if (grant.teacher_id === user.id) return true;
  const reviewers = await listReviewerRows(db, grant.cycle_id);
  return reviewers.some((row) => row.userId === user.id);
};

const attachPreviewImages = async (db: D1Database, grants: GrantRow[]): Promise<GrantRow[]> => {
  if (grants.length === 0) return grants;
  const rows = await db
    .prepare(
      `SELECT grant_id, asin, image_url FROM grant_items
       WHERE grant_id IN (${grants.map(() => '?').join(', ')}) AND is_ad_hoc = 0
       ORDER BY created_at ASC`,
    )
    .bind(...grants.map((grant) => grant.id))
    .all<{asin: string | null; grant_id: string; image_url: string | null}>();
  const stacks = stackPreviewImages(rows.results ?? []);
  return grants.map((grant) => ({...grant, preview_images: stacks[grant.id] ?? []}));
};

export const listGrantItems = async (db: D1Database, grantId: string) => {
  const rows = await db
    .prepare('SELECT * FROM grant_items WHERE grant_id = ? ORDER BY is_ad_hoc ASC, created_at ASC')
    .bind(grantId)
    .all<GrantItemRow>();
  return rows.results;
};

const requestedTotal = (items: GrantItemInput[]) =>
  money(items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0));

const writeAudit = (
  db: D1Database,
  grantId: string,
  actor: Actor,
  previous: string | null,
  next: string,
  notes: string,
) =>
  db
    .prepare(
      `INSERT INTO grant_audit_logs (id, grant_id, actor_id, actor_role, previous_status, new_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(newId(), grantId, actor.id, actor.role, previous, next, notes);

const insertItems = (db: D1Database, grantId: string, items: GrantItemInput[]) =>
  items.map((item) => {
    const asin = item.asin?.trim() || asinFromUrl(item.vendor_url ?? '') || null;
    const imageUrl = item.image_url?.trim() || itemImageUrl({asin, image_url: null});
    return db
      .prepare(
        `INSERT INTO grant_items (
           id, grant_id, item_description, quantity, unit_price, vendor_url, asin, source,
           quote_r2_key, image_url
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId(),
        grantId,
        item.item_description.trim(),
        item.quantity,
        money(item.unit_price),
        item.vendor_url || null,
        asin,
        item.source === 'WISHLIST' ? 'WISHLIST' : 'MANUAL',
        item.quote_r2_key || null,
        imageUrl,
      );
  });

export const saveGrant = async (
  db: D1Database,
  input: {
    actor: User;
    benefitScope: string;
    cycleId: string;
    description: string;
    gradesImpacted: string;
    grantId?: string;
    items: GrantItemInput[];
    submit: boolean;
    wishlistUrl?: string | null;
  },
): Promise<Result<{grantId: string; status: string}>> => {
  const narrative = validateGrantNarrative({
    benefitScope: input.benefitScope,
    description: input.description,
    gradesImpacted: input.gradesImpacted,
  });
  if ('error' in narrative) return narrative;
  if (input.items.length === 0) return {error: 'Add at least one line item.'};
  if (
    input.items.some((item) => {
      const quantity = Number(item.quantity);
      const price = finiteMoney(item.unit_price);
      return (
        !item.item_description.trim() ||
        !Number.isFinite(quantity) ||
        quantity < 1 ||
        price == null ||
        price < 0
      );
    })
  ) {
    return {error: 'Each item needs a description and quantity.'};
  }

  const cycle = await db
    .prepare('SELECT * FROM grant_cycles WHERE id = ?')
    .bind(input.cycleId)
    .first<CycleRow>();
  if (!cycle) return {error: 'Grant window not found.'};

  const total = requestedTotal(input.items);
  const wishlistUrl = input.wishlistUrl ? normalizeWishlistUrl(input.wishlistUrl) : null;
  if (input.wishlistUrl && !wishlistUrl) {
    return {error: 'Wishlist URL must be a public Amazon, Walmart, or Target list.'};
  }

  const status = input.submit ? 'PENDING' : 'DRAFT';
  if (input.submit && !isSubmissionOpen(cycle)) {
    return {error: 'No grant window is open for submissions.'};
  }

  const grantId = input.grantId ?? newId();
  const existing = input.grantId ? await getGrant(db, grantId) : null;
  if (existing && existing.teacher_id !== input.actor.id && input.actor.role !== 'admin') {
    return {error: 'Not your grant.'};
  }
  if (existing && existing.status !== 'DRAFT') {
    return {error: 'Only drafts can be edited.'};
  }

  const statements: D1PreparedStatement[] = [];
  if (existing) {
    statements.push(
      db
        .prepare(
          `UPDATE grants SET cycle_id = ?, grade_level_subject = ?, title = ?, impact_statement = ?,
           benefit_scope = ?, wishlist_url = ?, wishlist_imported_at = ?, requested_amount = ?, status = ?,
           updated_at = datetime('now') WHERE id = ?`,
        )
        .bind(
          input.cycleId,
          narrative.gradesImpacted,
          narrative.title,
          narrative.description,
          narrative.benefitScope,
          wishlistUrl,
          wishlistUrl ? new Date().toISOString() : null,
          total,
          status,
          grantId,
        ),
      db.prepare('DELETE FROM grant_items WHERE grant_id = ? AND is_ad_hoc = 0').bind(grantId),
    );
  } else {
    statements.push(
      db
        .prepare(
          `INSERT INTO grants (
             id, cycle_id, teacher_id, grade_level_subject, title, impact_statement, benefit_scope,
             wishlist_url, wishlist_imported_at, requested_amount, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          grantId,
          input.cycleId,
          input.actor.id,
          narrative.gradesImpacted,
          narrative.title,
          narrative.description,
          narrative.benefitScope,
          wishlistUrl,
          wishlistUrl ? new Date().toISOString() : null,
          total,
          status,
        ),
    );
  }

  statements.push(...insertItems(db, grantId, input.items));
  statements.push(
    writeAudit(
      db,
      grantId,
      input.actor,
      existing?.status ?? null,
      status,
      input.submit ? `Submitted. Requested ${total.toFixed(2)}` : 'Saved draft',
    ),
  );

  await db.batch(statements);
  return {grantId, status};
};

export const listReviewerRows = async (db: D1Database, cycleId: string) => {
  const rows = await db
    .prepare(
      `SELECT r.user_id, r.seat, u.email, u.name
       FROM cycle_reviewers r
       JOIN users u ON u.id = r.user_id
       WHERE r.cycle_id = ?`,
    )
    .bind(cycleId)
    .all<{email: string; name: string; seat: ReviewerSeat; user_id: string}>();
  return (rows.results ?? []).map((row) => ({
    email: row.email,
    name: row.name,
    seat: row.seat,
    userId: row.user_id,
  }));
};

const assignmentsOf = (rows: {seat: ReviewerSeat; userId: string}[]): ReviewerAssignment[] =>
  rows.map((row) => ({seat: row.seat, userId: row.userId}));

export const listVotes = async (db: D1Database, grantId: string) => {
  const rows = await db
    .prepare(
      `SELECT v.voter_id, v.vote, v.comment, v.updated_at, u.name, u.role
       FROM grant_votes v
       JOIN users u ON u.id = v.voter_id
       WHERE v.grant_id = ?
       ORDER BY v.updated_at ASC`,
    )
    .bind(grantId)
    .all<{
      comment: string | null;
      name: string;
      role: string;
      updated_at: string;
      vote: string;
      voter_id: string;
    }>();
  return rows.results ?? [];
};

export const grantTally = async (db: D1Database, grant: GrantRow) => {
  const [reviewers, votes] = await Promise.all([
    listReviewerRows(db, grant.cycle_id),
    listVotes(db, grant.id),
  ]);
  return tallyVotes(
    votes.map((row) => ({
      vote: row.vote as 'APPROVE' | 'REJECT' | 'ABSTAIN',
      voterId: row.voter_id,
    })),
    requiredVoterIds(assignmentsOf(reviewers), grant.teacher_id),
    grant.teacher_id,
  );
};

export const castVote = async (
  db: D1Database,
  input: {
    comment: string | null;
    grantId: string;
    vote: 'APPROVE' | 'REJECT' | 'ABSTAIN';
    voter: User;
  },
): Promise<Result<{complete: boolean; status: string}>> => {
  const grant = await getGrant(db, input.grantId);
  if (!grant) return {error: 'Grant not found.'};
  if (grant.status !== 'PENDING') return {error: 'Voting is closed for this grant.'};
  if (grant.teacher_id === input.voter.id) return {error: 'You cannot vote on your own grant.'};

  const cycle = await db
    .prepare('SELECT * FROM grant_cycles WHERE id = ?')
    .bind(grant.cycle_id)
    .first<CycleRow>();
  if (!cycle || !isReviewOpen(cycle)) {
    return {error: 'The review window is not open.'};
  }

  const reviewers = await listReviewerRows(db, grant.cycle_id);
  const required = requiredVoterIds(assignmentsOf(reviewers), grant.teacher_id);
  if (!required.includes(input.voter.id)) {
    return {error: 'You are not assigned to review this grant.'};
  }

  await db
    .prepare(
      `INSERT INTO grant_votes (id, grant_id, voter_id, vote, comment)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(grant_id, voter_id) DO UPDATE SET
         vote = excluded.vote, comment = excluded.comment, updated_at = datetime('now')`,
    )
    .bind(newId(), input.grantId, input.voter.id, input.vote, input.comment)
    .run();

  await writeAudit(
    db,
    input.grantId,
    input.voter,
    'PENDING',
    'PENDING',
    `${input.voter.name} voted ${input.vote}`,
  ).run();

  const tally = await grantTally(db, grant);
  return {complete: tally.complete, status: 'PENDING'};
};

export const decideGrant = async (
  db: D1Database,
  input: {
    chairman: User;
    comment: string | null;
    grantId: string;
    outcome: 'APPROVED' | 'REJECTED';
  },
): Promise<Result<{status: string}>> => {
  const grant = await getGrant(db, input.grantId);
  if (!grant) return {error: 'Grant not found.'};
  if (grant.status !== 'PENDING') return {error: 'This grant is no longer awaiting a decision.'};

  const cycle = await db
    .prepare('SELECT * FROM grant_cycles WHERE id = ?')
    .bind(grant.cycle_id)
    .first<CycleRow>();
  if (!cycle) return {error: 'Grant window not found.'};

  const reviewers = await listReviewerRows(db, grant.cycle_id);
  const chairman = reviewers.find((row) => row.seat === 'chairman');
  const tally = await grantTally(db, grant);
  const error = validateChairDecision({
    complete: tally.complete,
    isChairman: chairman?.userId === input.chairman.id,
    reviewStarted: hasReviewStarted(cycle),
  });
  if (error) return {error};

  const approvedAmount = input.outcome === 'APPROVED' ? grant.requested_amount : null;
  await db.batch([
    db
      .prepare(
        `UPDATE grants
         SET status = ?, approved_amount = ?, rejection_reason = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(
        input.outcome,
        approvedAmount,
        input.outcome === 'REJECTED' ? input.comment : null,
        input.grantId,
      ),
    writeAudit(
      db,
      input.grantId,
      input.chairman,
      'PENDING',
      input.outcome,
      input.outcome === 'APPROVED'
        ? `Chairman approved. Cap ${Number(approvedAmount).toFixed(2)}`
        : `Chairman rejected${input.comment ? `: ${input.comment}` : ''}`,
    ),
  ]);
  return {status: input.outcome};
};

export const setApprovedAmount = async (
  db: D1Database,
  input: {actor: User; amount: number; grantId: string},
): Promise<Result<{ok: true}>> => {
  if (input.actor.role !== 'admin') {
    return {error: 'Only the treasurer can change the approved cap.'};
  }
  const grant = await getGrant(db, input.grantId);
  if (!grant) return {error: 'Grant not found.'};
  if (grant.status !== 'APPROVED') return {error: 'Cap can only change on an approved grant.'};
  const amount = finiteMoney(input.amount);
  if (amount == null || amount <= 0 || amount > grant.requested_amount) {
    return {error: 'Approved amount must be between 0 and the requested total.'};
  }
  await db.batch([
    db
      .prepare(`UPDATE grants SET approved_amount = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(amount, input.grantId),
    writeAudit(
      db,
      input.grantId,
      input.actor,
      'APPROVED',
      'APPROVED',
      `Cap set to ${amount.toFixed(2)}`,
    ),
  ]);
  return {ok: true};
};

export const fulfillGrant = async (
  db: D1Database,
  input: {
    actor: User;
    adHocItems?: AdHocItemInput[];
    grantId: string;
    items: FulfillmentItemInput[];
    receiptR2Key: string | null;
    trackingNumber: string | null;
    varianceNote: string | null;
    vendorName: string;
  },
): Promise<Result<{actualAmount: number; variance: number}>> => {
  if (input.actor.role !== 'admin') {
    return {error: 'Only the treasurer can record a purchase.'};
  }
  const grant = await getGrant(db, input.grantId);
  if (!grant) return {error: 'Grant not found.'};
  if (grant.status !== 'APPROVED') return {error: 'Grant is not awaiting purchase.'};
  if (!input.vendorName.trim()) return {error: 'Vendor is required.'};

  const existing = await db
    .prepare('SELECT id FROM grant_items WHERE grant_id = ? AND is_ad_hoc = 0')
    .bind(input.grantId)
    .all<{id: string}>();
  const existingIds = new Set((existing.results ?? []).map((row) => row.id));
  if (
    input.items.length !== existingIds.size ||
    input.items.some((item) => !existingIds.has(item.id))
  ) {
    return {error: 'Record an outcome for every requested line.'};
  }

  for (const item of input.items) {
    if (item.item_status === 'SUBSTITUTED' && !item.actual_description) {
      return {error: 'Substituted items need a description of what was bought.'};
    }
    if (
      (item.item_status === 'PURCHASED' || item.item_status === 'SUBSTITUTED') &&
      (item.actual_quantity == null || item.actual_unit_price == null)
    ) {
      return {error: 'Purchased items need an actual quantity and price.'};
    }
  }

  const actualAmount = sumActuals(input.items, input.adHocItems ?? []);
  const approvedAmount = Number(grant.approved_amount ?? grant.requested_amount);
  const delta = variance(approvedAmount, actualAmount);

  const statements: D1PreparedStatement[] = input.items.map((item) => {
    const purchased = item.item_status === 'PURCHASED' || item.item_status === 'SUBSTITUTED';
    return db
      .prepare(
        `UPDATE grant_items
         SET item_status = ?, actual_description = ?, actual_quantity = ?, actual_unit_price = ?, variance_note = ?
         WHERE id = ? AND grant_id = ?`,
      )
      .bind(
        item.item_status,
        item.actual_description ?? null,
        purchased ? item.actual_quantity : 0,
        purchased ? item.actual_unit_price : 0,
        item.variance_note ?? null,
        item.id,
        input.grantId,
      );
  });

  for (const extra of input.adHocItems ?? []) {
    statements.push(
      db
        .prepare(
          `INSERT INTO grant_items (
             id, grant_id, item_description, quantity, unit_price, is_ad_hoc, item_status,
             actual_description, actual_quantity, actual_unit_price, variance_note
           ) VALUES (?, ?, ?, 0, 0, 1, 'PURCHASED', ?, ?, ?, ?)`,
        )
        .bind(
          newId(),
          input.grantId,
          extra.item_description,
          extra.item_description,
          extra.actual_quantity,
          extra.actual_unit_price,
          extra.variance_note ?? 'Ad-hoc fulfillment charge',
        ),
    );
  }

  statements.push(
    db
      .prepare(
        `UPDATE grants
         SET status = 'PURCHASED', actual_amount = ?, variance_note = ?, vendor_name = ?,
             tracking_number = ?, receipt_r2_key = ?, purchased_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(
        actualAmount,
        input.varianceNote,
        input.vendorName.trim(),
        input.trackingNumber,
        input.receiptR2Key,
        input.grantId,
      ),
    writeAudit(
      db,
      input.grantId,
      input.actor,
      'APPROVED',
      'PURCHASED',
      `Vendor ${input.vendorName}. Approved ${approvedAmount.toFixed(2)}, actual ${actualAmount.toFixed(2)}, variance ${delta.toFixed(2)}`,
    ),
  );

  await db.batch(statements);
  return {actualAmount, variance: delta};
};

export const confirmDelivery = async (
  db: D1Database,
  input: {actor: User; grantId: string; proofKey: string | null},
): Promise<Result<{ok: true}>> => {
  const grant = await getGrant(db, input.grantId);
  if (!grant) return {error: 'Grant not found.'};
  if (grant.status !== 'PURCHASED') return {error: 'Nothing to confirm yet.'};
  if (grant.teacher_id !== input.actor.id && input.actor.role !== 'admin') {
    return {error: 'Only the requesting teacher can confirm delivery.'};
  }

  await db.batch([
    db
      .prepare(
        `UPDATE grants
         SET status = 'DELIVERED', proof_of_delivery_r2_key = ?, delivered_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(input.proofKey, input.grantId),
    writeAudit(
      db,
      input.grantId,
      input.actor,
      'PURCHASED',
      'DELIVERED',
      'Teacher confirmed delivery',
    ),
  ]);
  return {ok: true};
};

export const listEligibleVoters = async (db: D1Database, grant: GrantRow) => {
  const reviewers = await listReviewerRows(db, grant.cycle_id);
  const required = new Set(requiredVoterIds(assignmentsOf(reviewers), grant.teacher_id));
  return reviewers
    .filter((row) => required.has(row.userId))
    .map((row) => ({id: row.userId, name: row.name, role: row.seat}));
};

export const listUserSeats = async (db: D1Database, userId: string) => {
  const rows = await db
    .prepare('SELECT DISTINCT seat FROM cycle_reviewers WHERE user_id = ?')
    .bind(userId)
    .all<{seat: ReviewerSeat}>();
  return (rows.results ?? []).map((row) => row.seat);
};

export const listReviewQueue = async (db: D1Database, userId: string, now = new Date()) => {
  const rows = await db
    .prepare(
      `${GRANT_SELECT}
       JOIN cycle_reviewers r ON r.cycle_id = g.cycle_id AND r.user_id = ?
       LEFT JOIN grant_votes v ON v.grant_id = g.id AND v.voter_id = ?
       WHERE g.status = 'PENDING'
         AND g.teacher_id != ?
         AND r.seat != 'chairman'
       ORDER BY g.created_at ASC`,
    )
    .bind(userId, userId, userId)
    .all<GrantRow>();
  const cycles = await db
    .prepare('SELECT id, review_starts_at, review_ends_at FROM grant_cycles')
    .all<Pick<CycleRow, 'id' | 'review_ends_at' | 'review_starts_at'>>();
  const openIds = new Set(
    (cycles.results ?? []).filter((cycle) => isReviewOpen(cycle, now)).map((cycle) => cycle.id),
  );
  return attachPreviewImages(
    db,
    (rows.results ?? []).filter((grant) => openIds.has(grant.cycle_id)),
  );
};

export const listChairQueue = async (db: D1Database, userId: string, now = new Date()) => {
  const rows = await db
    .prepare(
      `${GRANT_SELECT}
       JOIN cycle_reviewers r ON r.cycle_id = g.cycle_id AND r.user_id = ? AND r.seat = 'chairman'
       WHERE g.status = 'PENDING'
       ORDER BY g.created_at ASC`,
    )
    .bind(userId)
    .all<GrantRow>();
  const ready: GrantRow[] = [];
  for (const grant of rows.results ?? []) {
    const cycle = await db
      .prepare('SELECT review_starts_at FROM grant_cycles WHERE id = ?')
      .bind(grant.cycle_id)
      .first<Pick<CycleRow, 'review_starts_at'>>();
    if (!cycle || !hasReviewStarted(cycle, now)) continue;
    const tally = await grantTally(db, grant);
    if (tally.complete) ready.push(grant);
  }
  return attachPreviewImages(db, ready);
};

export const chairmanForGrant = async (db: D1Database, cycleId: string) => {
  const rows = await listReviewerRows(db, cycleId);
  return rows.find((row) => row.seat === 'chairman') ?? null;
};
