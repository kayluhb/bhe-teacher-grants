import {redirect} from 'next/navigation';
import {ChairDecisionForm} from '~/components/chair-decision-form';
import {ChairReviseForm} from '~/components/chair-revise-form';
import {GrantNarrative} from '~/components/grant-narrative';
import {GrantNotes} from '~/components/grant-notes';
import {GrantRequestedItems} from '~/components/grant-requested-items';
import {StatusPill} from '~/components/status-pill';
import {decisionEmailDraft} from '~/lib/approval-email';
import {getSession, requireChairman} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {canAuthorGrantNote, canMutateGrantNote, listGrantNotes} from '~/lib/grant-notes';
import {
  getGrant,
  grantTally,
  listEligibleVoters,
  listGrantItems,
  listReviewerRows,
  listVotes,
} from '~/lib/grants';
import {formatUsd} from '~/lib/money';
import {GRANT_TITLE_SECTIONS, grantDocumentTitle} from '~/lib/page-title';
import {withItemImages} from '~/lib/product-preview';
import {SEAT_LABELS} from '~/lib/reviewers';
import {semesterLabel} from '~/lib/school-year';
import {BALLOT_LABELS, isBallot, isChairActor} from '~/lib/votes';

const STATUS_DRAFT = 'DRAFT';
const SEAT_CHAIRMAN = 'chairman';

export const generateMetadata = async ({params}: {params: Promise<{id: string}>}) => {
  const section = GRANT_TITLE_SECTIONS.chair;
  const user = await getSession();
  if (!user) return {title: grantDocumentTitle(section)};
  const db = getDb();
  const grant = await getGrant(db, (await params).id);
  if (!grant || grant.status === STATUS_DRAFT) return {title: grantDocumentTitle(section)};
  const chairs = await listReviewerRows(db, grant.cycle_id);
  const seatedChairman = chairs.find((row) => row.seat === SEAT_CHAIRMAN);
  if (!isChairActor(user, seatedChairman?.userId)) {
    return {title: grantDocumentTitle(section)};
  }
  return {title: grantDocumentTitle(section, grant.title)};
};

export default async function ChairDetailPage({params}: {params: Promise<{id: string}>}) {
  const user = await requireChairman();
  const {id} = await params;
  const db = getDb();
  const grant = await getGrant(db, id);
  if (!grant || grant.status === 'DRAFT') redirect('/chair');
  const chairs = await listReviewerRows(db, grant.cycle_id);
  const seatedChairman = chairs.find((row) => row.seat === 'chairman');
  if (!isChairActor(user, seatedChairman?.userId)) {
    redirect('/chair');
  }

  const [rawItems, votes, voters, tally, notes] = await Promise.all([
    listGrantItems(db, id),
    listVotes(db, id),
    listEligibleVoters(db, grant),
    grantTally(db, grant),
    listGrantNotes(db, id),
  ]);
  const items = withItemImages(rawItems.filter((item) => item.is_ad_hoc === 0));
  const canAuthorNotes = canAuthorGrantNote(user, seatedChairman?.userId);
  const mutableNoteIds = notes
    .filter((note) => canMutateGrantNote(user, note.author_id, seatedChairman?.userId))
    .map((note) => note.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            {semesterLabel(grant.semester)} {grant.school_year} · {grant.teacher_name}
          </p>
          <h1 className="font-heading text-3xl font-bold text-charcoal">{grant.title}</h1>
        </div>
        <StatusPill status={grant.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Requested</p>
          <p className="font-heading text-xl font-bold tabular-nums">
            {formatUsd(grant.requested_amount)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Ranks</p>
          <p className="font-heading text-xl font-bold">
            {tally.high} High · {tally.medium} Medium · {tally.low} Low
            <span className="font-body ml-2 text-sm font-normal text-gray-500">
              {tally.abstain} abstain · {tally.notVoted} not ranked
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Leaning</p>
          <p className="font-heading text-xl font-bold">
            {tally.leaning ? BALLOT_LABELS[tally.leaning] : 'No majority'}
          </p>
        </div>
      </div>

      <GrantNarrative grant={grant} />

      <GrantRequestedItems items={items} />

      <GrantNotes
        canAuthor={canAuthorNotes}
        currentUserId={user.id}
        grantId={grant.id}
        mutableNoteIds={mutableNoteIds}
        notes={notes}
      />

      <div>
        <h2 className="font-heading mb-2 font-semibold">Ballots</h2>
        <ul className="space-y-2 text-sm">
          {voters.map((voter) => {
            const ballot = votes.find((row) => row.voter_id === voter.id);
            return (
              <li className="rounded-lg border border-gray-200 bg-white px-3 py-2" key={voter.id}>
                <span className="font-medium">{voter.name}</span> · {SEAT_LABELS[voter.role]} ·{' '}
                {ballot && isBallot(ballot.vote) ? BALLOT_LABELS[ballot.vote] : 'Not ranked'}
                {ballot?.comment ? <p className="text-gray-600">{ballot.comment}</p> : null}
              </li>
            );
          })}
        </ul>
      </div>

      {grant.status === 'PENDING' ? (
        <div className="space-y-3">
          {tally.complete ? null : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {tally.notVoted > 0
                ? `Ranks are still coming in (${tally.notVoted} not ranked). You can approve or reject now.`
                : 'No reviewers are seated yet. You can still approve or reject this grant.'}
            </p>
          )}
          <ChairDecisionForm
            drafts={{
              APPROVED: decisionEmailDraft({
                amount: grant.requested_amount,
                chairmanName: user.name,
                outcome: 'APPROVED',
                schoolYear: grant.school_year,
                semester: grant.semester,
                teacherName: grant.teacher_name,
                title: grant.title,
              }),
              REJECTED: decisionEmailDraft({
                amount: grant.requested_amount,
                chairmanName: user.name,
                outcome: 'REJECTED',
                schoolYear: grant.school_year,
                semester: grant.semester,
                teacherName: grant.teacher_name,
                title: grant.title,
              }),
            }}
            grantId={grant.id}
            requestedAmount={grant.requested_amount}
            teacherName={grant.teacher_name}
          />
        </div>
      ) : null}
      {grant.status === 'APPROVED' || grant.status === 'REJECTED' ? (
        <ChairReviseForm
          draft={
            grant.status === 'REJECTED'
              ? decisionEmailDraft({
                  amount: grant.requested_amount,
                  chairmanName: user.name,
                  outcome: 'APPROVED',
                  schoolYear: grant.school_year,
                  semester: grant.semester,
                  teacherName: grant.teacher_name,
                  title: grant.title,
                })
              : null
          }
          grantId={grant.id}
          outcome={grant.status === 'APPROVED' ? 'REJECTED' : 'APPROVED'}
          requestedAmount={grant.requested_amount}
          teacherName={grant.teacher_name}
        />
      ) : null}
    </div>
  );
}
