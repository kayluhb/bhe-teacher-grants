import {afterEach, describe, expect, it, vi} from 'vitest';
import {fetchAmazonWishlist, wishlistImportFailure} from '~/lib/wishlist-amazon';

const LIST_URL = 'https://www.amazon.com/hz/wishlist/ls/1JMCNHNT959X2';

const itemHtml = `
  <div data-itemid="1" data-item-name="Dry erase markers" data-price="8.99" data-requested-qty="2" data-asin="B000MARKER">
    <a href="https://www.amazon.com/dp/B000MARKER">markers</a>
  </div>
`;

const blockedShellHtml = `
  <html><body><h1>Something went wrong</h1><p>Please enable cookies</p></body></html>
`;

const amazonResponse = (
  html: string,
  init?: {cookies?: string[]; url?: string; status?: number},
) => {
  const headers = new Headers({'content-type': 'text/html'});
  for (const cookie of init?.cookies ?? []) {
    headers.append('set-cookie', cookie);
  }
  const response = new Response(html, {headers, status: init?.status ?? 200});
  Object.defineProperty(response, 'url', {
    value: init?.url ?? LIST_URL,
  });
  return response;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchAmazonWishlist', () => {
  it('parses items from a public list page', async () => {
    const fetchFn = vi.fn(async () => amazonResponse(itemHtml));
    vi.stubGlobal('fetch', fetchFn);

    await expect(fetchAmazonWishlist(LIST_URL)).resolves.toMatchObject({
      items: [
        {
          asin: 'B000MARKER',
          item_description: 'Dry erase markers',
          quantity: 2,
          unit_price: 8.99,
        },
      ],
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('returns blocked when Amazon serves HTML without list item markers', async () => {
    const fetchFn = vi.fn(async () =>
      amazonResponse(blockedShellHtml, {cookies: ['session-id=abc']}),
    );
    vi.stubGlobal('fetch', fetchFn);

    await expect(fetchAmazonWishlist(LIST_URL)).resolves.toEqual({blocked: true, items: []});
    // Initial fetch + cookie/consent retry
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({Cookie: expect.stringContaining('session-id=abc')}),
    });
  });

  it('retries once with cookies when the first page has no item markers', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(amazonResponse(blockedShellHtml, {cookies: ['session-id=abc']}))
      .mockResolvedValueOnce(amazonResponse(itemHtml, {cookies: ['session-id=abc']}));
    vi.stubGlobal('fetch', fetchFn);

    const result = await fetchAmazonWishlist(LIST_URL);
    expect(result.items).toHaveLength(1);
    expect(result).not.toHaveProperty('blocked');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('returns unreachable when the first page fetch fails', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('timeout');
    });
    vi.stubGlobal('fetch', fetchFn);

    await expect(fetchAmazonWishlist(LIST_URL)).resolves.toEqual({
      items: [],
      unreachable: true,
    });
  });

  it('returns unreachable when a redirect leaves Amazon', async () => {
    const fetchFn = vi.fn(async () =>
      amazonResponse(itemHtml, {url: 'https://evil.example/phish'}),
    );
    vi.stubGlobal('fetch', fetchFn);

    await expect(fetchAmazonWishlist(LIST_URL)).resolves.toEqual({
      items: [],
      unreachable: true,
    });
  });
});

describe('wishlistImportFailure', () => {
  it('maps a blocked fetch to the import 422 payload', () => {
    expect(wishlistImportFailure({blocked: true, items: []})).toEqual({
      error:
        'Amazon blocked the automatic import from this environment. On Amazon choose More → Download list and upload the .xlsx, or try again from production.',
      status: 422,
    });
  });

  it('maps an unreachable fetch to the import 422 payload', () => {
    expect(wishlistImportFailure({items: [], unreachable: true})).toEqual({
      error:
        'Amazon did not return that list. Confirm it is Public, upload the Download list .xlsx, or type the items by hand.',
      status: 422,
    });
  });

  it('maps an empty successful fetch to the no-items 422 payload', () => {
    expect(wishlistImportFailure({items: []})).toEqual({
      error:
        'No items found on that page. On Amazon choose More → Download list and upload the .xlsx, or type the lines instead.',
      status: 422,
    });
  });

  it('returns null when items were imported', () => {
    expect(
      wishlistImportFailure({
        items: [
          {
            item_description: 'Markers',
            quantity: 1,
            source: 'WISHLIST',
            unit_price: 1,
          },
        ],
      }),
    ).toBeNull();
  });
});
