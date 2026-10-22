import {type ReviewerSeat, requiredVoterIds} from '~/lib/reviewers';

export const CHAIR_MANUAL_STEP_IDS = ['notify-kati', 'monitor', 'stories'] as const;

export type ChairManualStepId = (typeof CHAIR_MANUAL_STEP_IDS)[number];

export const CHAIR_PROCESS_STEP_IDS = [
  'notify-kati',
  'committee',
  'monitor',
  'review',
  'decide',
  'stories',
] as const;

export type ChairProcessStepId = (typeof CHAIR_PROCESS_STEP_IDS)[number];

export type StepStatus = {done: boolean; source: 'auto' | 'manual'};

export type ChairProcessStepStatusMap = Record<ChairProcessStepId, StepStatus>;

export type ChairProcessSnapshot = {
  /** Pending grants still missing at least one required rank. */
  awaitingRanksCount: number;
  /** True after the chair successfully sends evaluation instructions. */
  evaluationInstructionsSent: boolean;
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

export const EMPTY_CHAIR_PROCESS_SNAPSHOT: ChairProcessSnapshot = {
  awaitingRanksCount: 0,
  evaluationInstructionsSent: false,
  cycle: null,
  decidedCount: 0,
  manualDoneStepIds: [],
  pendingCount: 0,
  seats: [],
};

export const isChairManualStepId = (value: string): value is ChairManualStepId =>
  (CHAIR_MANUAL_STEP_IDS as readonly string[]).includes(value);

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
  const committeeDone = hasFullCommittee(input.seats);
  const submittedCount = input.pendingCount + input.decidedCount;
  return {
    'notify-kati': {done: manual.has('notify-kati'), source: 'manual'},
    committee: {done: committeeDone, source: 'auto'},
    monitor: {done: manual.has('monitor'), source: 'manual'},
    review: {
      done:
        input.evaluationInstructionsSent ||
        (committeeDone && submittedCount > 0 && input.awaitingRanksCount === 0),
      source: 'auto',
    },
    decide: {
      done: input.pendingCount === 0 && input.decidedCount > 0,
      source: 'auto',
    },
    stories: {done: manual.has('stories'), source: 'manual'},
  };
};

export const loadChairProcessSnapshot = async (
  db: D1Database,
  cycleId: string,
): Promise<ChairProcessSnapshot | null> => {
  const cycleRow = await db
    .prepare(
      `SELECT starts_at, ends_at, is_active, review_starts_at, review_ends_at,
              review_opened_notified_at, evaluation_instructions_sent_at
       FROM grant_cycles WHERE id = ?`,
    )
    .bind(cycleId)
    .first<
      NonNullable<ChairProcessSnapshot['cycle']> & {
        evaluation_instructions_sent_at: string | null;
      }
    >();
  if (!cycleRow) return null;
  const {evaluation_instructions_sent_at: instructionsSentAt, ...cycle} = cycleRow;

  const [seats, counts, manual, pendingGrants, votes] = await Promise.all([
    db
      .prepare(`SELECT seat, user_id FROM cycle_reviewers WHERE cycle_id = ?`)
      .bind(cycleId)
      .all<{seat: ReviewerSeat; user_id: string}>(),
    db
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
           SUM(CASE WHEN status IN ('APPROVED', 'REJECTED', 'PURCHASED', 'DELIVERED') THEN 1 ELSE 0 END) AS decided_count
         FROM grants WHERE cycle_id = ? AND status != 'DRAFT'`,
      )
      .bind(cycleId)
      .first<{
        decided_count: number | null;
        pending_count: number | null;
      }>(),
    db
      .prepare(`SELECT step_id FROM cycle_process_steps WHERE cycle_id = ?`)
      .bind(cycleId)
      .all<{step_id: string}>(),
    db
      .prepare(`SELECT id, teacher_id FROM grants WHERE cycle_id = ? AND status = 'PENDING'`)
      .bind(cycleId)
      .all<{id: string; teacher_id: string}>(),
    db
      .prepare(
        `SELECT v.grant_id, v.voter_id FROM grant_votes v
         JOIN grants g ON g.id = v.grant_id
         WHERE g.cycle_id = ? AND g.status = 'PENDING'`,
      )
      .bind(cycleId)
      .all<{grant_id: string; voter_id: string}>(),
  ]);

  const reviewers = (seats.results ?? []).map((row) => ({seat: row.seat, userId: row.user_id}));
  const votersByGrant = new Map<string, Set<string>>();
  for (const row of votes.results ?? []) {
    const set = votersByGrant.get(row.grant_id) ?? new Set<string>();
    set.add(row.voter_id);
    votersByGrant.set(row.grant_id, set);
  }
  const awaitingRanksCount = (pendingGrants.results ?? []).filter((grant) => {
    const voted = votersByGrant.get(grant.id) ?? new Set<string>();
    const required = requiredVoterIds(reviewers, grant.teacher_id);
    return required.length === 0 || required.some((id) => !voted.has(id));
  }).length;

  return {
    awaitingRanksCount,
    cycle,
    decidedCount: Number(counts?.decided_count ?? 0),
    evaluationInstructionsSent: Boolean(instructionsSentAt),
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

export const reviewStepNote = (input: {
  awaitingRanksCount: number;
  done: boolean;
  instructionsSent: boolean;
}): string => {
  const waiting =
    input.awaitingRanksCount > 0
      ? `${input.awaitingRanksCount} grant${input.awaitingRanksCount === 1 ? '' : 's'} still waiting on ranks.`
      : null;

  if (input.instructionsSent) {
    return waiting
      ? `Evaluation instructions sent, so this step is done. ${waiting} You can approve or reject before those ranks are in.`
      : 'Evaluation instructions sent. This step is done.';
  }

  if (input.done) {
    return 'Every submitted grant has the ranks it needs, so this step is done.';
  }

  return waiting
    ? `Sending evaluation instructions marks this step done. ${waiting} You can approve or reject before those ranks are in. It also turns done once every submitted grant has all required ranks.`
    : 'Sending evaluation instructions marks this step done. It also turns done once every submitted grant has all required ranks.';
};
