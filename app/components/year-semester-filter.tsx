'use client';

import {useRouter} from 'next/navigation';
import type {SemesterFilter} from '~/lib/filters';
import {formatSchoolYearLong} from '~/lib/school-year';

const TERMS: {label: string; value: SemesterFilter}[] = [
  {label: 'All year', value: 'ALL'},
  {label: 'Fall', value: 'FALL'},
  {label: 'Spring', value: 'SPRING'},
];

export const YearSemesterFilter = ({
  action,
  extra,
  schoolYearId,
  semester,
  years,
}: {
  action: string;
  extra?: React.ReactNode;
  schoolYearId?: string;
  semester: SemesterFilter;
  years: {id: string; label: string}[];
}) => {
  const router = useRouter();
  const apply = (year: string, nextSemester: SemesterFilter) => {
    const params = new URLSearchParams({semester: nextSemester, year});
    router.push(`${action}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="font-body text-sm text-charcoal">
        School year
        <select
          className="font-body mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue"
          disabled={!schoolYearId || years.length === 0}
          onChange={(event) => {
            if (!schoolYearId) return;
            apply(event.target.value, semester);
          }}
          value={schoolYearId ?? ''}
        >
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {formatSchoolYearLong(year.label)}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
        <legend className="sr-only">Semester</legend>
        {TERMS.map(({label, value}) => {
          const selected = semester === value;
          return (
            <button
              aria-pressed={selected}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                selected ? 'bg-eagle-blue text-white' : 'text-charcoal hover:bg-warm-white'
              }`}
              disabled={!schoolYearId}
              key={value}
              onClick={() => {
                if (!schoolYearId) return;
                apply(schoolYearId, value);
              }}
              type="button"
            >
              {label}
            </button>
          );
        })}
      </fieldset>
      {extra}
    </div>
  );
};
