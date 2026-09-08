import {describe, expect, it} from 'vitest';
import {CHAIR_MANUAL_STEP_IDS, resolveChairProcessStepStatus} from '~/lib/chair-process-status';

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
  it('marks publish done when an active cycle has all window dates', () => {
    const status = resolveChairProcessStepStatus({
      approvedOpenCount: 0,
      cycle: baseCycle,
      decidedCount: 0,
      manualDoneStepIds: [],
      pendingCount: 0,
      seats: [],
    });
    expect(status.publish).toEqual({done: true, source: 'auto'});
  });

  it('marks publish not done without an active cycle', () => {
    const status = resolveChairProcessStepStatus({
      approvedOpenCount: 0,
      cycle: null,
      decidedCount: 0,
      manualDoneStepIds: [],
      pendingCount: 0,
      seats: [],
    });
    expect(status.publish.done).toBe(false);
  });

  it('marks committee done when officers plus three committee seats are filled', () => {
    const status = resolveChairProcessStepStatus({
      approvedOpenCount: 0,
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
      approvedOpenCount: 0,
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

  it('marks review done when the automated review-open email has been sent', () => {
    const status = resolveChairProcessStepStatus({
      approvedOpenCount: 0,
      cycle: {...baseCycle, review_opened_notified_at: '2026-10-16T00:00:00Z'},
      decidedCount: 0,
      manualDoneStepIds: [],
      pendingCount: 0,
      seats: fullSeats,
    });
    expect(status.review).toEqual({done: true, source: 'auto'});
  });

  it('marks decide done when decisions exist and nothing is still pending', () => {
    const status = resolveChairProcessStepStatus({
      approvedOpenCount: 1,
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
      approvedOpenCount: 0,
      cycle: baseCycle,
      decidedCount: 2,
      manualDoneStepIds: [],
      pendingCount: 1,
      seats: fullSeats,
    });
    expect(status.decide.done).toBe(false);
  });

  it('marks fulfill done when no approved grants are still open', () => {
    const status = resolveChairProcessStepStatus({
      approvedOpenCount: 0,
      cycle: baseCycle,
      decidedCount: 2,
      manualDoneStepIds: [],
      pendingCount: 0,
      seats: fullSeats,
    });
    expect(status.fulfill).toEqual({done: true, source: 'auto'});
  });

  it('marks fulfill not done while approved grants await purchase', () => {
    const status = resolveChairProcessStepStatus({
      approvedOpenCount: 2,
      cycle: baseCycle,
      decidedCount: 2,
      manualDoneStepIds: [],
      pendingCount: 0,
      seats: fullSeats,
    });
    expect(status.fulfill.done).toBe(false);
  });

  it('uses manual marks for notify-kati, monitor, and stories', () => {
    const status = resolveChairProcessStepStatus({
      approvedOpenCount: 0,
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
