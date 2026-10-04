import {StepNav, StepShell} from '~/components/grant-form/step-shell';
import {formatUsd} from '~/lib/money';

export const ItemSourceStep = ({
  itemCount,
  onBack,
  onChooseProduct,
  onChooseWishlist,
  requestedTotal,
}: {
  itemCount: number;
  onBack: () => void;
  onChooseProduct: () => void;
  onChooseWishlist: () => void;
  requestedTotal: number;
}) => (
  <StepShell
    description="Prefer a public Amazon, Walmart, or Target list — the PTA is tax-exempt at all three. Amazon lists can be imported; other store links can be added one item at a time."
    title={itemCount > 0 ? 'How do you want to add the next item?' : 'How are you adding items?'}
  >
    {itemCount > 0 ? (
      <p className="font-body rounded-lg bg-warm-white px-3 py-2 text-sm text-charcoal">
        {itemCount} {itemCount === 1 ? 'item' : 'items'} so far · {formatUsd(requestedTotal)}
      </p>
    ) : null}

    <div className="grid gap-3 sm:grid-cols-2">
      <button
        className="rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-colors hover:border-eagle-blue hover:bg-eagle-blue/5"
        onClick={onChooseWishlist}
        type="button"
      >
        <p className="font-heading text-base font-semibold text-charcoal">Amazon wishlist</p>
        <p className="font-body mt-1 text-sm text-gray-600">
          Import a public Amazon list by URL or spreadsheet.
        </p>
      </button>
      <button
        className="rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-colors hover:border-eagle-blue hover:bg-eagle-blue/5"
        onClick={onChooseProduct}
        type="button"
      >
        <p className="font-heading text-base font-semibold text-charcoal">Product / store URL</p>
        <p className="font-body mt-1 text-sm text-gray-600">
          Add one item from a product link, or describe it by hand.
        </p>
      </button>
    </div>

    <StepNav onBack={onBack} />
  </StepShell>
);
