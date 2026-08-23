import {describe, expect, it} from 'vitest';
import {
  canImportWishlist,
  normalizeWishlistUrl,
  parseWishlistHtml,
  wishlistRetailerLabel,
} from '~/lib/wishlist';

describe('normalizeWishlistUrl', () => {
  it('accepts a public Amazon list URL', () => {
    expect(normalizeWishlistUrl('https://www.amazon.com/hz/wishlist/ls/1JMCNHNT959X2?ref=wl')).toBe(
      'https://www.amazon.com/hz/wishlist/ls/1JMCNHNT959X2',
    );
  });

  it('accepts a public Walmart list URL', () => {
    expect(
      normalizeWishlistUrl(
        'https://www.walmart.com/lists/shared/WL/b8a98d0c-8a40-4805-a180-c785512f9f29?ref=share',
      ),
    ).toBe('https://www.walmart.com/lists/shared/WL/b8a98d0c-8a40-4805-a180-c785512f9f29');
  });

  it('accepts a public Target registry URL', () => {
    expect(
      normalizeWishlistUrl(
        'https://www.target.com/gift-registry/giftgiver?registryId=abc-123&type=WISHLIST',
      ),
    ).toBe('https://www.target.com/gift-registry/giftgiver?registryId=abc-123&type=WISHLIST');
  });

  it('rejects product pages and other vendors', () => {
    expect(normalizeWishlistUrl('https://www.walmart.com/ip/Crayola-Markers/12345')).toBeNull();
    expect(normalizeWishlistUrl('https://www.target.com/p/crayola-markers/-/A-123')).toBeNull();
    expect(normalizeWishlistUrl('https://example.com/hz/wishlist/ls/ABC')).toBeNull();
  });
});

describe('wishlistRetailerLabel', () => {
  it('names the tax-exempt retailer for stored list URLs', () => {
    expect(wishlistRetailerLabel('https://www.amazon.com/hz/wishlist/ls/1JMCNHNT959X2')).toBe(
      'Amazon',
    );
    expect(
      wishlistRetailerLabel(
        'https://www.walmart.com/lists/shared/WL/b8a98d0c-8a40-4805-a180-c785512f9f29',
      ),
    ).toBe('Walmart');
    expect(
      wishlistRetailerLabel(
        'https://www.target.com/gift-registry/giftgiver?registryId=abc-123&type=WISHLIST',
      ),
    ).toBe('Target');
  });
});

describe('canImportWishlist', () => {
  it('allows import only for Amazon lists', () => {
    expect(canImportWishlist('https://www.amazon.com/hz/wishlist/ls/1JMCNHNT959X2')).toBe(true);
    expect(
      canImportWishlist(
        'https://www.walmart.com/lists/shared/WL/b8a98d0c-8a40-4805-a180-c785512f9f29',
      ),
    ).toBe(false);
    expect(
      canImportWishlist(
        'https://www.target.com/gift-registry/giftgiver?registryId=abc-123&type=WISHLIST',
      ),
    ).toBe(false);
  });
});

describe('parseWishlistHtml', () => {
  it('reads fixture list items', () => {
    const html = `
      <div data-itemid="1" data-item-name="Dry erase markers" data-price="8.99" data-requested-qty="2" data-asin="B000MARKERS">
        <a href="https://www.amazon.com/dp/B000MARKERS">markers</a>
      </div>
      <div data-itemid="2" data-item-name="Chart paper" data-price="12.00">
        <a href="https://www.amazon.com/dp/B000CHARTS">paper</a>
      </div>
    `;
    const items = parseWishlistHtml(html);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      item_description: 'Dry erase markers',
      quantity: 2,
      source: 'WISHLIST',
      unit_price: 8.99,
    });
  });
});
