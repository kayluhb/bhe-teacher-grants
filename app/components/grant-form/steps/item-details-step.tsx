import {StepNav, StepShell} from '~/components/grant-form/step-shell';
import {type DraftItem, inputClass, isFilledItem} from '~/components/grant-form/types';
import {ProductThumb} from '~/components/product-thumb';
import {itemImageUrl} from '~/lib/product-preview';

export const ItemDetailsStep = ({
  item,
  onBack,
  onBlurUrl,
  onChange,
  onContinue,
}: {
  item: DraftItem;
  onBack: () => void;
  onBlurUrl: (url: string) => void;
  onChange: (patch: Partial<DraftItem>) => void;
  onContinue: () => void;
}) => (
  <StepShell
    description="Paste a product link if you have one, then confirm the description, quantity, and price."
    title="Tell us about this item"
  >
    <div className="flex gap-3">
      <ProductThumb
        alt=""
        className="mt-6 h-16 w-16 shrink-0 rounded-lg bg-warm-white object-cover"
        url={itemImageUrl(item)}
      />
      <div className="min-w-0 flex-1 space-y-3">
        <label className="font-body block text-sm font-medium text-charcoal">
          Product / store URL
          <input
            className={inputClass}
            onBlur={(event) => onBlurUrl(event.target.value)}
            onChange={(event) => onChange({vendor_url: event.target.value})}
            placeholder="https://"
            value={item.vendor_url ?? ''}
          />
        </label>
        <label className="font-body block text-sm font-medium text-charcoal">
          Item description
          <input
            className={inputClass}
            onChange={(event) => onChange({item_description: event.target.value})}
            required
            value={item.item_description}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="font-body block text-sm font-medium text-charcoal">
            Quantity
            <input
              className={inputClass}
              min={1}
              onChange={(event) => onChange({quantity: Number(event.target.value)})}
              type="number"
              value={item.quantity}
            />
          </label>
          <label className="font-body block text-sm font-medium text-charcoal">
            Unit price
            <input
              className={inputClass}
              min={0}
              onChange={(event) => onChange({unit_price: Number(event.target.value)})}
              step="0.01"
              type="number"
              value={item.unit_price}
            />
          </label>
        </div>
      </div>
    </div>

    <StepNav
      continueDisabled={!isFilledItem(item)}
      continueLabel="Save item"
      onBack={onBack}
      onContinue={onContinue}
    />
  </StepShell>
);
