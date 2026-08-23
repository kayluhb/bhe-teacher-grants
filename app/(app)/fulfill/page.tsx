import {EmptyCopy} from '~/components/grant-table';
import {TourGrantTable} from '~/components/tour-grant-table';
import {YearSemesterFilter} from '~/components/year-semester-filter';
import {requireRole} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {toListGrantFilters} from '~/lib/filters';
import {fulfillQueueMessaging, reviewWindowState} from '~/lib/grant-cycle';
import {listCycles, listGrants, resolveListFilters} from '~/lib/grants';
import {DOCUMENT_TITLES} from '~/lib/page-title';

export const metadata = {title: DOCUMENT_TITLES.fulfill};

export default async function FulfillPage({
  searchParams,
}: {
  searchParams: Promise<{semester?: string | string[]; year?: string | string[]}>;
}) {
  await requireRole('admin');
  const db = getDb();
  const params = await searchParams;
  const [filters, cycles] = await Promise.all([resolveListFilters(db, params), listCycles(db)]);
  const grants = (await listGrants(db, toListGrantFilters(filters))).filter(
    (grant) =>
      grant.status === 'APPROVED' || grant.status === 'PURCHASED' || grant.status === 'DELIVERED',
  );
  const relevant = (cycles ?? []).filter((cycle) =>
    filters.cycle ? cycle.id === filters.cycle.id : cycle.school_year_id === filters.schoolYearId,
  );
  const copy = fulfillQueueMessaging(reviewWindowState(relevant));
  const subtitle =
    grants.length > 0
      ? 'Approved grants to buy, plus orders already placed. Record actual prices from receipts and add tracking.'
      : copy.subtitle;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal" data-tour="page-heading">
          Fulfillment
        </h1>
        <p className="font-body mt-1 text-gray-600">{subtitle}</p>
      </div>
      <YearSemesterFilter
        action="/fulfill"
        schoolYearId={filters.schoolYearId}
        semester={filters.semester}
        years={filters.years}
      />
      <TourGrantTable
        empty={<EmptyCopy paragraphs={copy.paragraphs} />}
        grants={grants}
        hrefBase="/fulfill"
        queue="fulfill"
        showTeacher
      />
    </div>
  );
}
