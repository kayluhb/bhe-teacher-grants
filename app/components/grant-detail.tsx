import Link from 'next/link';
import {DeliveryForm} from '~/components/delivery-form';
import {GrantForm} from '~/components/grant-form';
import {GrantNarrative} from '~/components/grant-narrative';
import {StatusPill} from '~/components/status-pill';
import {formatUsd} from '~/lib/money';
import {semesterLabel} from '~/lib/school-year';
import type {CycleRow, GrantItemRow, GrantRow} from '~/lib/types';
import {wishlistRetailerLabel} from '~/lib/wishlist';

export const GrantDetail = ({
  backHref,
  cycle,
  grant,
  items,
}: {
  backHref: string;
  cycle: CycleRow | null;
  grant: GrantRow;
  items: GrantItemRow[];
}) => (
  <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm text-gray-500">
          {semesterLabel(grant.semester)} {grant.school_year}
        </p>
        <h1 className="font-heading text-3xl font-bold text-charcoal">{grant.title}</h1>
      </div>
      <StatusPill status={grant.status} />
    </div>

    {grant.status === 'DRAFT' && cycle ? (
      <GrantForm
        applicant={{email: grant.teacher_email, name: grant.teacher_name}}
        cycleId={cycle.id}
        cycleName={cycle.name}
        grant={grant}
        items={items}
      />
    ) : null}

    {grant.status !== 'DRAFT' ? (
      <div className="space-y-4">
        <GrantNarrative grant={grant} />
        {grant.wishlist_url ? (
          <a
            className="font-medium text-eagle-blue underline"
            href={grant.wishlist_url}
            rel="noopener"
            target="_blank"
          >
            Open {wishlistRetailerLabel(grant.wishlist_url) ?? ''} wishlist
          </a>
        ) : null}
        <dl className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <dt className="text-xs text-gray-500 uppercase">Requested</dt>
            <dd className="font-heading text-xl font-bold tabular-nums">
              {formatUsd(grant.requested_amount)}
            </dd>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <dt className="text-xs text-gray-500 uppercase">Approved</dt>
            <dd className="font-heading text-xl font-bold tabular-nums">
              {grant.approved_amount == null ? '—' : formatUsd(grant.approved_amount)}
            </dd>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <dt className="text-xs text-gray-500 uppercase">Actual</dt>
            <dd className="font-heading text-xl font-bold tabular-nums">
              {grant.actual_amount == null ? '—' : formatUsd(grant.actual_amount)}
            </dd>
          </div>
        </dl>
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {items.map((item) => (
            <li className="flex justify-between gap-4 px-4 py-3" key={item.id}>
              <span>
                {item.item_description}
                <span className="ml-2 text-gray-500">× {item.quantity}</span>
              </span>
              <span className="tabular-nums">{formatUsd(item.total_price)}</span>
            </li>
          ))}
        </ul>
        {grant.status === 'PURCHASED' ? <DeliveryForm grantId={grant.id} /> : null}
        <Link className="text-sm text-eagle-blue underline" href={backHref}>
          Back to grants
        </Link>
      </div>
    ) : null}
  </div>
);
