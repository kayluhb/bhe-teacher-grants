export const formatSchoolYearLong = (schoolYear: string): string => {
  const [startYear, endSuffix] = schoolYear.split('-');
  if (!startYear || !endSuffix) return schoolYear;
  const century = startYear.slice(0, 2);
  return `${startYear}-${century}${endSuffix}`;
};

export const semesterLabel = (semester: 'FALL' | 'SPRING'): string =>
  semester === 'FALL' ? 'Fall' : 'Spring';
