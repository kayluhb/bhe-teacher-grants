import {describe, expect, it, vi} from 'vitest';
import {
  buildRolloverReviewers,
  buildRolloverWindows,
  ensureSchoolYearRollover,
  isJuly1InChicago,
  isOnOrAfterJuly1InChicago,
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

describe('isOnOrAfterJuly1InChicago', () => {
  it('is true on and after Chicago July 1', () => {
    expect(isOnOrAfterJuly1InChicago(new Date('2027-07-01T13:00:00Z'))).toBe(true);
    expect(isOnOrAfterJuly1InChicago(new Date('2027-07-02T13:00:00Z'))).toBe(true);
    expect(isOnOrAfterJuly1InChicago(new Date('2027-08-15T13:00:00Z'))).toBe(true);
  });

  it('is false before Chicago July 1', () => {
    expect(isOnOrAfterJuly1InChicago(new Date('2027-06-30T13:00:00Z'))).toBe(false);
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
      id: 'cycle_fall_2026',
      name: 'Fall 2026-27 Teacher Grants',
      review_ends_at: '2026-10-20T23:59:00.000Z',
      review_starts_at: '2026-10-15T23:59:00.000Z',
      semester: 'FALL' as const,
      starts_at: '2026-08-15T05:00:00.000Z',
    },
    {
      budget_limit: 5000,
      ends_at: '2027-03-15T23:59:00.000Z',
      id: 'cycle_spring_2027',
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
        sourceCycleId: 'cycle_fall_2026',
        startsAt: '2027-08-15T05:00:00.000Z',
      },
      {
        budgetLimit: 5000,
        endsAt: '2028-03-15T23:59:00.000Z',
        name: 'Spring 2027-28 Teacher Grants',
        reviewEndsAt: '2028-03-20T23:59:00.000Z',
        reviewStartsAt: '2028-03-15T23:59:00.000Z',
        semester: 'SPRING',
        sourceCycleId: 'cycle_spring_2027',
        startsAt: '2028-01-10T06:00:00.000Z',
      },
    ]);
  });

  it('skips semesters that already exist on the new year', () => {
    expect(buildRolloverWindows(previous, '2027-28', new Set(['FALL']))).toEqual([
      expect.objectContaining({semester: 'SPRING', sourceCycleId: 'cycle_spring_2027'}),
    ]);
  });

  it('returns nothing when the previous year has no windows to copy', () => {
    expect(buildRolloverWindows([], '2027-28', new Set())).toEqual([]);
  });
});

describe('buildRolloverReviewers', () => {
  it('maps previous seats onto new cycle ids by source cycle', () => {
    expect(
      buildRolloverReviewers(
        [
          {cycleId: 'new_fall', sourceCycleId: 'old_fall'},
          {cycleId: 'new_spring', sourceCycleId: 'old_spring'},
        ],
        [
          {cycle_id: 'old_fall', seat: 'chairman', user_id: 'chair'},
          {cycle_id: 'old_fall', seat: 'committee', user_id: 'c1'},
          {cycle_id: 'old_spring', seat: 'treasurer', user_id: 'treas'},
          {cycle_id: 'other', seat: 'principal', user_id: 'p'},
        ],
      ),
    ).toEqual([
      {cycleId: 'new_fall', seat: 'chairman', userId: 'chair'},
      {cycleId: 'new_fall', seat: 'committee', userId: 'c1'},
      {cycleId: 'new_spring', seat: 'treasurer', userId: 'treas'},
    ]);
  });

  it('returns nothing when there are no matching source reviewers', () => {
    expect(buildRolloverReviewers([{cycleId: 'new_fall', sourceCycleId: 'old_fall'}], [])).toEqual(
      [],
    );
  });
});

describe('ensureSchoolYearRollover', () => {
  type QueryResult = {first?: unknown; results?: unknown[]};

  const mockDb = (responses: QueryResult[]) => {
    const queue = [...responses];
    const statements: Array<{sql: string; binds: unknown[]}> = [];
    const prepare = (sql: string) => {
      const binds: unknown[] = [];
      const stmt = {
        bind: (...args: unknown[]) => {
          binds.push(...args);
          return stmt;
        },
        first: async <T>() => {
          const next = queue.shift() ?? {};
          return (next.first ?? null) as T | null;
        },
        all: async <T>() => {
          const next = queue.shift() ?? {};
          return {results: (next.results ?? []) as T[]};
        },
      };
      statements.push({binds, sql});
      return stmt;
    };
    const batch = vi.fn(async (_stmts: unknown[]) => []);
    return {
      batch,
      db: {batch, prepare} as unknown as D1Database,
      statements,
    };
  };

  it('copies committee seats when creating windows on July 1', async () => {
    const {batch, db, statements} = mockDb([
      {first: null},
      {results: []},
      {
        results: [
          {
            budget_limit: 5000,
            ends_at: '2026-10-15T23:59:00.000Z',
            id: 'old_fall',
            name: 'Fall 2026-27 Teacher Grants',
            review_ends_at: null,
            review_starts_at: null,
            semester: 'FALL',
            starts_at: '2026-08-15T05:00:00.000Z',
          },
        ],
      },
      {
        results: [
          {cycle_id: 'old_fall', seat: 'chairman', user_id: 'chair'},
          {cycle_id: 'old_fall', seat: 'committee', user_id: 'c1'},
        ],
      },
    ]);

    const result = await ensureSchoolYearRollover({
      db,
      now: new Date('2027-07-01T13:00:00Z'),
    });

    expect(result).toEqual({createdWindows: 1, label: '2027-28'});
    expect(batch).toHaveBeenCalledOnce();
    const batchArgs = batch.mock.calls[0]?.[0];
    // clear defaults + insert year + insert cycle + 2 reviewer seats
    expect(batchArgs).toHaveLength(5);

    const reviewerInserts = statements.filter((statement) =>
      statement.sql.includes('INSERT INTO cycle_reviewers'),
    );
    expect(reviewerInserts).toHaveLength(2);
    const cycleInsert = statements.find((statement) =>
      statement.sql.includes('INSERT INTO grant_cycles'),
    );
    const newCycleId = cycleInsert?.binds[0];
    expect(newCycleId).toEqual(expect.any(String));
    expect(reviewerInserts.map((statement) => statement.binds.slice(1))).toEqual([
      [newCycleId, 'chair', 'chairman'],
      [newCycleId, 'c1', 'committee'],
    ]);
  });

  it('copies seats for a missing semester when the year already exists on July 1', async () => {
    const {batch, db, statements} = mockDb([
      {first: {id: '2027-28'}},
      {results: [{semester: 'FALL'}]},
      {
        results: [
          {
            budget_limit: 5000,
            ends_at: '2027-03-15T23:59:00.000Z',
            id: 'old_spring',
            name: 'Spring 2026-27 Teacher Grants',
            review_ends_at: null,
            review_starts_at: null,
            semester: 'SPRING',
            starts_at: '2027-01-10T06:00:00.000Z',
          },
        ],
      },
      {
        results: [{cycle_id: 'old_spring', seat: 'treasurer', user_id: 'treas'}],
      },
    ]);

    const result = await ensureSchoolYearRollover({
      db,
      now: new Date('2027-07-01T13:00:00Z'),
    });

    expect(result).toEqual({createdWindows: 1, label: '2027-28'});
    expect(batch).toHaveBeenCalledOnce();
    const reviewerInserts = statements.filter((statement) =>
      statement.sql.includes('INSERT INTO cycle_reviewers'),
    );
    expect(reviewerInserts).toHaveLength(1);
    const cycleInsert = statements.find((statement) =>
      statement.sql.includes('INSERT INTO grant_cycles'),
    );
    expect(cycleInsert?.binds.slice(1, 3)).toEqual(['2027-28', 'SPRING']);
    expect(reviewerInserts[0]?.binds.slice(1)).toEqual([
      cycleInsert?.binds[0],
      'treas',
      'treasurer',
    ]);
  });

  it('catches up after July 1 when the new year is still missing', async () => {
    const {batch, db} = mockDb([{first: null}, {results: []}, {results: []}]);

    const result = await ensureSchoolYearRollover({
      db,
      now: new Date('2027-07-15T13:00:00Z'),
    });

    expect(result).toEqual({createdWindows: 0, label: '2027-28'});
    expect(batch).toHaveBeenCalledOnce();
  });

  it('no-ops after July 1 when the new year already exists', async () => {
    const {batch, db} = mockDb([{first: {id: '2027-28'}}]);

    const result = await ensureSchoolYearRollover({
      db,
      now: new Date('2027-07-15T13:00:00Z'),
    });

    expect(result).toEqual({createdWindows: 0, label: null});
    expect(batch).not.toHaveBeenCalled();
  });

  it('no-ops before July 1', async () => {
    const {batch, db} = mockDb([{first: null}]);

    const result = await ensureSchoolYearRollover({
      db,
      now: new Date('2027-06-30T13:00:00Z'),
    });

    expect(result).toEqual({createdWindows: 0, label: null});
    expect(batch).not.toHaveBeenCalled();
  });
});
