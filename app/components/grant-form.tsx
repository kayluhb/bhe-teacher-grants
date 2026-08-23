'use client';

import {useMemo, useState} from 'react';
import {FormDialog} from '~/components/form-dialog';
import {saveGrantAction} from '~/grants/actions';
import {
  BENEFIT_SCOPE_LABELS,
  BENEFIT_SCOPES,
  type BenefitScope,
  type GrantFormCheck,
  gradesImpactedRequired,
  grantFormChecklist,
  summarizeGrantItems,
} from '~/lib/grant-application';
import {formatUsd} from '~/lib/money';
import type {GrantItemInput, GrantItemRow, GrantRow} from '~/lib/types';
import {canImportWishlist, type WishlistItem, wishlistRetailerLabel} from '~/lib/wishlist';

type DraftItem = GrantItemInput & {clientId: string};

const emptyItem = (): DraftItem => ({
  clientId: crypto.randomUUID(),
  item_description: '',
  quantity: 1,
  source: 'MANUAL',
  unit_price: 0,
});

const fromRow = (row: GrantItemRow): DraftItem => ({
  asin: row.asin,
  clientId: row.id,
  item_description: row.item_description,
  quantity: row.quantity,
  quote_r2_key: row.quote_r2_key,
  source: row.source,
  unit_price: row.unit_price,
  vendor_url: row.vendor_url,
});

const inputClass =
  'font-body mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue';

const GrantRequestSidebar = ({
  applicantName,
  benefitLabel,
  checks,
  cycleName,
  error,
  gradesImpacted,
  onSaveDraft,
  onSubmit,
  pending,
  retailer,
  summary,
}: {
  applicantName: string;
  benefitLabel: string | null;
  checks: GrantFormCheck[];
  cycleName?: string;
  error: string | null;
  gradesImpacted: string;
  onSaveDraft: () => void;
  onSubmit: () => void;
  pending: boolean;
  retailer: string | null;
  summary: ReturnType<typeof summarizeGrantItems>;
}) => {
  const remaining = checks.filter((check) => !check.done).length;

  return (
    <aside className="overflow-hidden rounded-2xl border border-eagle-blue/15 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-eagle-blue to-night-blue px-4 py-4 text-white">
        <p className="font-body text-[11px] font-semibold tracking-[0.18em] text-spirit-gold uppercase">
          Requested total
        </p>
        <p className="font-heading mt-1 text-3xl font-bold tabular-nums">
          {formatUsd(summary.total)}
        </p>
        <p className="font-body mt-2 text-sm text-white/75">
          {summary.count === 0
            ? 'No items yet'
            : `${summary.count} ${summary.count === 1 ? 'item' : 'items'}`}
        </p>
        {cycleName ? <p className="font-body mt-1 text-xs text-white/60">{cycleName}</p> : null}
      </div>

      <div className="space-y-4 px-4 py-4">
        <div>
          <p className="font-body text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
            Applicant
          </p>
          <p className="font-body mt-0.5 text-sm font-medium text-charcoal">{applicantName}</p>
        </div>

        <div>
          <p className="font-body text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
            Still needed
          </p>
          <ul className="mt-2 space-y-1.5">
            {checks.map((check) => (
              <li className="flex items-center gap-2 text-sm" key={check.id}>
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    check.done
                      ? 'bg-creek-green text-white'
                      : 'border border-gray-300 bg-white text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className={check.done ? 'text-gray-500 line-through' : 'text-charcoal'}>
                  {check.label}
                </span>
              </li>
            ))}
          </ul>
          <p className="font-body mt-2 text-xs text-gray-500">
            {remaining === 0
              ? 'Ready to submit.'
              : `${remaining} ${remaining === 1 ? 'item' : 'items'} left before submit.`}
          </p>
        </div>

        <div>
          <p className="font-body text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
            Who it benefits
          </p>
          <p className="font-body mt-0.5 text-sm text-charcoal">
            {benefitLabel ?? 'Not selected yet'}
          </p>
          {gradesImpacted ? (
            <p className="font-body mt-0.5 text-xs text-gray-500">Grades: {gradesImpacted}</p>
          ) : null}
        </div>

        {retailer ? (
          <p className="font-body text-xs text-gray-500">{retailer} wishlist attached</p>
        ) : null}

        {summary.lines.length > 0 ? (
          <ul className="max-h-40 space-y-2 overflow-y-auto border-t border-gray-100 pt-3">
            {summary.lines.map((line) => (
              <li className="flex items-start justify-between gap-3 text-sm" key={line.description}>
                <span className="min-w-0">
                  <span className="block truncate text-charcoal">{line.description}</span>
                  <span className="text-xs text-gray-500">× {line.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums text-charcoal">{formatUsd(line.total)}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex flex-col gap-2">
          <button
            className="btn btn-secondary w-full"
            disabled={pending}
            onClick={onSaveDraft}
            type="button"
          >
            Save draft
          </button>
          <button
            className="btn btn-primary w-full"
            disabled={pending}
            onClick={onSubmit}
            type="button"
          >
            Submit grant
          </button>
        </div>
      </div>
    </aside>
  );
};

export const GrantForm = ({
  applicant,
  cycleId,
  cycleName,
  grant,
  items: initialItems,
}: {
  applicant: {email: string; name: string};
  cycleId: string;
  cycleName?: string;
  grant?: GrantRow;
  items?: GrantItemRow[];
}) => {
  const [description, setDescription] = useState(grant?.impact_statement || grant?.title || '');
  const [benefitScope, setBenefitScope] = useState<BenefitScope | ''>(grant?.benefit_scope ?? '');
  const [gradesImpacted, setGradesImpacted] = useState(grant?.grade_level_subject ?? '');
  const [wishlistUrl, setWishlistUrl] = useState(grant?.wishlist_url ?? '');
  const [items, setItems] = useState<DraftItem[]>(
    initialItems?.filter((row) => row.is_ad_hoc === 0).map(fromRow) ?? [emptyItem()],
  );
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);

  const checks = useMemo(
    () => grantFormChecklist({benefitScope, description, gradesImpacted, items}),
    [benefitScope, description, gradesImpacted, items],
  );
  const summary = useMemo(() => summarizeGrantItems(items), [items]);
  const showGrades = Boolean(benefitScope && benefitScope !== 'CLASS');
  const retailer = wishlistRetailerLabel(wishlistUrl);
  const benefitLabel = benefitScope ? BENEFIT_SCOPE_LABELS[benefitScope] : null;

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((current) => current.map((item, i) => (i === index ? {...item, ...patch} : item)));
  };

  const importWishlist = async () => {
    setImporting(true);
    setImportError(null);
    const res = await fetch('/api/wishlist/import', {
      body: JSON.stringify({url: wishlistUrl}),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    });
    const json = (await res.json()) as {error?: string; items?: WishlistItem[]; url?: string};
    setImporting(false);
    if (!res.ok || !json.items) {
      setImportError(json.error ?? 'Could not import that list.');
      return;
    }
    if (json.url) setWishlistUrl(json.url);
    const imported = json.items.map((item) => ({...item, clientId: crypto.randomUUID()}));
    setItems((current) => {
      const manual = current.filter(
        (item) => item.source !== 'WISHLIST' && item.item_description.trim(),
      );
      return [...imported, ...manual];
    });
    setWishlistOpen(false);
  };

  const submit = async (submitNow: boolean) => {
    setPending(true);
    setError(null);
    const data = new FormData();
    data.set('grant_id', grant?.id ?? '');
    data.set('cycle_id', cycleId);
    data.set('description', description);
    data.set('benefit_scope', benefitScope);
    data.set('grades_impacted', showGrades ? gradesImpacted : '');
    data.set('wishlist_url', wishlistUrl);
    data.set('items', JSON.stringify(items.map(({clientId: _clientId, ...item}) => item)));
    data.set('submit', submitNow ? '1' : '0');
    const result = await saveGrantAction(data);
    if (result && 'error' in result) {
      setError(result.error);
      setPending(false);
    }
  };

  const sidebar = (
    <GrantRequestSidebar
      applicantName={applicant.name}
      benefitLabel={benefitLabel}
      checks={checks}
      cycleName={cycleName}
      error={error}
      gradesImpacted={gradesImpacted.trim()}
      onSaveDraft={() => submit(false)}
      onSubmit={() => submit(true)}
      pending={pending}
      retailer={retailer}
      summary={summary}
    />
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      <div className="space-y-6 pb-28 lg:pb-0">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="font-body text-sm font-medium text-charcoal">
            Email Address
            <input
              className={`${inputClass} bg-warm-white text-gray-700`}
              readOnly
              value={applicant.email}
            />
          </label>
          <label className="font-body text-sm font-medium text-charcoal">
            Name of applicant/s:
            <input
              className={`${inputClass} bg-warm-white text-gray-700`}
              readOnly
              value={applicant.name}
            />
          </label>
        </div>

        <label className="font-body block text-sm font-medium text-charcoal">
          Please share a short description of your request.
          <textarea
            className={`${inputClass} min-h-28`}
            onChange={(event) => setDescription(event.target.value)}
            required
            value={description}
          />
        </label>

        <fieldset>
          <legend className="font-body text-sm font-medium text-charcoal">
            Will this grant benefit your class, your whole grade, multiple grades or the whole
            school?
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {BENEFIT_SCOPES.map((scope) => (
              <label
                className="font-body flex items-center gap-2 text-sm text-charcoal"
                key={scope}
              >
                <input
                  checked={benefitScope === scope}
                  name="benefit_scope"
                  onChange={() => setBenefitScope(scope)}
                  type="radio"
                  value={scope}
                />
                {BENEFIT_SCOPE_LABELS[scope]}
              </label>
            ))}
          </div>
        </fieldset>

        {benefitScope && benefitScope !== 'CLASS' ? (
          <label className="font-body block text-sm font-medium text-charcoal">
            {gradesImpactedRequired(benefitScope)
              ? 'If you answered "Multiple grades" or "Whole grade" above, what grades are impacted?'
              : 'What grades are impacted? (optional)'}
            <input
              className={inputClass}
              onChange={(event) => setGradesImpacted(event.target.value)}
              required={gradesImpactedRequired(benefitScope)}
              value={gradesImpacted}
            />
          </label>
        ) : null}

        <div>
          <p className="font-body text-sm text-gray-600">
            Prefer a public Amazon, Walmart, or Target list — the PTA is tax-exempt at all three.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <FormDialog
              description="Paste a public Amazon wishlist URL to prefill line items. The list must be public."
              onOpenChange={(next) => {
                setWishlistOpen(next);
                if (!next) setImportError(null);
              }}
              open={wishlistOpen}
              title="Import Amazon wishlist"
              triggerClassName="btn btn-brand"
              triggerLabel="Import Amazon wishlist"
            >
              <label className="font-body block text-sm font-medium text-charcoal">
                Amazon wishlist URL
                <input
                  className={`${inputClass}`}
                  onChange={(event) => setWishlistUrl(event.target.value)}
                  placeholder="https://www.amazon.com/hz/wishlist/ls/…"
                  value={wishlistUrl}
                />
              </label>
              {importError ? <p className="mt-2 text-sm text-red-700">{importError}</p> : null}
              <div className="mt-4 flex justify-end">
                <button
                  className="btn btn-brand"
                  disabled={importing || !canImportWishlist(wishlistUrl)}
                  onClick={importWishlist}
                  type="button"
                >
                  {importing ? 'Importing…' : 'Import list'}
                </button>
              </div>
            </FormDialog>
            {retailer ? (
              <p className="font-body text-sm text-gray-600">{retailer} wishlist attached</p>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {items.map((item, index) => (
              <div
                className="grid gap-2 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-12"
                key={item.clientId}
              >
                <label className="font-body text-xs font-medium text-charcoal md:col-span-7">
                  Item
                  <input
                    className="font-body mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    onChange={(event) => updateItem(index, {item_description: event.target.value})}
                    value={item.item_description}
                  />
                </label>
                <label className="font-body text-xs font-medium text-charcoal md:col-span-2">
                  Quantity
                  <input
                    className="font-body mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    min={1}
                    onChange={(event) => updateItem(index, {quantity: Number(event.target.value)})}
                    type="number"
                    value={item.quantity}
                  />
                </label>
                <label className="font-body text-xs font-medium text-charcoal md:col-span-2">
                  Unit price
                  <input
                    className="font-body mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    min={0}
                    onChange={(event) =>
                      updateItem(index, {unit_price: Number(event.target.value)})
                    }
                    step="0.01"
                    type="number"
                    value={item.unit_price}
                  />
                </label>
                <button
                  className="text-sm text-red-700 md:col-span-1 md:self-end md:pb-2"
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  type="button"
                >
                  Remove
                </button>
                <label className="font-body text-xs font-medium text-charcoal md:col-span-12">
                  Vendor URL
                  <input
                    className="font-body mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    onChange={(event) => updateItem(index, {vendor_url: event.target.value})}
                    placeholder="https://"
                    value={item.vendor_url ?? ''}
                  />
                </label>
              </div>
            ))}
          </div>
          <button
            className="font-body mt-3 text-sm font-medium text-eagle-blue underline"
            onClick={() => setItems((current) => [...current, emptyItem()])}
            type="button"
          >
            Add item
          </button>
        </div>

        {error ? <p className="text-sm text-red-700 lg:hidden">{error}</p> : null}
      </div>

      <div className="hidden lg:sticky lg:top-6 lg:block">{sidebar}</div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-warm-white/95 px-4 py-3 backdrop-blur md:left-60 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-body text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
              Requested
            </p>
            <p className="font-heading text-lg font-bold tabular-nums text-charcoal">
              {formatUsd(summary.total)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary"
              disabled={pending}
              onClick={() => submit(false)}
              type="button"
            >
              Save draft
            </button>
            <button
              className="btn btn-primary"
              disabled={pending}
              onClick={() => submit(true)}
              type="button"
            >
              Submit grant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
