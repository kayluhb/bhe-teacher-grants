import Link from 'next/link';
import {ChairWizard} from '~/components/chair-wizard';
import {listCycleReviewers, listUsers} from '~/lib/admin';
import {requireChairman} from '~/lib/auth';
import {chairDecideMoney} from '~/lib/chair-decide';
import {
  EMPTY_CHAIR_PROCESS_SNAPSHOT,
  loadChairProcessSnapshot,
  resolveChairProcessStepStatus,
  reviewStepNote,
} from '~/lib/chair-process-status';
import {getDb} from '~/lib/db';
import {emailPlaceholdersByTemplateId} from '~/lib/email-template-fill';
import {evaluationVoterEmails} from '~/lib/evaluation-email';
import {grantTally, listChairCycles, listChairDecided, listChairQueue} from '~/lib/grants';
import {DOCUMENT_TITLES} from '~/lib/page-title';
import type {ReviewerSeat} from '~/lib/reviewers';
import {formatSchoolYearLong, semesterLabel} from '~/lib/school-year';

export const metadata = {title: DOCUMENT_TITLES.chair};

export default async function ChairPage() {
  const user = await requireChairman();
  const db = getDb();
  const [grants, decidedGrants, chairCycles, users] = await Promise.all([
    listChairQueue(db, user),
    listChairDecided(db, user),
    listChairCycles(db, user),
    listUsers(db),
  ]);
  const tallies = Object.fromEntries(
    await Promise.all(
      grants.map(async (grant) => [grant.id, await grantTally(db, grant)] as const),
    ),
  );
  const people = users.map((row) => ({email: row.email, id: row.id, name: row.name}));
  const windows = await Promise.all(
    chairCycles.map(async (cycle) => ({
      cycle,
      reviewers: await listCycleReviewers(db, cycle.id),
    })),
  );
  const primary = windows[0];
  const processSnapshot = primary ? await loadChairProcessSnapshot(db, primary.cycle.id) : null;
  const processStatuses = resolveChairProcessStepStatus(
    processSnapshot ?? EMPTY_CHAIR_PROCESS_SNAPSHOT,
  );
  const evaluation = primary
    ? {
        cycleId: primary.cycle.id,
        instructionsSent: Boolean(processSnapshot?.evaluationInstructionsSent),
        recipientCount: evaluationVoterEmails(
          primary.reviewers.map((row) => ({
            email: row.email,
            seat: row.seat as ReviewerSeat,
          })),
        ).length,
      }
    : null;
  const pendingStats = primary
    ? await db
        .prepare(
          `SELECT COUNT(*) AS count, COALESCE(SUM(requested_amount), 0) AS total
           FROM grants
           WHERE cycle_id = ? AND status = 'PENDING'`,
        )
        .bind(primary.cycle.id)
        .first<{count: number; total: number}>()
    : null;
  const principalName = primary?.reviewers.find((row) => row.seat === 'principal')?.name ?? '';
  const templateValuesById = primary
    ? emailPlaceholdersByTemplateId({
        applicationCount: Number(pendingStats?.count ?? 0),
        budgetLimit: primary.cycle.budget_limit,
        chairName: user.name,
        endsAt: primary.cycle.ends_at,
        principalName,
        requestedTotal: Number(pendingStats?.total ?? 0),
        reviewEndsAt: primary.cycle.review_ends_at,
        school_year: primary.cycle.school_year,
        semester: primary.cycle.semester,
      })
    : undefined;
  const committees = windows.map(({cycle, reviewers}) => ({
    cycleId: cycle.id,
    cycleLabel: `${semesterLabel(cycle.semester)} ${formatSchoolYearLong(cycle.school_year)}`,
    officerIds: reviewers.filter((row) => row.seat !== 'committee').map((row) => row.user_id),
    officers: (['principal', 'treasurer'] as const).flatMap((seat) => {
      const row = reviewers.find((item) => item.seat === seat);
      if (!row) return [];
      return [{email: row.email, id: row.user_id, name: row.name, seat}];
    }),
    selected: reviewers
      .filter((row) => row.seat === 'committee')
      .map((row) => ({email: row.email, id: row.user_id, name: row.name})),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-charcoal" data-tour="page-heading">
          Chair
        </h1>
        <p className="font-body mt-1 text-gray-600">
          Work through the cycle step by step — launch, seat the committee, monitor submissions,
          collect ranks, decide, then gather stories.{' '}
          <Link
            className="font-medium text-eagle-blue hover:underline"
            data-tour="nav-windows"
            href="/chair/windows"
          >
            Manage grant windows
          </Link>
          {' · '}
          <Link className="font-medium text-eagle-blue hover:underline" href="/community">
            Grant summary
          </Link>
        </p>
      </div>

      <ChairWizard
        committees={committees}
        decidedGrants={decidedGrants}
        decideMoney={
          chairCycles.length > 0
            ? chairDecideMoney(
                [...grants, ...decidedGrants],
                chairCycles.reduce((sum, cycle) => sum + Number(cycle.budget_limit), 0),
              )
            : null
        }
        evaluation={evaluation}
        grants={grants}
        people={people}
        primaryCycleId={primary?.cycle.id}
        reviewNote={reviewStepNote({
          awaitingRanksCount: processSnapshot?.awaitingRanksCount ?? 0,
          done: processStatuses.review.done,
          instructionsSent: Boolean(processSnapshot?.evaluationInstructionsSent),
        })}
        statuses={processStatuses}
        tallies={tallies}
        templateValuesById={templateValuesById}
      />
    </div>
  );
}
