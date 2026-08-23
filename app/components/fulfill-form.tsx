'use client';

import {useMemo, useState} from 'react';
import {FileUpload} from '~/components/file-upload';
import {ProductThumb} from '~/components/product-thumb';
import {Select} from '~/components/select';
import {fulfillGrantAction} from '~/fulfill/actions';
import {sumActuals, variance} from '~/lib/fulfillment';
import {formatUsd} from '~/lib/money';
import {itemImageUrl} from '~/lib/product-preview';
import type {GrantItemRow, GrantRow} from '~/lib/types';

type LineState = {
  actual_description: string;
  actual_quantity: string;
  actual_unit_price: string;
  id: string;
  item_status: 'PURCHASED' | 'SUBSTITUTED' | 'UNAVAILABLE' | 'CANCELLED';
  variance_note: string;
};

type ExtraState = {
  actual_quantity: string;
  actual_unit_price: string;
  id: string;
  item_description: string;
};

export const FulfillForm = ({grant, items}: {grant: GrantRow; items: GrantItemRow[]}) => {
  const requested = items.filter((item) => item.is_ad_hoc === 0);
  const [lines, setLines] = useState<LineState[]>(
    requested.map((item) => ({
      actual_description: '',
      actual_quantity: String(item.quantity),
      actual_unit_price: String(item.unit_price),
      id: item.id,
      item_status: 'PURCHASED',
      variance_note: '',
    })),
  );
  const [extras, setExtras] = useState<ExtraState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const actual = useMemo(
    () =>
      sumActuals(
        lines.map((line) => ({
          actual_description: line.actual_description || null,
          actual_quantity: Number(line.actual_quantity || 0),
          actual_unit_price: Number(line.actual_unit_price || 0),
          id: line.id,
          item_status: line.item_status,
        })),
        extras
          .filter((extra) => extra.item_description.trim())
          .map((extra) => ({
            actual_quantity: Number(extra.actual_quantity || 0),
            actual_unit_price: Number(extra.actual_unit_price || 0),
            item_description: extra.item_description,
          })),
      ),
    [extras, lines],
  );
  const approved = Number(grant.approved_amount ?? grant.requested_amount);
  const delta = variance(approved, actual);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    form.set(
      'items',
      JSON.stringify(
        lines.map((line) => ({
          actual_description: line.actual_description || null,
          actual_quantity: Number(line.actual_quantity || 0),
          actual_unit_price: Number(line.actual_unit_price || 0),
          id: line.id,
          item_status: line.item_status,
          variance_note: line.variance_note || null,
        })),
      ),
    );
    form.set(
      'ad_hoc_items',
      JSON.stringify(
        extras
          .filter((extra) => extra.item_description.trim())
          .map((extra) => ({
            actual_quantity: Number(extra.actual_quantity || 0),
            actual_unit_price: Number(extra.actual_unit_price || 0),
            item_description: extra.item_description,
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
              <th className="px-3 py-2">Actual qty</th>
              <th className="px-3 py-2">Actual price</th>
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
                        <p className="font-medium">{item.item_description}</p>
                        <p className="tabular-nums text-gray-500">
                          {item.quantity} × {formatUsd(item.unit_price)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Select
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
                    {line.item_status === 'SUBSTITUTED' ? (
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1"
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((row, i) =>
                              i === index ? {...row, actual_description: event.target.value} : row,
                            ),
                          )
                        }
                        placeholder="What was bought"
                        value={line.actual_description}
                      />
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1 tabular-nums"
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((row, i) =>
                            i === index ? {...row, actual_quantity: event.target.value} : row,
                          ),
                        )
                      }
                      type="number"
                      value={line.actual_quantity}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-24 rounded-lg border border-gray-300 px-2 py-1 tabular-nums"
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((row, i) =>
                            i === index ? {...row, actual_unit_price: event.target.value} : row,
                          ),
                        )
                      }
                      step="0.01"
                      type="number"
                      value={line.actual_unit_price}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full rounded-lg border border-gray-300 px-2 py-1"
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((row, i) =>
                            i === index ? {...row, variance_note: event.target.value} : row,
                          ),
                        )
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

      <div>
        <button
          className="font-body text-sm font-medium text-eagle-blue underline"
          onClick={() =>
            setExtras((current) => [
              ...current,
              {
                actual_quantity: '1',
                actual_unit_price: '0',
                id: crypto.randomUUID(),
                item_description: '',
              },
            ])
          }
          type="button"
        >
          Add tax / shipping / fee
        </button>
        <div className="mt-2 space-y-2">
          {extras.map((extra, index) => (
            <div className="grid gap-2 md:grid-cols-3" key={extra.id}>
              <input
                className="rounded-lg border border-gray-300 px-3 py-2"
                onChange={(event) =>
                  setExtras((current) =>
                    current.map((row, i) =>
                      i === index ? {...row, item_description: event.target.value} : row,
                    ),
                  )
                }
                placeholder="Tax, shipping…"
                value={extra.item_description}
              />
              <input
                className="rounded-lg border border-gray-300 px-3 py-2"
                onChange={(event) =>
                  setExtras((current) =>
                    current.map((row, i) =>
                      i === index ? {...row, actual_quantity: event.target.value} : row,
                    ),
                  )
                }
                type="number"
                value={extra.actual_quantity}
              />
              <input
                className="rounded-lg border border-gray-300 px-3 py-2"
                onChange={(event) =>
                  setExtras((current) =>
                    current.map((row, i) =>
                      i === index ? {...row, actual_unit_price: event.target.value} : row,
                    ),
                  )
                }
                step="0.01"
                type="number"
                value={extra.actual_unit_price}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="tabular-nums">
          Approved {formatUsd(approved)} · Actual {formatUsd(actual)} · Variance{' '}
          <span className={delta > 0 ? 'text-red-700' : 'text-creek-green'}>
            {formatUsd(delta)}
          </span>
        </p>
        <p className="mt-1 text-xs text-gray-500">Overages are recorded, not blocked.</p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="btn btn-brand" disabled={pending} type="submit">
        {pending ? 'Saving…' : 'Record purchase'}
      </button>
    </form>
  );
};
