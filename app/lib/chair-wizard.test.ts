import {describe, expect, it} from 'vitest';
import {
  CHAIR_PROGRESS_LABELS,
  chairStepCompletedFlags,
  firstIncompleteChairStepIndex,
} from '~/lib/chair-wizard';
import {
  CHAIR_PROCESS_STEP_IDS,
  type ChairProcessStepStatusMap,
  EMPTY_CHAIR_PROCESS_SNAPSHOT,
  resolveChairProcessStepStatus,
} from '~/lib/chair-process-status';

const allPending = (): ChairProcessStepStatusMap =>
  resolveChairProcessStepStatus(EMPTY_CHAIR_PROCESS_SNAPSHOT);

describe('CHAIR_PROGRESS_LABELS', () => {
  it('has one short label per chair process step', () => {
    expect(CHAIR_PROGRESS_LABELS).toHaveLength(CHAIR_PROCESS_STEP_IDS.length);
  });
});

describe('firstIncompleteChairStepIndex', () => {
  it('starts at the first step when nothing is done', () => {
    expect(firstIncompleteChairStepIndex(allPending())).toBe(0);
  });

  it('skips completed steps and lands on the first incomplete one', () => {
    const statuses = allPending();
    statuses['notify-kati'] = {done: true, source: 'manual'};
    statuses.committee = {done: true, source: 'auto'};
    expect(firstIncompleteChairStepIndex(statuses)).toBe(2);
  });

  it('returns the last step when every step is done', () => {
    const statuses = allPending();
    for (const id of CHAIR_PROCESS_STEP_IDS) {
      statuses[id] = {done: true, source: 'manual'};
    }
    expect(firstIncompleteChairStepIndex(statuses)).toBe(CHAIR_PROCESS_STEP_IDS.length - 1);
  });
});

describe('chairStepCompletedFlags', () => {
  it('maps each process step to a boolean in order', () => {
    const statuses = allPending();
    statuses['notify-kati'] = {done: true, source: 'manual'};
    statuses.committee = {done: true, source: 'auto'};
    expect(chairStepCompletedFlags(statuses)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });
});
