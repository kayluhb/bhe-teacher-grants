import {
  CHAIR_PROCESS_STEP_IDS,
  type ChairProcessStepId,
  type ChairProcessStepStatusMap,
} from '~/lib/chair-process-status';

/** Short progress-rail labels aligned with CHAIR_PROCESS_STEP_IDS order. */
export const CHAIR_PROGRESS_LABELS = [
  'Launch',
  'Committee',
  'Monitor',
  'Review',
  'Decide',
  'Fulfill',
  'Stories',
] as const;

export const firstIncompleteChairStepIndex = (statuses: ChairProcessStepStatusMap): number => {
  const index = CHAIR_PROCESS_STEP_IDS.findIndex((id) => !statuses[id].done);
  return index === -1 ? CHAIR_PROCESS_STEP_IDS.length - 1 : index;
};

export const chairStepCompletedFlags = (statuses: ChairProcessStepStatusMap): boolean[] =>
  CHAIR_PROCESS_STEP_IDS.map((id) => statuses[id].done);

export const chairStepIdAt = (index: number): ChairProcessStepId => {
  const clamped = Math.min(Math.max(index, 0), CHAIR_PROCESS_STEP_IDS.length - 1);
  return CHAIR_PROCESS_STEP_IDS[clamped] ?? 'notify-kati';
};
