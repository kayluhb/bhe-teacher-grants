import {formatSchoolYearLong, semesterLabel} from '~/lib/school-year';

export const fillTemplate = (template: string, values: Record<string, string>) => {
  let next = template;
  for (const [token, value] of Object.entries(values)) {
    next = next.replaceAll(token, value);
  }
  return next;
};

export const cycleEmailPlaceholders = (cycle: {
  school_year: string;
  semester: 'FALL' | 'SPRING';
}): Record<string, string> => ({
  '[SEMESTER]': semesterLabel(cycle.semester),
  '[YEAR]': formatSchoolYearLong(cycle.school_year),
});
