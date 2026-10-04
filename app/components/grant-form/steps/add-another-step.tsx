import {StepShell} from '~/components/grant-form/step-shell';
import {formatUsd} from '~/lib/money';

export const AddAnotherStep = ({
  itemCount,
  lastItemLabel,
  onAddMore,
  onDone,
  onSwitchMethod,
  requestedTotal,
}: {
  itemCount: number;
  lastItemLabel?: string | null;
  onAddMore: () => void;
  onDone: () => void;
  onSwitchMethod?: () => void;
  requestedTotal: number;
}) => (
  <StepShell
    description={
      lastItemLabel
        ? `Saved “${lastItemLabel}”. ${itemCount} ${itemCount === 1 ? 'item' : 'items'} · ${formatUsd(requestedTotal)}.`
        : `${itemCount} ${itemCount === 1 ? 'item' : 'items'} · ${formatUsd(requestedTotal)}.`
    }
    title="Do you have another item?"
  >
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        className="rounded-xl border-2 border-eagle-blue bg-eagle-blue/5 p-5 text-left transition-colors hover:bg-eagle-blue/10"
        onClick={onAddMore}
        type="button"
      >
        <p className="font-heading text-lg font-semibold text-charcoal">Yes</p>
        <p className="font-body mt-1 text-sm text-gray-600">Add the next item now.</p>
      </button>
      <button
        className="rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-colors hover:border-eagle-blue hover:bg-eagle-blue/5"
        onClick={onDone}
        type="button"
      >
        <p className="font-heading text-lg font-semibold text-charcoal">No</p>
        <p className="font-body mt-1 text-sm text-gray-600">Continue to review.</p>
      </button>
    </div>

    {onSwitchMethod ? (
      <button
        className="font-body text-sm font-medium text-eagle-blue underline"
        onClick={onSwitchMethod}
        type="button"
      >
        Or add with a wishlist / different method
      </button>
    ) : null}
  </StepShell>
);
