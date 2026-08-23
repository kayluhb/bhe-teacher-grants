import {describe, expect, it} from 'vitest';
import {firstParam, parseSemester, pickListFilters, toListGrantFilters} from '~/lib/filters';

const years = [
  {id: '2026-27', is_default: 1, label: '2026-27'},
  {id: '2025-26', is_default: 0, label: '2025-26'},
];

const cycles = [
  {id: 'cycle_fall_2026', is_active: 1, school_year_id: '2026-27', semester: 'FALL' as const},
  {id: 'cycle_spring_2027', is_active: 0, school_year_id: '2026-27', semester: 'SPRING' as const},
];

describe('firstParam', () => {
  it('returns a single string as-is', () => {
    expect(firstParam('FALL')).toBe('FALL');
  });

  it('uses the first value when the router passes an array', () => {
    expect(firstParam(['2026-27', '2025-26'])).toBe('2026-27');
  });
});

describe('parseSemester', () => {
  it('keeps Fall, Spring, and All year', () => {
    expect(parseSemester('FALL')).toBe('FALL');
    expect(parseSemester('SPRING')).toBe('SPRING');
    expect(parseSemester('ALL')).toBe('ALL');
  });

  it('treats missing or junk values as unset', () => {
    expect(parseSemester(undefined)).toBeUndefined();
    expect(parseSemester('summer')).toBeUndefined();
  });
});

describe('pickListFilters', () => {
  it('defaults to the default school year and the open semester', () => {
    const filters = pickListFilters(years, cycles, {});
    expect(filters.schoolYearId).toBe('2026-27');
    expect(filters.semester).toBe('FALL');
    expect(filters.cycle?.id).toBe('cycle_fall_2026');
  });

  it('honors All year when the query asks for it', () => {
    const filters = pickListFilters(years, cycles, {semester: 'ALL', year: '2026-27'});
    expect(filters.semester).toBe('ALL');
    expect(filters.cycle).toBeNull();
  });

  it('selects Spring even when Fall is the open window', () => {
    const filters = pickListFilters(years, cycles, {semester: 'SPRING', year: '2026-27'});
    expect(filters.semester).toBe('SPRING');
    expect(filters.cycle?.id).toBe('cycle_spring_2027');
  });

  it('reads the first year when search params are arrays', () => {
    const filters = pickListFilters(years, cycles, {
      semester: ['SPRING'],
      year: ['2026-27'],
    });
    expect(filters.schoolYearId).toBe('2026-27');
    expect(filters.semester).toBe('SPRING');
  });
});

describe('toListGrantFilters', () => {
  it('filters All year by school year only', () => {
    const filters = pickListFilters(years, cycles, {semester: 'ALL', year: '2026-27'});
    expect(toListGrantFilters(filters)).toEqual({schoolYearId: '2026-27'});
  });

  it('keeps the school year when a semester is selected', () => {
    const filters = pickListFilters(years, cycles, {semester: 'FALL', year: '2026-27'});
    expect(toListGrantFilters(filters)).toEqual({
      schoolYearId: '2026-27',
      semester: 'FALL',
    });
  });

  it('still filters by year and semester when that window does not exist', () => {
    const filters = pickListFilters(years, cycles, {semester: 'FALL', year: '2025-26'});
    expect(filters.cycle).toBeNull();
    expect(toListGrantFilters(filters)).toEqual({
      schoolYearId: '2025-26',
      semester: 'FALL',
    });
  });
});
