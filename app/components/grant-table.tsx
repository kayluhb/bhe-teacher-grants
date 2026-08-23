import Link from 'next/link';
import {PreviewStack} from '~/components/product-thumb';
import {StatusPill} from '~/components/status-pill';
import {formatUsd} from '~/lib/money';
import {semesterLabel} from '~/lib/school-year';
import type {GrantRow} from '~/lib/types';
import {wishlistRetailerLabel} from '~/lib/wishlist';

export const GrantTable = ({
  grants,
  hrefFor,
  showTeacher,
}: {
  grants: GrantRow[];
  hrefFor: (grant: GrantRow) => string;
  showTeacher?: boolean;
}) => {
  if (grants.length === 0) {
    return <p className="font-body text-sm text-gray-600">Nothing here yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-warm-white text-left text-xs tracking-wide text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-3">Grant</th>
            {showTeacher ? <th className="px-4 py-3">Teacher</th> : null}
            <th className="px-4 py-3">Window</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Requested</th>
            <th className="px-4 py-3 text-right">Approved</th>
            <th className="px-4 py-3 text-right">Actual</th>
          </tr>
        </thead>
        <tbody>
          {grants.map((grant) => (
            <tr className="border-t border-gray-100" key={grant.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <PreviewStack urls={grant.preview_images ?? []} />
                  <div>
                    <Link
                      className="font-medium text-eagle-blue hover:underline"
                      href={hrefFor(grant)}
                    >
                      {grant.title}
                    </Link>
                    {grant.wishlist_url ? (
                      <span className="ml-2 rounded-full border border-spirit-gold/40 bg-spirit-gold/15 px-2 py-0.5 text-[10px] font-medium text-night-blue">
                        {wishlistRetailerLabel(grant.wishlist_url) ?? 'Wishlist'}
                      </span>
                    ) : null}
                  </div>
                </div>
              </td>
              {showTeacher ? <td className="px-4 py-3">{grant.teacher_name}</td> : null}
              <td className="px-4 py-3">
                {semesterLabel(grant.semester)} {grant.school_year}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={grant.status} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatUsd(grant.requested_amount)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {grant.approved_amount == null ? '—' : formatUsd(grant.approved_amount)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {grant.actual_amount == null ? '—' : formatUsd(grant.actual_amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
