import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {ProductPurchaseLink} from '~/components/product-purchase-link';

describe('ProductPurchaseLink', () => {
  it('links a product to its vendor page so it can be purchased', () => {
    const html = renderToStaticMarkup(
      createElement(
        ProductPurchaseLink,
        {item: {asin: null, vendor_url: 'https://www.amazon.com/dp/B000MARKERS'}},
        'Markers',
      ),
    );

    expect(html).toContain('href="https://www.amazon.com/dp/B000MARKERS"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('>Markers<');
  });

  it('uses the Amazon product page when only an ASIN is stored', () => {
    const html = renderToStaticMarkup(
      createElement(
        ProductPurchaseLink,
        {item: {asin: 'B000MARKERS', vendor_url: null}},
        'Markers',
      ),
    );

    expect(html).toContain('href="https://www.amazon.com/dp/B000MARKERS"');
  });

  it('renders plain text when there is no product page', () => {
    const html = renderToStaticMarkup(
      createElement(ProductPurchaseLink, {item: {asin: null, vendor_url: null}}, 'Markers'),
    );

    expect(html).not.toContain('<a');
    expect(html).toContain('Markers');
  });
});
