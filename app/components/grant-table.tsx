import Link from 'next/link';
import type {ReactNode} from 'react';
import {PreviewStack} from '~/components/product-thumb';
import {StatusPill} from '~/components/status-pill';
import {formatUsd} from '~/lib/money';
import {semesterLabel} from '~/lib/school-year';
import type {GrantRow} from '~/lib/types';
import {BALLOT_LABELS, type Ballot, type VoteTally} from '~/lib/votes';
import {wishlistRetailerLabel} from '~/lib/wishlist';

export const EmptyCopy = ({paragraphs}: {paragraphs: string[]}) => (
  <>
    {paragraphs.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}
  </>
);

const TallyCell = ({tally}: {tally: VoteTally | null}) => {
  if (!tally) return <span className="text-gray-400">—</span>;
  return (
    <div className="space-y-0.5 whitespace-nowrap">
      <p className="tabular-nums">
        <span className="font-semibold text-creek-green">{tally.high} High</span>
        {' · '}
        {tally.medium} Med · {tally.low} Low
      </p>
      <p className="text-xs text-gray-500">
        {tally.leaning ? `Leaning ${BALLOT_LABELS[tally.leaning]}` : 'No majority'}
        {tally.abstain > 0 ? ` · ${tally.abstain} abstain` : ''}
        {tally.notVoted > 0 ? ` · waiting on ${tally.notVoted}` : ''}
      </p>
    </div>
  );
};

export const GrantTable = ({
  empty,
  grants,
  hrefFor,
  myVote,
  showOutcome = true,
  showTeacher,
  showWindow = true,
  tallyFor,
}: {
  empty?: ReactNode;
  grants: GrantRow[];
  hrefFor: (grant: GrantRow) => string;
  myVote?: (grant: GrantRow) => Ballot | null;
  showOutcome?: boolean;
  showTeacher?: boolean;
  showWindow?: boolean;
  tallyFor?: (grant: GrantRow) => VoteTally | null;
}) => {
  if (grants.length === 0) {
    return (
      <div className="font-body space-y-2 text-sm text-gray-600">
        {empty ?? <p>Nothing here yet.</p>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-warm-white text-left text-xs tracking-wide text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-3">Grant</th>
            {showTeacher ? <th className="px-4 py-3">Teacher</th> : null}
            {showWindow ? <th className="px-4 py-3">Window</th> : null}
            <th className="px-4 py-3">Status</th>
            {myVote ? <th className="px-4 py-3">Your rank</th> : null}
            {tallyFor ? <th className="px-4 py-3">Ranks</th> : null}
            <th className="px-4 py-3 text-right">Requested</th>
            {showOutcome ? (
              <>
                <th className="px-4 py-3 text-right">Approved</th>
                <th className="px-4 py-3 text-right">Actual</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {grants.map((grant) => {
            const vote = myVote?.(grant) ?? null;
            return (
              <tr className="border-t border-gray-100" key={grant.id}>
                <td className="min-w-56 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <PreviewStack urls={grant.preview_images ?? []} />
                    <div className="min-w-0 space-y-1">
                      <Link
                        className="line-clamp-2 font-medium text-eagle-blue hover:underline"
                        href={hrefFor(grant)}
                        title={grant.title}
                      >
                        {grant.title}
                      </Link>
                      {grant.wishlist_url ? (
                        <span className="inline-block rounded-full border border-spirit-gold/40 bg-spirit-gold/15 px-2 py-0.5 text-[10px] font-medium text-night-blue">
                          {wishlistRetailerLabel(grant.wishlist_url) ?? 'Wishlist'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                {showTeacher ? (
                  <td className="px-4 py-3 whitespace-nowrap">{grant.teacher_name}</td>
                ) : null}
                {showWindow ? (
                  <td className="px-4 py-3 whitespace-nowrap">
                    {semesterLabel(grant.semester)} {grant.school_year}
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <StatusPill status={grant.status} />
                </td>
                {myVote ? (
                  <td className="px-4 py-3">{vote ? BALLOT_LABELS[vote] : 'Not ranked'}</td>
                ) : null}
                {tallyFor ? (
                  <td className="px-4 py-3">
                    <TallyCell tally={tallyFor(grant)} />
                  </td>
                ) : null}
                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                  {formatUsd(grant.requested_amount)}
                </td>
                {showOutcome ? (
                  <>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {grant.approved_amount == null ? '—' : formatUsd(grant.approved_amount)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {grant.actual_amount == null ? '—' : formatUsd(grant.actual_amount)}
                    </td>
                  </>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
