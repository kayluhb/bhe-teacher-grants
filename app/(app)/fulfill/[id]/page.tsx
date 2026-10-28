import {redirect} from 'next/navigation';
import {FulfillForm} from '~/components/fulfill-form';
import {GrantNarrative} from '~/components/grant-narrative';
import {ProductPurchaseLink} from '~/components/product-purchase-link';
import {StatusPill} from '~/components/status-pill';
import {requireRole} from '~/lib/auth';
import {getDb} from '~/lib/db';
import {getGrant, listGrantItems} from '~/lib/grants';
import {formatUsd} from '~/lib/money';
import {GRANT_TITLE_SECTIONS, grantDocumentTitle} from '~/lib/page-title';

export const generateMetadata = async ({params}: {params: Promise<{id: string}>}) => {
  const grant = await getGrant(getDb(), (await params).id);
  return {title: grantDocumentTitle(GRANT_TITLE_SECTIONS.fulfill, grant?.title)};
};

export default async function FulfillDetailPage({params}: {params: Promise<{id: string}>}) {
  await requireRole('admin');
  const {id} = await params;
  const grant = await getGrant(getDb(), id);
  if (
    !grant ||
    grant.status === 'DRAFT' ||
    grant.status === 'PENDING' ||
    grant.status === 'REJECTED'
  ) {
    redirect('/fulfill');
  }
  const items = await listGrantItems(getDb(), id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{grant.teacher_name}</p>
          <h1 className="font-heading text-3xl font-bold text-charcoal">{grant.title}</h1>
        </div>
        <StatusPill status={grant.status} />
      </div>
      <GrantNarrative grant={grant} />

      {grant.status === 'APPROVED' ? (
        <FulfillForm grant={grant} items={items} />
      ) : (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <p className="tabular-nums">
            Approved {grant.approved_amount == null ? '—' : formatUsd(grant.approved_amount)} ·
            Actual {grant.actual_amount == null ? '—' : formatUsd(grant.actual_amount)}
            {grant.actual_amount != null && grant.approved_amount != null ? (
              <>
                {' '}
                · Variance{' '}
                <span
                  className={
                    grant.actual_amount - grant.approved_amount > 0
                      ? 'text-red-700'
                      : 'text-creek-green'
                  }
                >
                  {formatUsd(grant.actual_amount - grant.approved_amount)}
                </span>
              </>
            ) : null}
          </p>
          {grant.receipt_r2_key ? (
            <a
              className="text-eagle-blue underline"
              href={`/api/files?key=${encodeURIComponent(grant.receipt_r2_key)}`}
            >
              View receipt
            </a>
          ) : null}
          <ul className="divide-y divide-gray-100">
            {items
              .filter((item) => item.is_ad_hoc === 0)
              .map((item) => (
                <li className="py-2" key={item.id}>
                  <ProductPurchaseLink item={item}>{item.item_description}</ProductPurchaseLink>
                  {' · '}
                  {item.item_status}
                  {item.variance_note ? ` · ${item.variance_note}` : null}
                  {item.actual_description && item.actual_description !== item.variance_note
                    ? ` · ${item.actual_description}`
                    : null}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
