import {redirect} from 'next/navigation';
import {GrantNarrative} from '~/components/grant-narrative';
import {GrantRequestedItems} from '~/components/grant-requested-items';
import {StatusPill} from '~/components/status-pill';
import {VoteForm} from '~/components/vote-form';
import {requireReviewer} from '~/lib/auth';
import {getCycleBudget} from '~/lib/budget';
import {getDb} from '~/lib/db';
import {
  getGrant,
  hydrateGrantItemImages,
  listGrantItems,
  listReviewQueue,
  listVotes,
} from '~/lib/grants';
import {formatUsd} from '~/lib/money';
import {semesterLabel} from '~/lib/school-year';
import type {Ballot} from '~/lib/votes';

export default async function ReviewDetailPage({params}: {params: Promise<{id: string}>}) {
  const user = await requireReviewer();
  const {id} = await params;
  const db = getDb();
  const grant = await getGrant(db, id);
  if (!grant || grant.status === 'DRAFT') redirect('/review');

  const queue = await listReviewQueue(db, user.id);
  const inQueue = queue.some((row) => row.id === grant.id);
  if (grant.status === 'PENDING' && grant.teacher_id !== user.id && !inQueue) {
    redirect('/review');
  }

  const [rawItems, votes, budget] = await Promise.all([
    listGrantItems(db, id),
    listVotes(db, id),
    getCycleBudget(db, grant.cycle_id),
  ]);
  const items = await hydrateGrantItemImages(
    db,
    rawItems.filter((item) => item.is_ad_hoc === 0),
  );
  const mine = votes.find((row) => row.voter_id === user.id);

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
          <p className="text-xs text-gray-500 uppercase">Remaining if this passed</p>
          <p className="font-heading text-xl font-bold tabular-nums">
            {budget
              ? formatUsd(
                  budget.remaining - (grant.status === 'PENDING' ? grant.requested_amount : 0),
                )
              : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Your ballot</p>
          <p className="font-heading text-xl font-bold">{mine?.vote ?? 'Not voted'}</p>
        </div>
      </div>

      <GrantNarrative grant={grant} />

      <GrantRequestedItems items={items} />

      {grant.status === 'PENDING' && grant.teacher_id !== user.id ? (
        <VoteForm existing={mine?.vote as Ballot | undefined} grantId={grant.id} />
      ) : null}
    </div>
  );
}
