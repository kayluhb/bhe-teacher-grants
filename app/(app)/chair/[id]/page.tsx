import {redirect} from 'next/navigation';
import {ChairDecisionForm} from '~/components/chair-decision-form';
import {GrantNarrative} from '~/components/grant-narrative';
import {GrantRequestedItems} from '~/components/grant-requested-items';
import {StatusPill} from '~/components/status-pill';
import {requireChairman} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {
  getGrant,
  grantTally,
  hydrateGrantItemImages,
  listEligibleVoters,
  listGrantItems,
  listReviewerRows,
  listVotes,
} from '~/lib/grants';
import {formatUsd} from '~/lib/money';
import {semesterLabel} from '~/lib/school-year';

export default async function ChairDetailPage({params}: {params: Promise<{id: string}>}) {
  const user = await requireChairman();
  const {id} = await params;
  const db = getDb();
  const grant = await getGrant(db, id);
  if (!grant || grant.status === 'DRAFT') redirect('/chair');
  const chairs = await listReviewerRows(db, grant.cycle_id);
  if (!chairs.some((row) => row.seat === 'chairman' && row.userId === user.id)) {
    redirect('/chair');
  }

  const [rawItems, votes, voters, tally] = await Promise.all([
    listGrantItems(db, id),
    listVotes(db, id),
    listEligibleVoters(db, grant),
    grantTally(db, grant),
  ]);
  const items = await hydrateGrantItemImages(
    db,
    rawItems.filter((item) => item.is_ad_hoc === 0),
  );

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
          <p className="text-xs text-gray-500 uppercase">Advisory tally</p>
          <p className="font-heading text-xl font-bold">
            {tally.approve}–{tally.reject}
            <span className="font-body ml-2 text-sm font-normal text-gray-500">
              {tally.notVoted} not voted
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Advice</p>
          <p className="font-heading text-xl font-bold">{tally.outcome ?? 'No majority'}</p>
        </div>
      </div>

      <GrantNarrative grant={grant} />

      <GrantRequestedItems items={items} />

      <div>
        <h2 className="font-heading mb-2 font-semibold">Ballots</h2>
        <ul className="space-y-2 text-sm">
          {voters.map((voter) => {
            const ballot = votes.find((row) => row.voter_id === voter.id);
            return (
              <li className="rounded-lg border border-gray-200 bg-white px-3 py-2" key={voter.id}>
                <span className="font-medium">{voter.name}</span> · {ballot?.vote ?? 'Not voted'}
                {ballot?.comment ? <p className="text-gray-600">{ballot.comment}</p> : null}
              </li>
            );
          })}
        </ul>
      </div>

      {grant.status !== 'PENDING' ? null : tally.complete ? (
        <ChairDecisionForm grantId={grant.id} />
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Waiting on {tally.notVoted} reviewer{tally.notVoted === 1 ? '' : 's'} before a decision
          can be recorded.
        </p>
      )}
    </div>
  );
}
