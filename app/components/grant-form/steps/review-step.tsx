import {StepShell} from '~/components/grant-form/step-shell';
import {type DraftItem, isFilledItem} from '~/components/grant-form/types';
import {ProductThumb} from '~/components/product-thumb';
import {
  BENEFIT_SCOPE_LABELS,
  type BenefitScope,
  type GrantFormCheck,
  gradesImpactedRequired,
} from '~/lib/grant-application';
import {formatUsd} from '~/lib/money';
import {itemImageUrl} from '~/lib/product-preview';

const pluralizeItems = (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`;

const SectionHeader = ({
  actionLabel,
  onAction,
  title,
}: {
  actionLabel: string;
  onAction: () => void;
  title: string;
}) => (
  <div className="flex items-center justify-between gap-3">
    <h3 className="font-heading text-sm font-semibold tracking-wide text-gray-500 uppercase">
      {title}
    </h3>
    <button
      className="font-body text-sm font-medium text-eagle-blue underline"
      onClick={onAction}
      type="button"
    >
      {actionLabel}
    </button>
  </div>
);

export const ReviewStep = ({
  applicantName,
  benefitScope,
  checks,
  cycleName,
  description,
  error,
  gradesImpacted,
  items,
  onAddItems,
  onEditBenefit,
  onEditDescription,
  onRemoveItem,
  onSaveDraft,
  onSubmit,
  pending,
  retailer,
  summaryTotal,
}: {
  applicantName: string;
  benefitScope: BenefitScope | '';
  checks: GrantFormCheck[];
  cycleName?: string;
  description: string;
  error: string | null;
  gradesImpacted: string;
  items: DraftItem[];
  onAddItems: () => void;
  onEditBenefit: () => void;
  onEditDescription: () => void;
  onRemoveItem: (clientId: string) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  pending: boolean;
  retailer: string | null;
  summaryTotal: number;
}) => {
  const filledItems = items.filter(isFilledItem);
  const remaining = checks.filter((check) => !check.done).length;
  const benefitLabel = benefitScope ? BENEFIT_SCOPE_LABELS[benefitScope] : null;
  const showGrades = Boolean(benefitScope && gradesImpactedRequired(benefitScope));

  return (
    <StepShell
      description="Double-check everything below, then save a draft or submit."
      title="Review your grant request"
    >
      <div className="overflow-hidden rounded-xl border border-eagle-blue/15">
        <div className="bg-gradient-to-br from-eagle-blue to-night-blue px-4 py-4 text-white">
          <p className="font-body text-[11px] font-semibold tracking-[0.18em] text-warm-white uppercase">
            Requested total
          </p>
          <p className="font-heading mt-1 text-3xl font-bold tabular-nums">
            {formatUsd(summaryTotal)}
          </p>
          <p className="font-body mt-2 text-sm text-white/90">
            {filledItems.length === 0 ? 'No items yet' : pluralizeItems(filledItems.length)}
          </p>
          {cycleName ? <p className="font-body mt-1 text-xs text-white/80">{cycleName}</p> : null}
        </div>
        <div className="space-y-1 bg-white px-4 py-3">
          <p className="font-body text-sm text-charcoal">
            <span className="text-gray-500">Applicant:</span> {applicantName}
          </p>
          <ul className="mt-2 space-y-1">
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
                  <span className="sr-only">{check.done ? ', complete' : ', incomplete'}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="font-body text-xs text-gray-500">
            {remaining === 0
              ? 'Ready to submit.'
              : `${pluralizeItems(remaining)} left before submit.`}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <SectionHeader actionLabel="Edit request" onAction={onEditDescription} title="Request" />
        <p className="font-body whitespace-pre-wrap text-sm text-charcoal">
          {description.trim() || 'No description yet.'}
        </p>
      </section>

      <section className="space-y-2">
        <SectionHeader
          actionLabel="Edit who it benefits"
          onAction={onEditBenefit}
          title="Who it benefits"
        />
        <p className="font-body text-sm text-charcoal">{benefitLabel ?? 'Not selected yet'}</p>
        {showGrades && gradesImpacted.trim() ? (
          <p className="font-body text-sm text-gray-600">Grades: {gradesImpacted.trim()}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <SectionHeader
          actionLabel={filledItems.length ? 'Add or change items' : 'Add items'}
          onAction={onAddItems}
          title="Items"
        />
        {retailer ? (
          <p className="font-body text-xs text-gray-500">{retailer} wishlist attached</p>
        ) : null}
        {filledItems.length === 0 ? (
          <p className="font-body text-sm text-gray-600">No items yet.</p>
        ) : (
          <ul className="space-y-2">
            {filledItems.map((item) => (
              <li
                className="flex gap-3 rounded-xl border border-gray-200 bg-warm-white/60 p-3"
                key={item.clientId}
              >
                <ProductThumb
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg bg-white object-cover"
                  url={itemImageUrl(item)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-body truncate text-sm font-medium text-charcoal">
                    {item.item_description}
                  </p>
                  <p className="font-body text-xs text-gray-500">
                    × {item.quantity} · {formatUsd(item.unit_price)} each
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="font-body text-sm tabular-nums text-charcoal">
                    {formatUsd(item.quantity * item.unit_price)}
                  </span>
                  <button
                    aria-label={`Remove ${item.item_description}`}
                    className="font-body text-xs font-medium text-red-700 underline"
                    onClick={() => onRemoveItem(item.clientId)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          className="btn btn-secondary"
          disabled={pending}
          onClick={onSaveDraft}
          type="button"
        >
          Save draft
        </button>
        <button className="btn btn-primary" disabled={pending} onClick={onSubmit} type="button">
          Submit grant
        </button>
      </div>
    </StepShell>
  );
};
