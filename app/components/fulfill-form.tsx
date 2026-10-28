'use client';

import {useMemo, useState} from 'react';
import {FileUpload} from '~/components/file-upload';
import {ProductPurchaseLink} from '~/components/product-purchase-link';
import {ProductThumb} from '~/components/product-thumb';
import {Select} from '~/components/select';
import {fulfillGrantAction} from '~/fulfill/actions';
import {variance} from '~/lib/fulfillment';
import {formatUsd, money} from '~/lib/money';
import {itemImageUrl} from '~/lib/product-preview';
import type {GrantItemRow, GrantRow} from '~/lib/types';

type LineState = {
  id: string;
  item_status: 'PURCHASED' | 'SUBSTITUTED' | 'UNAVAILABLE' | 'CANCELLED';
  variance_note: string;
};

const amountValue = (raw: string): number | null => {
  if (!raw.trim()) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? money(value) : null;
};

export const FulfillForm = ({grant, items}: {grant: GrantRow; items: GrantItemRow[]}) => {
  const requested = items.filter((item) => item.is_ad_hoc === 0);
  const [lines, setLines] = useState<LineState[]>(
    requested.map((item) => ({
      id: item.id,
      item_status: 'PURCHASED',
      variance_note: '',
    })),
  );
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const actual = useMemo(() => amountValue(amount), [amount]);
  const approved = Number(grant.approved_amount ?? grant.requested_amount);
  const delta = actual == null ? null : variance(approved, actual);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    form.set('actual_amount', amount);
    form.set(
      'items',
      JSON.stringify(
        lines.map((line) => ({
          id: line.id,
          item_status: line.item_status,
          variance_note: line.variance_note || null,
        })),
      ),
    );
    const result = await fulfillGrantAction(form);
    if (result && 'error' in result) {
      setError(result.error);
      setPending(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <input name="grant_id" type="hidden" value={grant.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="font-body text-sm font-medium text-charcoal">
          Vendor
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue"
            name="vendor_name"
            required
          />
        </label>
        <label className="font-body text-sm font-medium text-charcoal">
          Tracking number
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue"
            name="tracking_number"
          />
        </label>
      </div>
      <FileUpload
        grantId={grant.id}
        kind="receipts"
        label="Receipt"
        name="receipt_r2_key"
        required
      />
      <label className="font-body block text-sm font-medium text-charcoal">
        Variance note (optional)
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue"
          name="variance_note"
        />
      </label>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-warm-white text-left text-xs tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-2">Requested</th>
              <th className="px-3 py-2">Outcome</th>
              <th className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {requested.map((item, index) => {
              const line = lines[index];
              return (
                <tr className="border-t border-gray-100" key={item.id}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <ProductThumb alt="" url={itemImageUrl(item)} />
                      <div>
                        <ProductPurchaseLink className="font-medium" item={item}>
                          {item.item_description}
                        </ProductPurchaseLink>
                        <p className="tabular-nums text-gray-500">
                          {item.quantity} × {formatUsd(item.unit_price)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      aria-label={`Outcome for ${item.item_description}`}
                      onValueChange={(itemStatus) =>
                        setLines((current) =>
                          current.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  item_status: itemStatus as LineState['item_status'],
                                }
                              : row,
                          ),
                        )
                      }
                      options={[
                        {label: 'Purchased', value: 'PURCHASED'},
                        {label: 'Substituted', value: 'SUBSTITUTED'},
                        {label: 'Unavailable', value: 'UNAVAILABLE'},
                        {label: 'Cancelled', value: 'CANCELLED'},
                      ]}
                      size="sm"
                      value={line.item_status}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`Note for ${item.item_description}`}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1"
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((row, i) =>
                            i === index ? {...row, variance_note: event.target.value} : row,
                          ),
                        )
                      }
                      placeholder={
                        line.item_status === 'SUBSTITUTED' ? 'What was bought' : undefined
                      }
                      value={line.variance_note}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <label className="font-body block text-sm font-medium text-charcoal">
        Amount spent
        <input
          className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 tabular-nums shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue"
          min="0"
          name="actual_amount"
          onChange={(event) => setAmount(event.target.value)}
          required
          step="0.01"
          type="number"
          value={amount}
        />
        <span className="mt-1 block text-xs font-normal text-gray-500">
          Full receipt total. Tax and shipping stay inside this number.
        </span>
      </label>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="tabular-nums">
          Approved {formatUsd(approved)} · Actual {actual == null ? '—' : formatUsd(actual)}
          {delta == null ? null : (
            <>
              {' '}
              · Variance{' '}
              <span className={delta > 0 ? 'text-red-700' : 'text-creek-green'}>
                {formatUsd(delta)}
              </span>
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-gray-500">Overages are recorded, not blocked.</p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-brand" disabled={pending} type="submit">
        {pending ? 'Saving…' : 'Record purchase'}
      </button>
    </form>
  );
};
