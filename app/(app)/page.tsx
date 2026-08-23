import Link from 'next/link';
import {redirect} from 'next/navigation';
import {StatCard} from '~/components/stat-card';
import {requireAuth} from '~/lib/auth';
import {getCycleBudget} from '~/lib/budget';
import {getDb} from '~/lib/db';
import {getActiveCycle, listGrants} from '~/lib/grants';
import {formatUsd} from '~/lib/money';
import {homePathForPortals, listPortals} from '~/lib/portals';

export default async function HomePage() {
  const user = await requireAuth();
  const db = getDb();
  const portals = await listPortals(db, user);
  const home = homePathForPortals(user, portals);
  if (home !== '/') redirect(home);
  const cycle = await getActiveCycle(db);
  const [budget, pending, approved] = await Promise.all([
    cycle ? getCycleBudget(db, cycle.id) : null,
    listGrants(db, {cycleId: cycle?.id}),
    listGrants(db, {cycleId: cycle?.id}),
  ]);

  const awaitingVote = pending.filter((grant) => grant.status === 'PENDING').length;
  const awaitingPurchase = approved.filter((grant) => grant.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal">
          Welcome, {user.name.split(' ')[0]}
        </h1>
        <p className="font-body mt-1 text-gray-600">
          {cycle ? `${cycle.name} is open.` : 'No grant window is open right now.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {user.role === 'committee' || user.role === 'admin' || user.role === 'principal' ? (
          <StatCard
            hint="Need a vote"
            label="Pending grants"
            tone="gold"
            value={String(awaitingVote)}
          />
        ) : null}
        {user.role === 'admin' ? (
          <StatCard
            hint="Approved, not yet bought"
            label="To purchase"
            value={String(awaitingPurchase)}
          />
        ) : null}
        {budget ? (
          <StatCard
            hint="After committed + spent"
            label="Remaining this window"
            tone="green"
            value={formatUsd(budget.remaining)}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        {user.role === 'admin' && cycle ? (
          <Link className="btn btn-primary" href="/grants/new">
            Submit grant
          </Link>
        ) : null}
        {user.role === 'committee' || user.role === 'admin' || user.role === 'principal' ? (
          <Link className="btn btn-brand" href="/review">
            Review queue
          </Link>
        ) : null}
        {user.role === 'admin' ? (
          <Link className="btn btn-brand" href="/fulfill">
            Fulfillment
          </Link>
        ) : null}
      </div>
    </div>
  );
}
