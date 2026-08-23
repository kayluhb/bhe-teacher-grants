'use client';

import {useMemo, useState} from 'react';
import {FormDialog} from '~/components/form-dialog';
import {ProductThumb} from '~/components/product-thumb';
import {RadioGroup} from '~/components/radio-group';
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
import {amazonImageUrl, asinFromUrl, itemImageUrl} from '~/lib/product-preview';
import type {GrantItemInput, GrantItemRow, GrantRow} from '~/lib/types';
import {
  canImportWishlist,
  parseWishlistXlsx,
  type WishlistItem,
  wishlistRetailerLabel,
} from '~/lib/wishlist';

type DraftItem = GrantItemInput & {clientId: string};

const emptyItem = (): DraftItem => ({
  clientId: crypto.randomUUID(),
  image_url: null,
  item_description: '',
  quantity: 1,
  source: 'MANUAL',
  unit_price: 0,
});

const fromRow = (row: GrantItemRow): DraftItem => ({
  asin: row.asin,
  clientId: row.id,
  image_url: row.image_url,
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

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

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
  const [importIndeterminate, setImportIndeterminate] = useState(false);
  const [importPercent, setImportPercent] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [pending, setPending] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);

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

  const loadPreview = async (index: number, url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      updateItem(index, {asin: null, image_url: null, vendor_url: ''});
      return;
    }
    const asin = asinFromUrl(trimmed);
    if (asin) {
      updateItem(index, {asin, image_url: amazonImageUrl(asin), vendor_url: trimmed});
      return;
    }
    updateItem(index, {vendor_url: trimmed});
    const res = await fetch('/api/preview', {
      body: JSON.stringify({url: trimmed}),
      headers: {'content-type': 'application/json'},
      method: 'POST',
    });
    const json = (await res.json()) as {image_url?: string | null};
    setItems((current) =>
      current.map((item, i) =>
        i === index && (item.vendor_url ?? '').trim() === trimmed
          ? {...item, image_url: json.image_url ?? null}
          : item,
      ),
    );
  };

  const applyImported = (importedItems: WishlistItem[], nextUrl?: string | null) => {
    if (nextUrl) setWishlistUrl(nextUrl);
    const imported = importedItems.map((item) => ({...item, clientId: crypto.randomUUID()}));
    setItems((current) => {
      const manual = current.filter(
        (item) => item.source !== 'WISHLIST' && item.item_description.trim(),
      );
      return [...imported, ...manual];
    });
    setXlsxFile(null);
    setWishlistOpen(false);
  };

  const importWishlist = async () => {
    setImporting(true);
    setImportError(null);
    try {
      if (xlsxFile) {
        setImportIndeterminate(false);
        setImportPercent(15);
        setImportStatus(`Reading ${xlsxFile.name}…`);
        await new Promise((resolve) => setTimeout(resolve, 40));
        const bytes = new Uint8Array(await xlsxFile.arrayBuffer());
        setImportPercent(60);
        setImportStatus('Finding items…');
        await new Promise((resolve) => setTimeout(resolve, 40));
        const items = parseWishlistXlsx(bytes);
        setImportPercent(100);
        if (!items.length) {
          setImportError(
            'That spreadsheet had no items we could read. Use Amazon’s More → Download list, or type the lines by hand.',
          );
          return;
        }
        applyImported(items, canImportWishlist(wishlistUrl) ? wishlistUrl : null);
        return;
      }

      setImportIndeterminate(true);
      setImportPercent(10);
      setImportStatus('Fetching your Amazon list. This can take a minute…');
      const data = new FormData();
      data.set('url', wishlistUrl);
      const res = await fetch('/api/wishlist/import', {body: data, method: 'POST'});
      let json: {error?: string; items?: WishlistItem[]; url?: string};
      try {
        json = JSON.parse(await res.text()) as typeof json;
      } catch {
        json = {
          error:
            'Amazon took too long to respond. Download the list as a spreadsheet (More → Download list) and upload that instead.',
        };
      }
      if (!res.ok || !json.items) {
        setImportError(json.error ?? 'Could not import that list.');
        return;
      }
      applyImported(json.items, json.url);
    } catch {
      setImportError(
        'Could not import that list. Try the spreadsheet from Amazon’s More → Download list, or add items by hand.',
      );
    } finally {
      setImporting(false);
      setImportIndeterminate(false);
      setImportPercent(0);
      setImportStatus('');
    }
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
    <>
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
            <RadioGroup
              className="mt-3 grid grid-cols-2 gap-x-10 gap-y-3"
              name="benefit_scope"
              onValueChange={(scope) => setBenefitScope(scope as BenefitScope)}
              options={BENEFIT_SCOPES.map((scope) => ({
                label: BENEFIT_SCOPE_LABELS[scope],
                value: scope,
              }))}
              value={benefitScope}
            />
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
                description="Paste a public Amazon list URL, or upload the .xlsx from Amazon’s More → Download list."
                onOpenChange={(next) => {
                  setWishlistOpen(next);
                  if (!next) {
                    setImportError(null);
                    setXlsxFile(null);
                    setImportStatus('');
                    setImportPercent(0);
                    setImportIndeterminate(false);
                  }
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
                <div className="mt-3">
                  <p className="font-body text-sm font-medium text-charcoal">
                    Amazon Download list spreadsheet
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <label
                      className={`btn btn-secondary cursor-pointer gap-2 ${importing ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      <input
                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="sr-only"
                        disabled={importing}
                        onChange={(event) => setXlsxFile(event.target.files?.[0] ?? null)}
                        type="file"
                      />
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                        <path
                          d="M8 10.5V3.5M8 3.5L5.5 6M8 3.5L10.5 6M3 12.5h10"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.75"
                        />
                      </svg>
                      {xlsxFile ? 'Change file' : 'Upload .xlsx'}
                    </label>
                    {xlsxFile ? (
                      <span className="font-body text-sm text-gray-600">{xlsxFile.name}</span>
                    ) : null}
                  </div>
                </div>
                <p className="font-body mt-1 text-xs text-gray-500">
                  On Amazon, open the list, choose More, then Download list. Use the .xlsx if the
                  URL import finds nothing.
                </p>
                {importError ? <p className="mt-2 text-sm text-red-700">{importError}</p> : null}
                {importing ? (
                  <div aria-live="polite" className="mt-3" role="status">
                    <p className="font-body text-sm text-charcoal">{importStatus}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-warm-white ring-1 ring-eagle-blue/15">
                      {importIndeterminate ? (
                        <div className="import-bar-indeterminate h-full w-1/3 rounded-full bg-eagle-blue" />
                      ) : (
                        <div
                          className="h-full rounded-full bg-eagle-blue transition-[width] duration-300 ease-out"
                          style={{width: `${Math.max(8, importPercent)}%`}}
                        />
                      )}
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 flex justify-end">
                  <button
                    className="btn btn-brand"
                    disabled={importing || (!canImportWishlist(wishlistUrl) && !xlsxFile)}
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
                  className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3"
                  key={item.clientId}
                >
                  <ProductThumb
                    alt=""
                    className="mt-5 h-14 w-14 shrink-0 rounded-lg bg-warm-white object-cover"
                    url={itemImageUrl(item)}
                  />
                  <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-12">
                    <label className="font-body text-xs font-medium text-charcoal md:col-span-7">
                      Item
                      <input
                        className="font-body mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        onChange={(event) =>
                          updateItem(index, {item_description: event.target.value})
                        }
                        value={item.item_description}
                      />
                    </label>
                    <label className="font-body text-xs font-medium text-charcoal md:col-span-2">
                      Quantity
                      <input
                        className="font-body mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        min={1}
                        onChange={(event) =>
                          updateItem(index, {quantity: Number(event.target.value)})
                        }
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
                        onBlur={(event) => loadPreview(index, event.target.value)}
                        onChange={(event) => updateItem(index, {vendor_url: event.target.value})}
                        placeholder="https://"
                        value={item.vendor_url ?? ''}
                      />
                    </label>
                  </div>
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

          {error ? (
            <p className="text-sm text-red-700 lg:hidden" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="hidden lg:sticky lg:top-6 lg:block lg:self-start">{sidebar}</div>
      </div>

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
    </>
  );
};
