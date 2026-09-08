import Link from 'next/link';
import {ChairCommittee} from '~/components/chair-committee';
import {ChairProcessGuide} from '~/components/process-guide';
import {SendEvaluationEmail} from '~/components/send-evaluation-email';
import {TourGrantTable} from '~/components/tour-grant-table';
import {listCycleReviewers, listUsers} from '~/lib/admin';
import {requireChairman} from '~/lib/auth';
import {loadChairProcessSnapshot, resolveChairProcessStepStatus} from '~/lib/chair-process-status';
import {getDb} from '~/lib/db';
import {evaluationVoterEmails} from '~/lib/evaluation-email';
import {listChairCycles, listChairQueue} from '~/lib/grants';
import {DOCUMENT_TITLES} from '~/lib/page-title';
import type {ReviewerSeat} from '~/lib/reviewers';
import {formatSchoolYearLong, semesterLabel} from '~/lib/school-year';

export const metadata = {title: DOCUMENT_TITLES.chair};

export default async function ChairPage() {
  const user = await requireChairman();
  const db = getDb();
  const [grants, chairCycles, users] = await Promise.all([
    listChairQueue(db, user),
    listChairCycles(db, user),
    listUsers(db),
  ]);
  const people = users.map((row) => ({email: row.email, id: row.id, name: row.name}));
  const windows = await Promise.all(
    chairCycles.map(async (cycle) => ({
      cycle,
      reviewers: await listCycleReviewers(db, cycle.id),
    })),
  );
  const primary = windows[0];
  const evaluation = primary
    ? {
        cycleId: primary.cycle.id,
        recipientCount: evaluationVoterEmails(
          primary.reviewers.map((row) => ({
            email: row.email,
            seat: row.seat as ReviewerSeat,
          })),
        ).length,
      }
    : null;
  const processSnapshot = primary ? await loadChairProcessSnapshot(db, primary.cycle.id) : null;
  const processStatuses = resolveChairProcessStepStatus(
    processSnapshot ?? {
      approvedOpenCount: 0,
      cycle: null,
      decidedCount: 0,
      manualDoneStepIds: [],
      pendingCount: 0,
      seats: [],
    },
  );

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-charcoal" data-tour="page-heading">
            Chair
          </h1>
          <p className="font-body mt-1 text-gray-600">
            Confirm the committee, then open submitted grants to track ranks or record outcomes once
            every required ballot is in.{' '}
            <Link
              className="font-medium text-eagle-blue hover:underline"
              data-tour="nav-windows"
              href="/chair/windows"
            >
              Manage grant windows
            </Link>
          </p>
        </div>
        {windows.map(({cycle, reviewers}) => {
          const committee = reviewers
            .filter((row) => row.seat === 'committee')
            .map((row) => ({email: row.email, id: row.user_id, name: row.name}));
          const officerIds = reviewers
            .filter((row) => row.seat !== 'committee')
            .map((row) => row.user_id);
          return (
            <ChairCommittee
              cycleId={cycle.id}
              cycleLabel={`${semesterLabel(cycle.semester)} ${formatSchoolYearLong(cycle.school_year)}`}
              key={cycle.id}
              officerIds={officerIds}
              people={people}
              selected={committee}
            />
          );
        })}
        {evaluation ? (
          <SendEvaluationEmail
            cycleId={evaluation.cycleId}
            recipientCount={evaluation.recipientCount}
          />
        ) : null}
        <section className="space-y-3" id="chair-queue">
          <h2 className="font-heading text-xl font-semibold text-charcoal">Chair queue</h2>
          <TourGrantTable grants={grants} hrefBase="/chair" queue="chairman" showTeacher />
        </section>
      </div>

      <ChairProcessGuide cycleId={primary?.cycle.id} statuses={processStatuses} />
    </div>
  );
}
