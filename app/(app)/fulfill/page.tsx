import {GrantTable} from '~/components/grant-table';
import {YearSemesterFilter} from '~/components/year-semester-filter';
import {requireRole} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {toListGrantFilters} from '~/lib/filters';
import {listGrants, resolveListFilters} from '~/lib/grants';

export default async function FulfillPage({
  searchParams,
}: {
  searchParams: Promise<{semester?: string | string[]; year?: string | string[]}>;
}) {
  await requireRole('admin');
  const params = await searchParams;
  const filters = await resolveListFilters(getDb(), params);
  const grants = (await listGrants(getDb(), toListGrantFilters(filters))).filter(
    (grant) =>
      grant.status === 'APPROVED' || grant.status === 'PURCHASED' || grant.status === 'DELIVERED',
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-bold text-charcoal">Fulfillment</h1>
      <YearSemesterFilter
        action="/fulfill"
        schoolYearId={filters.schoolYearId}
        semester={filters.semester}
        years={filters.years}
      />
      <GrantTable grants={grants} hrefFor={(grant) => `/fulfill/${grant.id}`} showTeacher />
    </div>
  );
}
