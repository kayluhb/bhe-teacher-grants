import {describe, expect, it, vi} from 'vitest';
import {
  amazonImageUrl,
  fetchProductImage,
  isSafePreviewUrl,
  itemImageUrl,
  parseProductImage,
  stackPreviewImages,
} from '~/lib/product-preview';

describe('parseProductImage', () => {
  it('reads og:image', () => {
    expect(
      parseProductImage(
        '<meta property="og:image" content="https://cdn.example.com/markers.jpg">',
        'https://shop.example.com/p/1',
      ),
    ).toBe('https://cdn.example.com/markers.jpg');
  });

  it('falls back to twitter:image when og:image is missing', () => {
    expect(
      parseProductImage(
        '<meta name="twitter:image" content="https://cdn.example.com/twitter.jpg">',
        'https://shop.example.com/p/1',
      ),
    ).toBe('https://cdn.example.com/twitter.jpg');
  });

  it('reads JSON-LD Product.image', () => {
    expect(
      parseProductImage(
        `<script type="application/ld+json">${JSON.stringify({
          '@type': 'Product',
          image: 'https://cdn.example.com/jsonld.jpg',
          name: 'Markers',
        })}</script>`,
        'https://shop.example.com/p/1',
      ),
    ).toBe('https://cdn.example.com/jsonld.jpg');
  });

  it('reads the first JSON-LD Product.image when it is an array', () => {
    expect(
      parseProductImage(
        `<script type="application/ld+json">${JSON.stringify({
          '@type': 'Product',
          image: ['https://cdn.example.com/one.jpg', 'https://cdn.example.com/two.jpg'],
        })}</script>`,
        'https://shop.example.com/p/1',
      ),
    ).toBe('https://cdn.example.com/one.jpg');
  });

  it('resolves a relative og:image against the page URL', () => {
    expect(
      parseProductImage(
        '<meta property="og:image" content="/images/kit.png">',
        'https://shop.example.com/p/1',
      ),
    ).toBe('https://shop.example.com/images/kit.png');
  });

  it('returns null when there is no product image', () => {
    expect(parseProductImage('<html><title>Nope</title></html>', 'https://shop.example.com')).toBeNull();
  });
});

describe('amazonImageUrl', () => {
  it('builds the Amazon product image CDN URL from an ASIN', () => {
    expect(amazonImageUrl('B000MARKERS')).toBe(
      'https://images-na.ssl-images-amazon.com/images/P/B000MARKERS.01._SCLZZZZZZZ_.jpg',
    );
  });
});

describe('isSafePreviewUrl', () => {
  it('allows public https product pages', () => {
    expect(isSafePreviewUrl('https://www.amazon.com/dp/B000MARKERS')).toBe(true);
    expect(isSafePreviewUrl('https://www.walmart.com/ip/Crayola/123')).toBe(true);
  });

  it('rejects localhost, private IPs, and non-https URLs', () => {
    expect(isSafePreviewUrl('http://example.com/p/1')).toBe(false);
    expect(isSafePreviewUrl('https://localhost/p/1')).toBe(false);
    expect(isSafePreviewUrl('https://127.0.0.1/p/1')).toBe(false);
    expect(isSafePreviewUrl('https://192.168.1.9/p/1')).toBe(false);
    expect(isSafePreviewUrl('https://10.0.0.4/p/1')).toBe(false);
    expect(isSafePreviewUrl('https://169.254.169.254/latest')).toBe(false);
  });
});

describe('itemImageUrl', () => {
  it('prefers a stored image URL', () => {
    expect(
      itemImageUrl({asin: 'B000MARKERS', image_url: 'https://cdn.example.com/stored.jpg'}),
    ).toBe('https://cdn.example.com/stored.jpg');
  });

  it('falls back to the Amazon CDN when only an ASIN is stored', () => {
    expect(itemImageUrl({asin: 'B000MARKERS', image_url: null})).toBe(
      'https://images-na.ssl-images-amazon.com/images/P/B000MARKERS.01._SCLZZZZZZZ_.jpg',
    );
  });
});

describe('stackPreviewImages', () => {
  it('keeps up to three displayable images per grant in item order', () => {
    expect(
      stackPreviewImages([
        {asin: 'B000AAAAAA', grant_id: 'g1', image_url: null},
        {asin: null, grant_id: 'g1', image_url: 'https://cdn.example.com/two.jpg'},
        {asin: null, grant_id: 'g1', image_url: null},
        {asin: 'B000CCCCCC', grant_id: 'g1', image_url: null},
        {asin: 'B000DDDDDD', grant_id: 'g1', image_url: null},
        {asin: 'B000EEEEE', grant_id: 'g2', image_url: null},
      ]),
    ).toEqual({
      g1: [
        'https://images-na.ssl-images-amazon.com/images/P/B000AAAAAA.01._SCLZZZZZZZ_.jpg',
        'https://cdn.example.com/two.jpg',
        'https://images-na.ssl-images-amazon.com/images/P/B000CCCCCC.01._SCLZZZZZZZ_.jpg',
      ],
      g2: ['https://images-na.ssl-images-amazon.com/images/P/B000EEEEE.01._SCLZZZZZZZ_.jpg'],
    });
  });
});

describe('fetchProductImage', () => {
  it('returns the Amazon CDN URL without fetching when an ASIN is present', async () => {
    const fetchFn = vi.fn();
    await expect(
      fetchProductImage(
        {asin: 'B000MARKERS', vendorUrl: 'https://www.amazon.com/dp/B000MARKERS'},
        fetchFn,
      ),
    ).resolves.toBe(
      'https://images-na.ssl-images-amazon.com/images/P/B000MARKERS.01._SCLZZZZZZZ_.jpg',
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('extracts an ASIN from an Amazon product URL instead of fetching', async () => {
    const fetchFn = vi.fn();
    await expect(
      fetchProductImage({asin: null, vendorUrl: 'https://www.amazon.com/dp/B07GSZM4YM/?ref=wl'}, fetchFn),
    ).resolves.toBe(
      'https://images-na.ssl-images-amazon.com/images/P/B07GSZM4YM.01._SCLZZZZZZZ_.jpg',
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('does not fetch private hosts', async () => {
    const fetchFn = vi.fn();
    await expect(
      fetchProductImage({asin: null, vendorUrl: 'https://127.0.0.1/p/1'}, fetchFn),
    ).resolves.toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('parses og:image from a fetched public product page', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response('<meta property="og:image" content="https://cdn.example.com/kit.jpg">', {
          headers: {'content-type': 'text/html'},
          status: 200,
        }),
    );
    await expect(
      fetchProductImage({asin: null, vendorUrl: 'https://shop.example.com/p/kit'}, fetchFn),
    ).resolves.toBe('https://cdn.example.com/kit.jpg');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('returns null when the product page fetch fails', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('timeout');
    });
    await expect(
      fetchProductImage({asin: null, vendorUrl: 'https://shop.example.com/p/kit'}, fetchFn),
    ).resolves.toBeNull();
  });
});
