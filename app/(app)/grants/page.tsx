import Link from 'next/link';
import {redirect} from 'next/navigation';
import {GrantTable} from '~/components/grant-table';
import {YearSemesterFilter} from '~/components/year-semester-filter';
import {requireAuth, requireRole} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {toListGrantFilters} from '~/lib/filters';
import {isSubmissionOpen} from '~/lib/grant-cycle';
import {getActiveCycle, listGrants, resolveListFilters} from '~/lib/grants';
import {DOCUMENT_TITLES} from '~/lib/page-title';

export const metadata = {title: DOCUMENT_TITLES.grants};

export default async function GrantsPage({
  searchParams,
}: {
  searchParams: Promise<{semester?: string | string[]; year?: string | string[]}>;
}) {
  const user = await requireAuth();
  if (user.role === 'teacher') redirect('/portal');
  await requireRole('admin');
  const params = await searchParams;
  const db = getDb();
  const [filters, cycle] = await Promise.all([resolveListFilters(db, params), getActiveCycle(db)]);
  const grants = await listGrants(db, toListGrantFilters(filters));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-bold text-charcoal">Grants</h1>
        {cycle && isSubmissionOpen(cycle) ? (
          <Link className="btn btn-primary" href="/grants/new">
            Submit grant
          </Link>
        ) : null}
      </div>
      <YearSemesterFilter
        action="/grants"
        schoolYearId={filters.schoolYearId}
        semester={filters.semester}
        years={filters.years}
      />
      <GrantTable
        grants={grants}
        hrefFor={(grant) => `/grants/${grant.id}`}
        showTeacher={user.role === 'admin'}
      />
    </div>
  );
}
