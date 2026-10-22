import {describe, expect, it} from 'vitest';
import {
  CHAIR_MANUAL_STEP_IDS,
  resolveChairProcessStepStatus,
  reviewStepNote,
} from '~/lib/chair-process-status';

const baseCycle = {
  ends_at: '2026-10-15T23:59:00Z',
  is_active: 1,
  review_ends_at: '2026-10-30T23:59:00Z',
  review_opened_notified_at: null as string | null,
  review_starts_at: '2026-10-15T23:59:00Z',
  starts_at: '2026-08-15T00:00:00Z',
};

const fullSeats = [
  {seat: 'treasurer'},
  {seat: 'principal'},
  {seat: 'chairman'},
  {seat: 'committee'},
  {seat: 'committee'},
  {seat: 'committee'},
];

describe('CHAIR_MANUAL_STEP_IDS', () => {
  it('lists only steps that need a mark-done control', () => {
    expect([...CHAIR_MANUAL_STEP_IDS].sort()).toEqual(['monitor', 'notify-kati', 'stories']);
  });
});

describe('resolveChairProcessStepStatus', () => {
  it('marks committee done when officers plus three committee seats are filled', () => {
    const status = resolveChairProcessStepStatus({
      awaitingRanksCount: 0,
      evaluationInstructionsSent: false,
      cycle: baseCycle,
      decidedCount: 0,
      manualDoneStepIds: [],
      pendingCount: 0,
      seats: fullSeats,
    });
    expect(status.committee).toEqual({done: true, source: 'auto'});
  });

  it('marks committee not done with fewer than three committee members', () => {
    const status = resolveChairProcessStepStatus({
      awaitingRanksCount: 0,
      evaluationInstructionsSent: false,
      cycle: baseCycle,
      decidedCount: 0,
      manualDoneStepIds: [],
      pendingCount: 0,
      seats: [
        {seat: 'treasurer'},
        {seat: 'principal'},
        {seat: 'chairman'},
        {seat: 'committee'},
        {seat: 'committee'},
      ],
    });
    expect(status.committee.done).toBe(false);
  });

  it('does not mark review done just because the review window opened', () => {
    const status = resolveChairProcessStepStatus({
      awaitingRanksCount: 0,
      evaluationInstructionsSent: false,
      cycle: {...baseCycle, review_opened_notified_at: '2026-10-16T00:00:00Z'},
      decidedCount: 0,
      manualDoneStepIds: [],
      pendingCount: 0,
      seats: [{seat: 'treasurer'}, {seat: 'principal'}],
    });
    expect(status.review.done).toBe(false);
  });

  it('marks review not done while pending grants still need ranks', () => {
    const status = resolveChairProcessStepStatus({
      awaitingRanksCount: 1,
      evaluationInstructionsSent: false,
      cycle: baseCycle,
      decidedCount: 0,
      manualDoneStepIds: [],
      pendingCount: 2,
      seats: fullSeats,
    });
    expect(status.review.done).toBe(false);
  });

  it('marks review done when evaluation instructions were sent, even if ranks are still missing', () => {
    const status = resolveChairProcessStepStatus({
      awaitingRanksCount: 2,
      cycle: baseCycle,
      decidedCount: 0,
      evaluationInstructionsSent: true,
      manualDoneStepIds: [],
      pendingCount: 2,
      seats: fullSeats,
    });
    expect(status.review).toEqual({done: true, source: 'auto'});
  });

  it('marks review done when every pending grant has all required ranks', () => {
    const status = resolveChairProcessStepStatus({
      awaitingRanksCount: 0,
      evaluationInstructionsSent: false,
      cycle: baseCycle,
      decidedCount: 0,
      manualDoneStepIds: [],
      pendingCount: 2,
      seats: fullSeats,
    });
    expect(status.review).toEqual({done: true, source: 'auto'});
  });

  it('marks decide done when decisions exist and nothing is still pending', () => {
    const status = resolveChairProcessStepStatus({
      awaitingRanksCount: 0,
      evaluationInstructionsSent: false,
      cycle: baseCycle,
      decidedCount: 3,
      manualDoneStepIds: [],
      pendingCount: 0,
      seats: fullSeats,
    });
    expect(status.decide).toEqual({done: true, source: 'auto'});
  });

  it('marks decide not done while pending grants remain', () => {
    const status = resolveChairProcessStepStatus({
      awaitingRanksCount: 0,
      evaluationInstructionsSent: false,
      cycle: baseCycle,
      decidedCount: 2,
      manualDoneStepIds: [],
      pendingCount: 1,
      seats: fullSeats,
    });
    expect(status.decide.done).toBe(false);
  });

  it('uses manual marks for notify-kati, monitor, and stories', () => {
    const status = resolveChairProcessStepStatus({
      awaitingRanksCount: 0,
      evaluationInstructionsSent: false,
      cycle: baseCycle,
      decidedCount: 0,
      manualDoneStepIds: ['notify-kati', 'stories'],
      pendingCount: 0,
      seats: fullSeats,
    });
    expect(status['notify-kati']).toEqual({done: true, source: 'manual'});
    expect(status.monitor).toEqual({done: false, source: 'manual'});
    expect(status.stories).toEqual({done: true, source: 'manual'});
  });
});

describe('reviewStepNote', () => {
  it('explains that sending instructions marks the step done', () => {
    expect(reviewStepNote({awaitingRanksCount: 2, done: false, instructionsSent: false})).toContain(
      'Sending evaluation instructions marks this step done',
    );
    expect(reviewStepNote({awaitingRanksCount: 2, done: false, instructionsSent: false})).toContain(
      '2 grants still waiting on ranks',
    );
  });

  it('says the step is done after instructions are sent', () => {
    expect(reviewStepNote({awaitingRanksCount: 1, done: true, instructionsSent: true})).toContain(
      'Evaluation instructions sent, so this step is done',
    );
  });
});
