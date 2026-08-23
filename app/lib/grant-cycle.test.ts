import {describe, expect, it} from 'vitest';
import {
  hasReviewStarted,
  isReviewOpen,
  isSubmissionOpen,
  toDatetimeLocalValue,
  validateCycleInput,
} from '~/lib/grant-cycle';

const valid = {
  budgetLimit: 5000,
  chairmanUserId: 'user_chairman',
  committeeUserIds: ['user_committee'],
  endsAt: '2026-10-15T23:59',
  isActive: true,
  name: 'Fall 2026-27 Teacher Grants',
  principalUserId: 'user_principal',
  reviewEndsAt: '2026-10-30T23:59',
  reviewStartsAt: '2026-10-15T23:59',
  schoolYearId: '2026-27',
  semester: 'FALL' as const,
  startsAt: '2026-08-15T00:00',
  treasurerUserId: 'user_admin',
};

describe('validateCycleInput', () => {
  it('accepts a complete window', () => {
    expect(validateCycleInput(valid)).toBeNull();
  });

  it('requires a name', () => {
    expect(validateCycleInput({...valid, name: '  '})).toBe('Window name is required.');
  });

  it('rejects a negative budget', () => {
    expect(validateCycleInput({...valid, budgetLimit: -1})).toBe('Check the dollar amounts.');
  });

  it('requires Fall or Spring', () => {
    expect(validateCycleInput({...valid, semester: 'SUMMER'})).toBe('Pick Fall or Spring.');
  });

  it('requires review to start at or after submissions close', () => {
    expect(validateCycleInput({...valid, reviewStartsAt: '2026-10-14T00:00'})).toBe(
      'Review must start when submissions close or later.',
    );
  });

  it('requires review close after review open', () => {
    expect(validateCycleInput({...valid, reviewEndsAt: '2026-10-15T23:59'})).toBe(
      'Review close must be after review opens.',
    );
  });
});

describe('window phases', () => {
  const cycle = {
    ends_at: '2026-10-15T23:59:00Z',
    is_active: 1,
    review_ends_at: '2026-10-30T23:59:00Z',
    review_starts_at: '2026-10-15T23:59:00Z',
    starts_at: '2026-08-15T00:00:00Z',
  };

  it('opens submissions only inside the submission dates while active', () => {
    expect(isSubmissionOpen(cycle, new Date('2026-09-01T12:00:00Z'))).toBe(true);
    expect(isSubmissionOpen(cycle, new Date('2026-10-16T00:00:00Z'))).toBe(false);
    expect(isSubmissionOpen({...cycle, is_active: 0}, new Date('2026-09-01T12:00:00Z'))).toBe(
      false,
    );
  });

  it('opens review only inside the review dates', () => {
    expect(isReviewOpen(cycle, new Date('2026-10-16T00:00:00Z'))).toBe(true);
    expect(isReviewOpen(cycle, new Date('2026-10-14T00:00:00Z'))).toBe(false);
    expect(isReviewOpen(cycle, new Date('2026-10-31T00:00:00Z'))).toBe(false);
  });

  it('treats review as started once review_starts_at has passed', () => {
    expect(hasReviewStarted(cycle, new Date('2026-10-15T23:59:00Z'))).toBe(true);
    expect(hasReviewStarted(cycle, new Date('2026-10-15T23:58:00Z'))).toBe(false);
  });
});

describe('toDatetimeLocalValue', () => {
  it('strips seconds and Z from stored ISO times', () => {
    expect(toDatetimeLocalValue('2026-08-15T00:00:00Z')).toBe('2026-08-15T00:00');
  });

  it('keeps a datetime-local value as-is', () => {
    expect(toDatetimeLocalValue('2026-08-15T00:00')).toBe('2026-08-15T00:00');
  });
});
