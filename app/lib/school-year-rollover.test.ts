import {describe, expect, it} from 'vitest';
import {
  buildRolloverWindows,
  isJuly1InChicago,
  schoolYearForJuly1,
  shiftTimestampByYears,
} from '~/lib/school-year-rollover';

describe('isJuly1InChicago', () => {
  it('is true during the Chicago July 1 daily cron window', () => {
    // 13:00 UTC = 08:00 CDT on July 1
    expect(isJuly1InChicago(new Date('2027-07-01T13:00:00Z'))).toBe(true);
  });

  it('is false on other Chicago dates', () => {
    expect(isJuly1InChicago(new Date('2027-07-02T13:00:00Z'))).toBe(false);
    expect(isJuly1InChicago(new Date('2027-06-30T13:00:00Z'))).toBe(false);
  });
});

describe('schoolYearForJuly1', () => {
  it('builds the upcoming Aug–Jul school year from the Chicago calendar year', () => {
    expect(schoolYearForJuly1(new Date('2027-07-01T13:00:00Z'))).toEqual({
      endsOn: '2028-07-31',
      label: '2027-28',
      previousLabel: '2026-27',
      startsOn: '2027-08-01',
    });
  });
});

describe('shiftTimestampByYears', () => {
  it('advances an ISO timestamp by one calendar year', () => {
    expect(shiftTimestampByYears('2026-08-15T05:00:00.000Z', 1)).toBe('2027-08-15T05:00:00.000Z');
  });

  it('returns null for nullish or invalid values', () => {
    expect(shiftTimestampByYears(null, 1)).toBeNull();
    expect(shiftTimestampByYears('not-a-date', 1)).toBeNull();
  });
});

describe('buildRolloverWindows', () => {
  const previous = [
    {
      budget_limit: 5000,
      ends_at: '2026-10-15T23:59:00.000Z',
      name: 'Fall 2026-27 Teacher Grants',
      review_ends_at: '2026-10-20T23:59:00.000Z',
      review_starts_at: '2026-10-15T23:59:00.000Z',
      semester: 'FALL' as const,
      starts_at: '2026-08-15T05:00:00.000Z',
    },
    {
      budget_limit: 5000,
      ends_at: '2027-03-15T23:59:00.000Z',
      name: 'Spring 2026-27 Teacher Grants',
      review_ends_at: '2027-03-20T23:59:00.000Z',
      review_starts_at: '2027-03-15T23:59:00.000Z',
      semester: 'SPRING' as const,
      starts_at: '2027-01-10T06:00:00.000Z',
    },
  ];

  it('copies Fall and Spring windows forward one year, inactive, with updated names', () => {
    expect(buildRolloverWindows(previous, '2027-28', new Set())).toEqual([
      {
        budgetLimit: 5000,
        endsAt: '2027-10-15T23:59:00.000Z',
        name: 'Fall 2027-28 Teacher Grants',
        reviewEndsAt: '2027-10-20T23:59:00.000Z',
        reviewStartsAt: '2027-10-15T23:59:00.000Z',
        semester: 'FALL',
        startsAt: '2027-08-15T05:00:00.000Z',
      },
      {
        budgetLimit: 5000,
        endsAt: '2028-03-15T23:59:00.000Z',
        name: 'Spring 2027-28 Teacher Grants',
        reviewEndsAt: '2028-03-20T23:59:00.000Z',
        reviewStartsAt: '2028-03-15T23:59:00.000Z',
        semester: 'SPRING',
        startsAt: '2028-01-10T06:00:00.000Z',
      },
    ]);
  });

  it('skips semesters that already exist on the new year', () => {
    expect(buildRolloverWindows(previous, '2027-28', new Set(['FALL']))).toEqual([
      expect.objectContaining({semester: 'SPRING'}),
    ]);
  });

  it('returns nothing when the previous year has no windows to copy', () => {
    expect(buildRolloverWindows([], '2027-28', new Set())).toEqual([]);
  });
});
