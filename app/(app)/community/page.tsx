import Link from 'next/link';
import {redirect} from 'next/navigation';
import {GrantSummary} from '~/components/grant-summary';
import {requireAuth} from '~/lib/auth';
import {canViewGrantSummary} from '~/lib/community';
import {getSummaryCycle, listSummaryCycles, listSummaryItems} from '~/lib/community-page';
import {getDb} from '~/lib/db';
import {listUserSeats} from '~/lib/grants';
import {DOCUMENT_TITLES} from '~/lib/page-title';
import {homePath} from '~/lib/roles';

export const metadata = {title: DOCUMENT_TITLES.community};

export default async function GrantSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{cycle?: string | string[]}>;
}) {
  const user = await requireAuth();
  const db = getDb();
  const seats = await listUserSeats(db, user.id);
  if (!canViewGrantSummary(user, seats.includes('chairman'))) redirect(homePath(user.role));

  const params = await searchParams;
  const cycles = await listSummaryCycles(db, user);
  const requested = Array.isArray(params.cycle) ? params.cycle[0] : params.cycle;
  const cycleId = cycles.some((cycle) => cycle.id === requested) ? requested : cycles[0]?.id;
  const cycle = cycleId ? await getSummaryCycle(db, cycleId) : null;
  const items = cycle ? await listSummaryItems(db, cycle.id) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal">Grant summary</h1>
        <p className="font-body mt-1 text-gray-600">
          Approved items for the newsletter. Same list, three ways to pile it. No prices.
        </p>
      </div>

      {cycles.length > 1 ? (
        <ul className="flex flex-wrap gap-2">
          {cycles.map((item) => (
            <li key={item.id}>
              <Link
                className={`px-1 py-1 text-sm font-medium ${
                  item.id === cycle?.id
                    ? 'text-eagle-blue underline'
                    : 'text-gray-600 hover:text-charcoal'
                }`}
                href={`/community?cycle=${item.id}`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {cycle ? (
        <GrantSummary cycleId={cycle.id} cycleName={cycle.name} items={items} />
      ) : (
        <p className="text-sm text-gray-600">No grant window is available yet.</p>
      )}
    </div>
  );
}
