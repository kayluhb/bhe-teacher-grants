import {describe, expect, it} from 'vitest';
import {validateSchoolYearDates, validateSchoolYearInput} from '~/lib/school-year';

const valid = {endsOn: '2027-07-31', label: '2026-27', startsOn: '2026-08-01'};

describe('validateSchoolYearInput', () => {
  it('accepts a complete year', () => {
    expect(validateSchoolYearInput(valid)).toBeNull();
  });

  it('requires a label like 2026-27', () => {
    expect(validateSchoolYearInput({...valid, label: '2026-2027'})).toBe(
      'Use a label like 2026-27.',
    );
  });

  it('requires start and end dates', () => {
    expect(validateSchoolYearInput({...valid, startsOn: ''})).toBe(
      'Start and end dates are required.',
    );
  });
});

describe('validateSchoolYearDates', () => {
  it('accepts dates without a label so an existing year can be edited', () => {
    expect(validateSchoolYearDates({endsOn: valid.endsOn, startsOn: valid.startsOn})).toBeNull();
  });

  it('requires the end date after the start date', () => {
    expect(validateSchoolYearDates({endsOn: '2026-08-01', startsOn: '2026-08-01'})).toBe(
      'The end date must be after the start date.',
    );
  });
});
