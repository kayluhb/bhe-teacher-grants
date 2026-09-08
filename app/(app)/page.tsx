import Link from 'next/link';
import {redirect} from 'next/navigation';
import {CommitteeProcessGuide, ProcessGuide, TeacherProcessGuide} from '~/components/process-guide';
import {StatCard} from '~/components/stat-card';
import {requireAuth} from '~/lib/auth';
import {getCycleBudget} from '~/lib/budget';
import {getDb} from '~/lib/db';
import {getActiveCycle, listGrants} from '~/lib/grants';
import {formatUsd} from '~/lib/money';
import {DOCUMENT_TITLES} from '~/lib/page-title';
import {homePathForPortals, listPortals} from '~/lib/portals';

export const metadata = {title: DOCUMENT_TITLES.home};

export default async function HomePage() {
  const user = await requireAuth();
  const db = getDb();
  const portals = await listPortals(db, user);
  const home = homePathForPortals(user, portals);
  if (home !== '/') redirect(home);
  const cycle = await getActiveCycle(db);
  const showBudget = user.role !== 'teacher';
  const [budget, pending, approved] = await Promise.all([
    showBudget && cycle ? getCycleBudget(db, cycle.id) : null,
    listGrants(db, {cycleId: cycle?.id}),
    listGrants(db, {cycleId: cycle?.id}),
  ]);

  const awaitingVote = pending.filter((grant) => grant.status === 'PENDING').length;
  const awaitingPurchase = approved.filter((grant) => grant.status === 'APPROVED').length;
  const showPending =
    user.role === 'committee' || user.role === 'admin' || user.role === 'principal';
  const showPurchase = user.role === 'admin';
  const showStats = showPending || showPurchase || Boolean(budget);

  const guide =
    user.role === 'teacher' ? (
      <TeacherProcessGuide />
    ) : user.role === 'committee' || user.role === 'principal' ? (
      <CommitteeProcessGuide />
    ) : (
      <ProcessGuide />
    );

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-charcoal" data-tour="page-heading">
            Welcome, {user.name.split(' ')[0]}
          </h1>
          <p className="font-body mt-1 text-gray-600">
            {cycle ? `${cycle.name} is open.` : 'No grant window is open right now.'}
          </p>
        </div>

        {showStats ? (
          <div className="grid gap-4 md:grid-cols-3">
            {showPending ? (
              <StatCard
                hint="Need a vote"
                label="Pending grants"
                tone="gold"
                tour="stat-pending"
                value={String(awaitingVote)}
              />
            ) : null}
            {showPurchase ? (
              <StatCard
                hint="Approved, not yet bought"
                label="To purchase"
                tour="stat-purchase"
                value={String(awaitingPurchase)}
              />
            ) : null}
            {budget ? (
              <StatCard
                hint="After committed + spent"
                label="Remaining this window"
                tone="green"
                tour="stat-budget"
                value={formatUsd(budget.remaining)}
              />
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {user.role === 'teacher' ? (
            <Link className="btn btn-primary" href="/portal">
              My grants
            </Link>
          ) : null}
          {user.role === 'admin' && cycle ? (
            <Link className="btn btn-primary" data-tour="home-submit" href="/grants/new">
              Submit grant
            </Link>
          ) : null}
          {user.role === 'committee' || user.role === 'admin' || user.role === 'principal' ? (
            <Link className="btn btn-brand" data-tour="home-review" href="/review">
              Review queue
            </Link>
          ) : null}
          {user.role === 'admin' ? (
            <Link className="btn btn-brand" data-tour="home-fulfill" href="/fulfill">
              Fulfillment
            </Link>
          ) : null}
        </div>
      </div>

      {guide}
    </div>
  );
}
