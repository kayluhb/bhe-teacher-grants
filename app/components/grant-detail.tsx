import Link from 'next/link';
import {DeliveryForm} from '~/components/delivery-form';
import {GrantForm} from '~/components/grant-form';
import {GrantNarrative} from '~/components/grant-narrative';
import {ProductThumb} from '~/components/product-thumb';
import {StatCard} from '~/components/stat-card';
import {StatusPill} from '~/components/status-pill';
import {formatUsd} from '~/lib/money';
import {itemImageUrl} from '~/lib/product-preview';
import {semesterLabel} from '~/lib/school-year';
import type {CycleRow, GrantItemRow, GrantRow} from '~/lib/types';

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
        <p className="font-body text-xs font-semibold tracking-[0.16em] text-gray-500 uppercase">
          {semesterLabel(grant.semester)} {grant.school_year}
        </p>
        <h1 className="font-heading mt-1 text-3xl font-bold text-charcoal">{grant.title}</h1>
        <p className="font-body mt-1 text-sm text-gray-600">Submitted by {grant.teacher_name}</p>
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
      <div className="space-y-6">
        <GrantNarrative grant={grant} />
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            hint="Estimated total from the items below"
            label="Requested"
            value={formatUsd(grant.requested_amount)}
          />
          <StatCard
            hint={
              grant.approved_amount == null
                ? 'Set when voting passes'
                : 'Authorized spend for this request'
            }
            label="Approved"
            tone={grant.approved_amount == null ? 'gold' : 'green'}
            value={grant.approved_amount == null ? '—' : formatUsd(grant.approved_amount)}
          />
          <StatCard
            hint={grant.actual_amount == null ? 'Recorded after the PTA buys' : 'What the PTA paid'}
            label="Actual"
            tone={grant.actual_amount == null ? 'default' : 'green'}
            value={grant.actual_amount == null ? '—' : formatUsd(grant.actual_amount)}
          />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-charcoal">Requested items</h2>
          <p className="font-body mt-1 mb-3 text-sm text-gray-600">
            Prices are estimates from when this was submitted. Checkout may come in higher or lower.
          </p>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
            {items.map((item) => (
              <li className="flex items-center justify-between gap-4 px-4 py-3" key={item.id}>
                <span className="flex min-w-0 items-center gap-3">
                  <ProductThumb alt="" url={itemImageUrl(item)} />
                  <span>
                    {item.item_description}
                    <span className="ml-2 text-gray-500">× {item.quantity}</span>
                  </span>
                </span>
                <span className="tabular-nums">{formatUsd(item.total_price)}</span>
              </li>
            ))}
          </ul>
        </div>
        {grant.status === 'PURCHASED' ? <DeliveryForm grantId={grant.id} /> : null}
        <Link className="text-sm text-eagle-blue underline" href={backHref}>
          Back to grants
        </Link>
      </div>
    ) : null}
  </div>
);
