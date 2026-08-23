import {describe, expect, it} from 'vitest';
import {
  formatSchoolDateTime,
  fulfillQueueMessaging,
  hasReviewStarted,
  isReviewOpen,
  isSubmissionOpen,
  reviewQueueMessaging,
  reviewWindowState,
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
  it('converts stored UTC times into America/Chicago datetime-local values', () => {
    expect(toDatetimeLocalValue('2026-08-15T00:00:00Z')).toBe('2026-08-14T19:00');
  });

  it('keeps a datetime-local value as-is', () => {
    expect(toDatetimeLocalValue('2026-08-15T00:00')).toBe('2026-08-15T00:00');
  });
});

const fall = {
  ends_at: '2026-10-15T23:59:00Z',
  is_active: 1,
  name: 'Fall 2026-27 Teacher Grants',
  review_ends_at: '2026-10-30T23:59:00Z',
  review_starts_at: '2026-10-15T23:59:00Z',
  starts_at: '2026-08-15T00:00:00Z',
};

describe('formatSchoolDateTime', () => {
  it('formats stored UTC times in America/Chicago', () => {
    expect(formatSchoolDateTime('2026-10-15T23:59:00Z')).toMatch(/October 15, 2026/);
    expect(formatSchoolDateTime('2026-10-15T23:59:00Z')).toMatch(/6:59\sPM/);
  });
});

describe('reviewWindowState', () => {
  it('prefers a currently open window', () => {
    expect(reviewWindowState([fall], new Date('2026-10-16T00:00:00Z'))).toEqual({
      cycle: fall,
      kind: 'open',
    });
  });

  it('returns the next upcoming window before review opens', () => {
    expect(reviewWindowState([fall], new Date('2026-09-01T12:00:00Z'))).toEqual({
      cycle: fall,
      kind: 'upcoming',
    });
  });

  it('returns the most recently closed window after review ends', () => {
    expect(reviewWindowState([fall], new Date('2026-11-01T00:00:00Z'))).toEqual({
      cycle: fall,
      kind: 'closed',
    });
  });

  it('picks the soonest upcoming window when several are scheduled', () => {
    const spring = {
      ...fall,
      name: 'Spring 2026-27 Teacher Grants',
      review_starts_at: '2027-03-15T23:59:00Z',
      review_ends_at: '2027-03-30T23:59:00Z',
    };
    expect(reviewWindowState([spring, fall], new Date('2026-09-01T12:00:00Z'))).toEqual({
      cycle: fall,
      kind: 'upcoming',
    });
  });
});

describe('reviewQueueMessaging', () => {
  it('says when reviews open and what happens next', () => {
    const copy = reviewQueueMessaging(
      {cycle: fall, kind: 'upcoming'},
      new Date('2026-09-01T12:00:00Z'),
    );
    expect(copy.subtitle).toBe("Reviews aren't open yet.");
    expect(copy.paragraphs[0]).toContain('Fall 2026-27 Teacher Grants');
    expect(copy.paragraphs[0]).toMatch(/open .+ October 15, 2026/);
    expect(copy.paragraphs[1]).toContain('Teachers can still submit until then');
    expect(copy.paragraphs[1]).toContain('After you submit a ballot, the next grant opens');
  });

  it('skips the still-submitting line once the request window has closed', () => {
    const copy = reviewQueueMessaging(
      {
        cycle: {...fall, ends_at: '2026-10-01T23:59:00Z'},
        kind: 'upcoming',
      },
      new Date('2026-10-10T12:00:00Z'),
    );
    expect(copy.paragraphs[1]).toContain('submitted grants will appear here');
    expect(copy.paragraphs[1]).not.toContain('Teachers can still submit');
  });
});

describe('fulfillQueueMessaging', () => {
  it('says when fulfillment becomes available and what happens next', () => {
    const copy = fulfillQueueMessaging({cycle: fall, kind: 'upcoming'});
    expect(copy.subtitle).toBe("Fulfillment isn't ready yet.");
    expect(copy.paragraphs[0]).toContain('after review');
    expect(copy.paragraphs[0]).toContain('Fall 2026-27 Teacher Grants');
    expect(copy.paragraphs[0]).toMatch(/opens .+ October 15, 2026/);
    expect(copy.paragraphs[1]).toContain('record actual prices from the receipt');
    expect(copy.paragraphs[1]).toContain('add tracking');
  });
});
