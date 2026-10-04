import {StepShell} from '~/components/grant-form/step-shell';
import {formatUsd} from '~/lib/money';

export const AddAnotherStep = ({
  itemCount,
  lastItemLabel,
  onAddMore,
  onDone,
  requestedTotal,
}: {
  itemCount: number;
  lastItemLabel?: string | null;
  onAddMore: () => void;
  onDone: () => void;
  requestedTotal: number;
}) => (
  <StepShell
    description={
      lastItemLabel
        ? `Saved “${lastItemLabel}”. ${itemCount} ${itemCount === 1 ? 'item' : 'items'} · ${formatUsd(requestedTotal)}.`
        : `${itemCount} ${itemCount === 1 ? 'item' : 'items'} · ${formatUsd(requestedTotal)}.`
    }
    title="Do you want to add another item?"
  >
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        className="rounded-xl border-2 border-eagle-blue bg-eagle-blue/5 p-5 text-left transition-colors hover:bg-eagle-blue/10"
        onClick={onAddMore}
        type="button"
      >
        <p className="font-heading text-lg font-semibold text-charcoal">Yes</p>
        <p className="font-body mt-1 text-sm text-gray-600">
          Choose a wishlist or product URL next.
        </p>
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
  </StepShell>
);
