import Link from 'next/link';
import {redirect} from 'next/navigation';
import {CommitteeProcessGuide, ProcessGuide, TeacherProcessGuide} from '~/components/process-guide';
import {StatCard} from '~/components/stat-card';
import {requireAuth} from '~/lib/auth';
import {getCycleBudget} from '~/lib/budget';
import {getDb} from '~/lib/db';
import {emailPlaceholdersByTemplateId} from '~/lib/email-template-fill';
import {isSubmissionOpen} from '~/lib/grant-cycle';
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
  const canReview = portals.includes('reviewer');
  const showPending = canReview || user.role === 'admin';
  const showPurchase = user.role === 'admin';
  const showStats = showPending || showPurchase || Boolean(budget);
  const submissionOpen = Boolean(cycle && isSubmissionOpen(cycle));

  const templateValuesById = cycle
    ? emailPlaceholdersByTemplateId({
        budgetLimit: cycle.budget_limit,
        chairName: user.role === 'admin' || user.role === 'chair' ? user.name : undefined,
        endsAt: cycle.ends_at,
        reviewEndsAt: cycle.review_ends_at,
        school_year: cycle.school_year,
        semester: cycle.semester,
      })
    : undefined;
  const showTeacherGuide = portals.includes('teacher');
  const showPrincipalHome = user.role === 'principal';
  const showCommitteeGuide = canReview && !showPrincipalHome && user.role !== 'admin';
  const showAdminGuide = user.role === 'admin';

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-charcoal" data-tour="page-heading">
            Welcome, {user.name.split(' ')[0]}
          </h1>
          <p className="font-body mt-1 text-gray-600">
            {cycle
              ? submissionOpen
                ? `${cycle.name} is open for new requests.`
                : `${cycle.name} is active — submissions are closed.`
              : 'No grant window is open right now.'}
          </p>
          {showPrincipalHome ? (
            <p className="font-body mt-2 max-w-2xl text-gray-600">
              Rank each request in Review. In the comment, note any request that should not move
              forward for a school-related reason. Submit your own request from My grants while a
              window is open.
            </p>
          ) : null}
        </div>

        {showStats ? (
          <div className="grid gap-4 md:grid-cols-3">
            {showPending ? (
              <StatCard
                hint={user.role === 'admin' ? 'Need a rank or decision' : 'Need your rank'}
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
          {showTeacherGuide ? (
            <Link className="btn btn-primary" href="/portal">
              My grants
            </Link>
          ) : null}
          {user.role === 'admin' && cycle ? (
            <Link className="btn btn-primary" data-tour="home-submit" href="/grants/new">
              Submit grant
            </Link>
          ) : null}
          {canReview ? (
            <Link className="btn btn-brand" data-tour="home-review" href="/review">
              Review
            </Link>
          ) : null}
          {user.role === 'admin' ? (
            <Link className="btn btn-brand" data-tour="home-fulfill" href="/fulfill">
              Fulfillment
            </Link>
          ) : null}
        </div>
      </div>

      {showTeacherGuide && !showPrincipalHome ? <TeacherProcessGuide /> : null}
      {showCommitteeGuide ? <CommitteeProcessGuide /> : null}
      {showAdminGuide ? <ProcessGuide templateValuesById={templateValuesById} /> : null}
    </div>
  );
}
