import {GrantTable} from '~/components/grant-table';
import {StatCard} from '~/components/stat-card';
import {YearSemesterFilter} from '~/components/year-semester-filter';
import {requireRole} from '~/lib/auth';
import {getCycleBudget, getYearBudget} from '~/lib/budget';
import {getDb} from '~/lib/db';
import {toListGrantFilters} from '~/lib/filters';
import {listGrants, resolveListFilters} from '~/lib/grants';
import {formatUsd} from '~/lib/money';

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{semester?: string | string[]; year?: string | string[]}>;
}) {
  await requireRole('committee', 'principal');
  const params = await searchParams;
  const db = getDb();
  const filters = await resolveListFilters(db, params);
  const snapshot =
    filters.semester === 'ALL' || !filters.cycle
      ? filters.schoolYearId
        ? await getYearBudget(db, filters.schoolYearId)
        : null
      : await getCycleBudget(db, filters.cycle.id);

  const grants = (await listGrants(db, toListGrantFilters(filters))).filter(
    (grant) => grant.status !== 'DRAFT',
  );

  const exportHref = `/api/budget/export?year=${filters.schoolYearId ?? ''}&semester=${filters.semester}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-bold text-charcoal">Budget ledger</h1>
        <a className="btn btn-secondary" href={exportHref}>
          Export CSV
        </a>
      </div>
      <YearSemesterFilter
        action="/budget"
        schoolYearId={filters.schoolYearId}
        semester={filters.semester}
        years={filters.years}
      />
      {snapshot ? (
        <div className="grid gap-4 md:grid-cols-5">
          <StatCard label="Budget" value={formatUsd(snapshot.budget_limit)} />
          <StatCard
            hint="Pending votes"
            label="Pipeline"
            tone="gold"
            value={formatUsd(snapshot.pipeline_requested)}
          />
          <StatCard label="Committed" value={formatUsd(snapshot.committed)} />
          <StatCard label="Spent" value={formatUsd(snapshot.spent)} />
          <StatCard
            hint="limit − committed − spent"
            label="Remaining"
            tone={snapshot.remaining < 0 ? 'red' : 'green'}
            value={formatUsd(snapshot.remaining)}
          />
        </div>
      ) : (
        <p className="text-gray-600">No budget for this filter.</p>
      )}
      {snapshot && 'cycle_variance' in snapshot ? (
        <p className="text-sm">
          Cycle variance:{' '}
          <span className={snapshot.cycle_variance > 0 ? 'text-red-700' : 'text-creek-green'}>
            {formatUsd(snapshot.cycle_variance)}
          </span>
        </p>
      ) : null}
      <GrantTable grants={grants} hrefFor={(grant) => `/review/${grant.id}`} showTeacher />
    </div>
  );
}
