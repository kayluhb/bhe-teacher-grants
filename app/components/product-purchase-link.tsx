import type {ReactNode} from 'react';
import {itemVendorUrl} from '~/lib/product-preview';

export const ProductPurchaseLink = ({
  children,
  className = '',
  item,
}: {
  children: ReactNode;
  className?: string;
  item: {asin?: string | null; vendor_url?: string | null};
}) => {
  const href = itemVendorUrl(item);
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a
      className={`${className} text-eagle-blue underline`.trim()}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
};
