export type SchoolYearDates = {endsOn: string; startsOn: string};

export const validateSchoolYearDates = (input: SchoolYearDates): string | null => {
  if (!input.startsOn || !input.endsOn) return 'Start and end dates are required.';
  if (input.endsOn <= input.startsOn) return 'The end date must be after the start date.';
  return null;
};

export const validateSchoolYearInput = (
  input: SchoolYearDates & {label: string},
): string | null => {
  if (!/^\d{4}-\d{2}$/.test(input.label.trim())) return 'Use a label like 2026-27.';
  return validateSchoolYearDates(input);
};

export const formatSchoolYearLong = (schoolYear: string): string => {
  const [startYear, endSuffix] = schoolYear.split('-');
  if (!startYear || !endSuffix) return schoolYear;
  const century = startYear.slice(0, 2);
  return `${startYear}-${century}${endSuffix}`;
};

export const semesterLabel = (semester: 'FALL' | 'SPRING'): string =>
  semester === 'FALL' ? 'Fall' : 'Spring';
