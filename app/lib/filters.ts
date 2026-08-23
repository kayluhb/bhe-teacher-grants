import type {CycleRow} from '~/lib/types';

export type SemesterFilter = 'ALL' | 'FALL' | 'SPRING';

export type ListSearch = {semester?: string | string[]; year?: string | string[]};

type YearOption = {id: string; is_default: number; label: string};

type CycleOption = Pick<CycleRow, 'id' | 'is_active' | 'school_year_id' | 'semester'>;

export type ResolvedListFilters = {
  cycle: CycleOption | null;
  cycles: CycleOption[];
  schoolYearId: string | undefined;
  semester: SemesterFilter;
  years: YearOption[];
};

export const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const parseSemester = (value: string | undefined): SemesterFilter | undefined => {
  if (value === 'ALL' || value === 'FALL' || value === 'SPRING') return value;
  return undefined;
};

export const pickListFilters = (
  years: YearOption[],
  cycles: CycleOption[],
  search: ListSearch,
): ResolvedListFilters => {
  const defaultYear = years.find((year) => year.is_default === 1) ?? years[0];
  const requestedYear = firstParam(search.year);
  const schoolYearId =
    requestedYear && years.some((year) => year.id === requestedYear)
      ? requestedYear
      : defaultYear?.id;
  const yearCycles = cycles.filter((cycle) => cycle.school_year_id === schoolYearId);
  const activeInYear = yearCycles.find((cycle) => cycle.is_active === 1);
  const semester = parseSemester(firstParam(search.semester)) ?? activeInYear?.semester ?? 'ALL';
  const cycle =
    semester === 'ALL' ? null : (yearCycles.find((row) => row.semester === semester) ?? null);

  return {cycle, cycles: yearCycles, schoolYearId, semester, years};
};

export const toListGrantFilters = (filters: ResolvedListFilters) => ({
  schoolYearId: filters.schoolYearId,
  ...(filters.semester === 'ALL' ? {} : {semester: filters.semester}),
});
