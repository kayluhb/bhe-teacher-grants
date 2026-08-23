import {ProductThumb} from '~/components/product-thumb';
import {formatUsd} from '~/lib/money';
import {itemImageUrl, itemVendorUrl} from '~/lib/product-preview';
import type {GrantItemRow} from '~/lib/types';

const RequestedItem = ({item}: {item: GrantItemRow}) => {
  const href = itemVendorUrl(item);
  const label = (
    <>
      <ProductThumb alt="" url={itemImageUrl(item)} />
      <span>
        {item.item_description}
        <span className="ml-2 text-gray-500">× {item.quantity}</span>
      </span>
    </>
  );

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      {href ? (
        <a
          className="flex min-w-0 items-center gap-3 text-eagle-blue underline"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {label}
        </a>
      ) : (
        <span className="flex min-w-0 items-center gap-3">{label}</span>
      )}
      <span className="tabular-nums">{formatUsd(item.total_price)}</span>
    </li>
  );
};

export const GrantRequestedItems = ({items}: {items: GrantItemRow[]}) => (
  <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
    {items.map((item) => (
      <RequestedItem item={item} key={item.id} />
    ))}
  </ul>
);
