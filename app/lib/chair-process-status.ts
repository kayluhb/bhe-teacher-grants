export const CHAIR_MANUAL_STEP_IDS = ['notify-kati', 'monitor', 'stories'] as const;

export type ChairManualStepId = (typeof CHAIR_MANUAL_STEP_IDS)[number];

export const CHAIR_PROCESS_STEP_IDS = [
  'publish',
  'notify-kati',
  'committee',
  'monitor',
  'review',
  'decide',
  'fulfill',
  'stories',
] as const;

export type ChairProcessStepId = (typeof CHAIR_PROCESS_STEP_IDS)[number];

export type StepStatus = {done: boolean; source: 'auto' | 'manual'};

export type ChairProcessStepStatusMap = Record<ChairProcessStepId, StepStatus>;

export type ChairProcessSnapshot = {
  approvedOpenCount: number;
  cycle: {
    ends_at: string | null;
    is_active: number;
    review_ends_at: string | null;
    review_opened_notified_at: string | null;
    review_starts_at: string | null;
    starts_at: string | null;
  } | null;
  decidedCount: number;
  manualDoneStepIds: string[];
  pendingCount: number;
  seats: {seat: string}[];
};

export const isChairManualStepId = (value: string): value is ChairManualStepId =>
  (CHAIR_MANUAL_STEP_IDS as readonly string[]).includes(value);

const hasPublishWindow = (cycle: ChairProcessSnapshot['cycle']): boolean =>
  Boolean(
    cycle &&
      cycle.is_active === 1 &&
      cycle.starts_at &&
      cycle.ends_at &&
      cycle.review_starts_at &&
      cycle.review_ends_at,
  );

const hasFullCommittee = (seats: {seat: string}[]): boolean => {
  const hasTreasurer = seats.some((row) => row.seat === 'treasurer');
  const hasPrincipal = seats.some((row) => row.seat === 'principal');
  const hasChairman = seats.some((row) => row.seat === 'chairman');
  const committeeCount = seats.filter((row) => row.seat === 'committee').length;
  return hasTreasurer && hasPrincipal && hasChairman && committeeCount >= 3;
};

export const resolveChairProcessStepStatus = (
  input: ChairProcessSnapshot,
): ChairProcessStepStatusMap => {
  const manual = new Set(input.manualDoneStepIds);
  return {
    publish: {done: hasPublishWindow(input.cycle), source: 'auto'},
    'notify-kati': {done: manual.has('notify-kati'), source: 'manual'},
    committee: {done: hasFullCommittee(input.seats), source: 'auto'},
    monitor: {done: manual.has('monitor'), source: 'manual'},
    review: {
      done: Boolean(input.cycle?.review_opened_notified_at),
      source: 'auto',
    },
    decide: {
      done: input.pendingCount === 0 && input.decidedCount > 0,
      source: 'auto',
    },
    fulfill: {
      done: input.approvedOpenCount === 0 && input.decidedCount > 0,
      source: 'auto',
    },
    stories: {done: manual.has('stories'), source: 'manual'},
  };
};

export const loadChairProcessSnapshot = async (
  db: D1Database,
  cycleId: string,
): Promise<ChairProcessSnapshot | null> => {
  const cycle = await db
    .prepare(
      `SELECT starts_at, ends_at, is_active, review_starts_at, review_ends_at, review_opened_notified_at
       FROM grant_cycles WHERE id = ?`,
    )
    .bind(cycleId)
    .first<ChairProcessSnapshot['cycle'] & object>();
  if (!cycle) return null;

  const [seats, counts, manual] = await Promise.all([
    db
      .prepare(`SELECT seat FROM cycle_reviewers WHERE cycle_id = ?`)
      .bind(cycleId)
      .all<{seat: string}>(),
    db
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
           SUM(CASE WHEN status IN ('APPROVED', 'REJECTED', 'PURCHASED', 'DELIVERED') THEN 1 ELSE 0 END) AS decided_count,
           SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_open_count
         FROM grants WHERE cycle_id = ? AND status != 'DRAFT'`,
      )
      .bind(cycleId)
      .first<{
        approved_open_count: number | null;
        decided_count: number | null;
        pending_count: number | null;
      }>(),
    db
      .prepare(`SELECT step_id FROM cycle_process_steps WHERE cycle_id = ?`)
      .bind(cycleId)
      .all<{step_id: string}>(),
  ]);

  return {
    approvedOpenCount: Number(counts?.approved_open_count ?? 0),
    cycle,
    decidedCount: Number(counts?.decided_count ?? 0),
    manualDoneStepIds: (manual.results ?? []).map((row) => row.step_id),
    pendingCount: Number(counts?.pending_count ?? 0),
    seats: seats.results ?? [],
  };
};

export const setManualProcessStep = async (
  db: D1Database,
  input: {cycleId: string; done: boolean; stepId: ChairManualStepId},
): Promise<{ok: true} | {error: string}> => {
  if (!isChairManualStepId(input.stepId)) return {error: 'Unknown playbook step.'};
  const cycle = await db
    .prepare(`SELECT id FROM grant_cycles WHERE id = ?`)
    .bind(input.cycleId)
    .first();
  if (!cycle) return {error: 'Grant window not found.'};

  if (input.done) {
    await db
      .prepare(`INSERT OR IGNORE INTO cycle_process_steps (cycle_id, step_id) VALUES (?, ?)`)
      .bind(input.cycleId, input.stepId)
      .run();
  } else {
    await db
      .prepare(`DELETE FROM cycle_process_steps WHERE cycle_id = ? AND step_id = ?`)
      .bind(input.cycleId, input.stepId)
      .run();
  }
  return {ok: true};
};
