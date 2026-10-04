'use client';

import {useMemo, useRef, useState} from 'react';
import {FormProgress} from '~/components/grant-form/form-progress';
import {AddAnotherStep} from '~/components/grant-form/steps/add-another-step';
import {BenefitStep} from '~/components/grant-form/steps/benefit-step';
import {DescriptionStep} from '~/components/grant-form/steps/description-step';
import {GradesStep} from '~/components/grant-form/steps/grades-step';
import {ItemDetailsStep} from '~/components/grant-form/steps/item-details-step';
import {ItemSourceStep} from '~/components/grant-form/steps/item-source-step';
import {ReviewStep} from '~/components/grant-form/steps/review-step';
import {WelcomeStep} from '~/components/grant-form/steps/welcome-step';
import {WishlistImportStep} from '~/components/grant-form/steps/wishlist-import-step';
import {
  type DraftItem,
  emptyItem,
  isFilledItem,
  PROGRESS_STEPS,
  progressIndexForScreen,
  type WizardScreen,
} from '~/components/grant-form/types';
import {saveGrantAction, saveGrantDraftAction} from '~/grants/actions';
import {
  type BenefitScope,
  gradesImpactedRequired,
  grantFormChecklist,
  summarizeGrantItems,
} from '~/lib/grant-application';
import {amazonImageUrl, asinFromUrl} from '~/lib/product-preview';
import type {GrantItemRow, GrantRow} from '~/lib/types';
import {
  canImportWishlist,
  parseWishlistXlsx,
  type WishlistItem,
  wishlistRetailerLabel,
} from '~/lib/wishlist';

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

const initialItemsFromGrant = (items?: GrantItemRow[]): DraftItem[] =>
  items?.filter((row) => row.is_ad_hoc === 0).map(fromRow) ?? [];

const initialScreen = (grant?: GrantRow, items?: GrantItemRow[]): WizardScreen => {
  if (!grant) return 'welcome';
  const draftItems = initialItemsFromGrant(items);
  const description = grant.impact_statement || grant.title || '';
  if (!description.trim()) return 'welcome';
  if (gradesImpactedRequired(grant.benefit_scope) && !grant.grade_level_subject?.trim()) {
    return 'grades';
  }
  if (!draftItems.some(isFilledItem)) return 'itemSource';
  return 'review';
};

type DraftSnapshot = {
  benefitScope: BenefitScope | '';
  description: string;
  gradesImpacted: string;
  items: DraftItem[];
  wishlistUrl: string;
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
  const [screen, setScreen] = useState<WizardScreen>(() => initialScreen(grant, initialItems));
  const [returnToReview, setReturnToReview] = useState(false);
  const [grantId, setGrantId] = useState(grant?.id ?? '');
  const [description, setDescription] = useState(grant?.impact_statement || grant?.title || '');
  const [benefitScope, setBenefitScope] = useState<BenefitScope | ''>(grant?.benefit_scope ?? '');
  const [gradesImpacted, setGradesImpacted] = useState(grant?.grade_level_subject ?? '');
  const [wishlistUrl, setWishlistUrl] = useState(grant?.wishlist_url ?? '');
  const [items, setItems] = useState<DraftItem[]>(() => initialItemsFromGrant(initialItems));
  const [draftItem, setDraftItem] = useState<DraftItem | null>(null);
  const [lastItemLabel, setLastItemLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importIndeterminate, setImportIndeterminate] = useState(false);
  const [importPercent, setImportPercent] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [pending, setPending] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const autosaveSeq = useRef(0);

  const checks = useMemo(
    () => grantFormChecklist({benefitScope, description, gradesImpacted, items}),
    [benefitScope, description, gradesImpacted, items],
  );
  const summary = useMemo(() => summarizeGrantItems(items), [items]);
  const showGrades = Boolean(benefitScope && gradesImpactedRequired(benefitScope));
  const retailer = wishlistRetailerLabel(wishlistUrl);
  const filledCount = items.filter(isFilledItem).length;
  const progressIndex = progressIndexForScreen(screen);

  const go = (next: WizardScreen, options?: {fromReview?: boolean}) => {
    if (options?.fromReview) setReturnToReview(true);
    setScreen(next);
    setError(null);
  };

  const rememberDraftUrl = (id: string) => {
    if (typeof window === 'undefined') return;
    const nextPath = window.location.pathname.startsWith('/grants')
      ? `/grants/${id}`
      : `/portal/${id}`;
    if (window.location.pathname !== nextPath) {
      window.history.replaceState(window.history.state, '', nextPath);
    }
  };

  const autosaveDraft = async (snapshot?: Partial<DraftSnapshot>) => {
    const next: DraftSnapshot = {
      benefitScope: snapshot?.benefitScope ?? benefitScope,
      description: snapshot?.description ?? description,
      gradesImpacted: snapshot?.gradesImpacted ?? gradesImpacted,
      items: snapshot?.items ?? items,
      wishlistUrl: snapshot?.wishlistUrl ?? wishlistUrl,
    };
    if (!next.description.trim()) return;

    const seq = ++autosaveSeq.current;
    setAutosaving(true);
    const payloadItems = next.items.filter(isFilledItem);
    const data = new FormData();
    data.set('grant_id', grantId);
    data.set('cycle_id', cycleId);
    data.set('description', next.description);
    data.set('benefit_scope', next.benefitScope);
    data.set(
      'grades_impacted',
      next.benefitScope && gradesImpactedRequired(next.benefitScope) ? next.gradesImpacted : '',
    );
    data.set('wishlist_url', next.wishlistUrl);
    data.set('items', JSON.stringify(payloadItems.map(({clientId: _clientId, ...item}) => item)));

    const result = await saveGrantDraftAction(data);
    if (seq !== autosaveSeq.current) return;

    setAutosaving(false);
    if (result && 'error' in result) {
      setError(result.error);
      return;
    }
    if (result?.grantId) {
      setGrantId(result.grantId);
      rememberDraftUrl(result.grantId);
      setDraftSavedAt(new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}));
      setError(null);
    }
  };

  const afterNarrative = (snapshot?: Partial<DraftSnapshot>) => {
    void autosaveDraft(snapshot);
    if (returnToReview) {
      setReturnToReview(false);
      setScreen('review');
      return;
    }
    setScreen('itemSource');
  };

  const continueFromBenefit = () => {
    if (benefitScope && gradesImpactedRequired(benefitScope)) {
      void autosaveDraft();
      setScreen('grades');
      return;
    }
    afterNarrative();
  };

  const continueFromDescription = () => {
    void autosaveDraft({description});
    if (returnToReview) {
      setReturnToReview(false);
      setScreen('review');
      return;
    }
    setScreen('benefit');
  };

  const updateDraftItem = (patch: Partial<DraftItem>) => {
    setDraftItem((current) => (current ? {...current, ...patch} : current));
  };

  const loadPreview = async (url: string) => {
    const trimmed = url.trim();
    if (!draftItem) return;
    if (!trimmed) {
      updateDraftItem({asin: null, image_url: null, vendor_url: ''});
      return;
    }
    const asin = asinFromUrl(trimmed);
    if (asin) {
      updateDraftItem({asin, image_url: amazonImageUrl(asin), vendor_url: trimmed});
      return;
    }
    updateDraftItem({vendor_url: trimmed});
    const res = await fetch('/api/preview', {
      body: JSON.stringify({url: trimmed}),
      headers: {'content-type': 'application/json'},
      method: 'POST',
    });
    const json = (await res.json()) as {image_url?: string | null};
    setDraftItem((current) =>
      current && (current.vendor_url ?? '').trim() === trimmed
        ? {...current, image_url: json.image_url ?? null}
        : current,
    );
  };

  const startNextProductItem = () => {
    setDraftItem(emptyItem());
    setScreen('itemDetails');
  };

  const applyImported = (importedItems: WishlistItem[], nextUrl?: string | null) => {
    if (nextUrl) setWishlistUrl(nextUrl);
    const imported = importedItems.map((item) => ({...item, clientId: crypto.randomUUID()}));
    setItems((current) => {
      const manual = current.filter(
        (item) => item.source !== 'WISHLIST' && item.item_description.trim(),
      );
      const nextItems = [...imported, ...manual];
      void autosaveDraft({
        items: nextItems,
        wishlistUrl: nextUrl ?? wishlistUrl,
      });
      return nextItems;
    });
    setXlsxFile(null);
    setImportError(null);
    setLastItemLabel(
      imported.length === 1
        ? imported[0]?.item_description.trim() || 'wishlist item'
        : `${imported.length} wishlist items`,
    );
    setScreen('addAnother');
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
        const parsed = parseWishlistXlsx(bytes);
        setImportPercent(100);
        if (!parsed.length) {
          setImportError(
            'That spreadsheet had no items we could read. Use Amazon’s More → Download list, or type the lines by hand.',
          );
          return;
        }
        applyImported(parsed, canImportWishlist(wishlistUrl) ? wishlistUrl : null);
        return;
      }

      setImportIndeterminate(true);
      setImportPercent(10);
      setImportStatus('Fetching your Amazon list. This can take a minute…');
      const res = await fetch('/api/wishlist/import', {
        body: JSON.stringify({url: wishlistUrl}),
        headers: {'content-type': 'application/json'},
        method: 'POST',
      });
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

  const saveDraftItem = () => {
    if (!draftItem || !isFilledItem(draftItem)) return;
    const saved = draftItem;
    const nextItems = [...items, saved];
    setItems(nextItems);
    setLastItemLabel(saved.item_description.trim());
    setDraftItem(null);
    setScreen('addAnother');
    void autosaveDraft({items: nextItems});
  };

  const removeItem = (clientId: string) => {
    const nextItems = items.filter((item) => item.clientId !== clientId);
    setItems(nextItems);
    void autosaveDraft({items: nextItems});
  };

  const submit = async (submitNow: boolean) => {
    setPending(true);
    setError(null);
    const payloadItems = items.filter(isFilledItem);
    const data = new FormData();
    data.set('grant_id', grantId);
    data.set('cycle_id', cycleId);
    data.set('description', description);
    data.set('benefit_scope', benefitScope);
    data.set('grades_impacted', showGrades ? gradesImpacted : '');
    data.set('wishlist_url', wishlistUrl);
    data.set('items', JSON.stringify(payloadItems.map(({clientId: _clientId, ...item}) => item)));
    data.set('submit', submitNow ? '1' : '0');

    if (!submitNow) {
      const result = await saveGrantDraftAction(data);
      setPending(false);
      if (result && 'error' in result) {
        setError(result.error);
        return;
      }
      if (result?.grantId) {
        setGrantId(result.grantId);
        rememberDraftUrl(result.grantId);
        setDraftSavedAt(new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}));
      }
      return;
    }

    const result = await saveGrantAction(data);
    if (result && 'error' in result) {
      setError(result.error);
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <FormProgress currentStep={progressIndex} steps={PROGRESS_STEPS} />

      <div aria-live="polite" className="sr-only" role="status">
        Step {progressIndex + 1} of {PROGRESS_STEPS.length}: {PROGRESS_STEPS[progressIndex]}
      </div>

      {draftSavedAt || autosaving ? (
        <p aria-live="polite" className="font-body mb-4 text-center text-xs text-gray-500">
          {autosaving ? 'Saving draft…' : `Draft saved at ${draftSavedAt}`}
        </p>
      ) : null}

      {screen === 'welcome' ? (
        <WelcomeStep
          applicant={applicant}
          cycleName={cycleName}
          onContinue={() => go('description')}
        />
      ) : null}

      {screen === 'description' ? (
        <DescriptionStep
          description={description}
          onBack={() => go(returnToReview ? 'review' : 'welcome')}
          onChange={setDescription}
          onContinue={continueFromDescription}
        />
      ) : null}

      {screen === 'benefit' ? (
        <BenefitStep
          benefitScope={benefitScope}
          onBack={() => go(returnToReview ? 'review' : 'description')}
          onChange={setBenefitScope}
          onContinue={continueFromBenefit}
        />
      ) : null}

      {screen === 'grades' ? (
        <GradesStep
          gradesImpacted={gradesImpacted}
          onBack={() => go('benefit')}
          onChange={setGradesImpacted}
          onContinue={() => afterNarrative({gradesImpacted})}
        />
      ) : null}

      {screen === 'itemSource' ? (
        <ItemSourceStep
          itemCount={filledCount}
          onBack={() => {
            if (returnToReview) {
              setReturnToReview(false);
              go('review');
              return;
            }
            if (benefitScope && gradesImpactedRequired(benefitScope)) {
              go('grades');
              return;
            }
            go('benefit');
          }}
          onChooseProduct={() => {
            setDraftItem(emptyItem());
            go('itemDetails');
          }}
          onChooseWishlist={() => {
            setImportError(null);
            setXlsxFile(null);
            go('wishlistImport');
          }}
          requestedTotal={summary.total}
        />
      ) : null}

      {screen === 'wishlistImport' ? (
        <WishlistImportStep
          importError={importError}
          importIndeterminate={importIndeterminate}
          importing={importing}
          importPercent={importPercent}
          importStatus={importStatus}
          onBack={() => go('itemSource')}
          onImport={importWishlist}
          onUrlChange={setWishlistUrl}
          onXlsxChange={setXlsxFile}
          wishlistUrl={wishlistUrl}
          xlsxFile={xlsxFile}
        />
      ) : null}

      {screen === 'itemDetails' && draftItem ? (
        <ItemDetailsStep
          item={draftItem}
          onBack={() => {
            setDraftItem(null);
            go('itemSource');
          }}
          onBlurUrl={loadPreview}
          onChange={updateDraftItem}
          onContinue={saveDraftItem}
        />
      ) : null}

      {screen === 'addAnother' ? (
        <AddAnotherStep
          itemCount={filledCount}
          lastItemLabel={lastItemLabel}
          onAddMore={startNextProductItem}
          onDone={() => {
            setReturnToReview(false);
            setLastItemLabel(null);
            void autosaveDraft();
            go('review');
          }}
          onSwitchMethod={() => go('itemSource')}
          requestedTotal={summary.total}
        />
      ) : null}

      {screen === 'review' ? (
        <ReviewStep
          applicantName={applicant.name}
          benefitScope={benefitScope}
          checks={checks}
          cycleName={cycleName}
          description={description}
          error={error}
          gradesImpacted={showGrades ? gradesImpacted : ''}
          items={items}
          onAddItems={() => go('itemSource', {fromReview: true})}
          onEditBenefit={() => go('benefit', {fromReview: true})}
          onEditDescription={() => go('description', {fromReview: true})}
          onRemoveItem={removeItem}
          onSaveDraft={() => submit(false)}
          onSubmit={() => submit(true)}
          pending={pending}
          retailer={retailer}
          summaryTotal={summary.total}
        />
      ) : null}
    </div>
  );
};
