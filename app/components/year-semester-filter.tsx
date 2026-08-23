'use client';

import {useRouter} from 'next/navigation';
import {Select} from '~/components/select';
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
      <label className="font-body text-sm text-charcoal" htmlFor="school-year-filter">
        School year
        <Select
          className="mt-1 min-w-56"
          disabled={!schoolYearId || years.length === 0}
          id="school-year-filter"
          onValueChange={(year) => {
            if (!schoolYearId) return;
            apply(year, semester);
          }}
          options={years.map((year) => ({
            label: formatSchoolYearLong(year.label),
            value: year.id,
          }))}
          value={schoolYearId}
        />
      </label>
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
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
      </div>
      {extra}
    </div>
  );
};
