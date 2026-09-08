import {FormDialog} from '~/components/form-dialog';
import {GrantWindowForm} from '~/components/grant-window-form';
import type {UserRow} from '~/lib/admin';
import {formatSchoolCompactDateTime, formatSchoolDateRange} from '~/lib/grant-cycle';
import {formatUsd} from '~/lib/money';
import {semesterLabel} from '~/lib/school-year';
import type {CycleRow} from '~/lib/types';

type FormState = {error?: string};

const DateRangeCell = ({end, start}: {end: string | null; start: string | null}) => {
  if (!start || !end) return <span className="text-gray-400">—</span>;
  return (
    <div className="whitespace-nowrap leading-5" title={formatSchoolDateRange(start, end)}>
      <div>{formatSchoolCompactDateTime(start)}</div>
      <div className="text-gray-500">– {formatSchoolCompactDateTime(end)}</div>
    </div>
  );
};

export const GrantWindowsPanel = ({
  createAction,
  cycles,
  reviewersByCycle,
  setActiveAction,
  showIntro = true,
  tab,
  updateAction,
  users,
  years,
}: {
  createAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  cycles: CycleRow[];
  reviewersByCycle: Record<string, {seat: string; user_id: string}[]>;
  setActiveAction: (formData: FormData) => Promise<void>;
  showIntro?: boolean;
  tab?: string;
  updateAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  users: UserRow[];
  years: {id: string; label: string}[];
}) => (
  <section className="space-y-4" id="grant-windows">
    <div className="flex flex-wrap items-center justify-between gap-3">
      {showIntro ? (
        <div>
          <h2 className="font-heading text-xl font-semibold text-charcoal">Grant windows</h2>
          <p className="font-body mt-1 text-sm text-gray-600">
            Create or edit submission and review dates, budget, and officers. Mark a window open so
            teachers can apply.
          </p>
        </div>
      ) : (
        <div />
      )}
      <FormDialog
        description="Create a Fall or Spring window with a budget."
        padded={false}
        title="Add grant window"
        triggerLabel="Add window"
      >
        <GrantWindowForm
          action={createAction}
          submitLabel="Add window"
          tab={tab}
          users={users}
          years={years}
        />
      </FormDialog>
    </div>
    {years.length === 0 ? (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Ask Admin to add a school year before creating a grant window.
      </p>
    ) : null}
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-warm-white text-left text-xs text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-2">Window</th>
            <th className="px-4 py-2">Submissions</th>
            <th className="px-4 py-2">Review</th>
            <th className="px-4 py-2">Budget</th>
            <th className="px-4 py-2">Open</th>
            <th className="px-4 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cycles.map((cycle) => (
            <tr className="border-t border-gray-100" key={cycle.id}>
              <td className="px-4 py-2">
                {semesterLabel(cycle.semester)} {cycle.school_year}
              </td>
              <td className="px-4 py-2">
                <DateRangeCell end={cycle.ends_at} start={cycle.starts_at} />
              </td>
              <td className="px-4 py-2">
                <DateRangeCell end={cycle.review_ends_at} start={cycle.review_starts_at} />
              </td>
              <td className="px-4 py-2 tabular-nums">{formatUsd(cycle.budget_limit)}</td>
              <td className="px-4 py-2">
                {cycle.is_active ? (
                  'Active'
                ) : (
                  <form action={setActiveAction}>
                    {tab ? <input name="tab" type="hidden" value={tab} /> : null}
                    <input name="cycle_id" type="hidden" value={cycle.id} />
                    <button className="whitespace-nowrap text-eagle-blue underline" type="submit">
                      Make active
                    </button>
                  </form>
                )}
              </td>
              <td className="px-4 py-2">
                <FormDialog
                  description="Update this window's budget and dates."
                  padded={false}
                  title="Edit grant window"
                  triggerClassName="whitespace-nowrap text-eagle-blue underline"
                  triggerLabel="Edit"
                >
                  <GrantWindowForm
                    action={updateAction}
                    cycle={cycle}
                    reviewers={reviewersByCycle[cycle.id]}
                    submitLabel="Save window"
                    tab={tab}
                    users={users}
                    years={years}
                  />
                </FormDialog>
              </td>
            </tr>
          ))}
          {cycles.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-gray-500" colSpan={6}>
                No grant windows yet. Add one to open submissions.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  </section>
);
