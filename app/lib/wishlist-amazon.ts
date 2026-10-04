import {
  MAX_WISHLIST_ITEMS,
  MAX_WISHLIST_PAGES,
  nextWishlistPageUrl,
  parseWishlistHtml,
  type WishlistItem,
} from '~/lib/wishlist';

const AMAZON_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

const cookieJar = (response: Response, previous = ''): string => {
  const jar = new Map(
    previous
      .split('; ')
      .filter(Boolean)
      .map((part) => {
        const i = part.indexOf('=');
        return [part.slice(0, i), part.slice(i + 1)] as const;
      }),
  );
  const headers =
    typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  for (const header of headers) {
    const pair = header.split(';', 1)[0] ?? '';
    const i = pair.indexOf('=');
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
};

const itemKey = (item: WishlistItem): string =>
  item.asin ?? item.vendor_url ?? item.item_description;

export const fetchAmazonWishlist = async (
  firstUrl: string,
): Promise<{blocked?: boolean; items: WishlistItem[]; unreachable?: boolean}> => {
  const items: WishlistItem[] = [];
  const seen = new Set<string>();
  let pageUrl: string | null = firstUrl;
  let cookie = '';
  let sawHtml = false;
  let sawItemMarkers = false;

  for (
    let page = 0;
    page < MAX_WISHLIST_PAGES && pageUrl && items.length < MAX_WISHLIST_ITEMS;
    page++
  ) {
    let response: Response;
    try {
      response = await fetch(pageUrl, {
        headers: cookie ? {...AMAZON_HEADERS, Cookie: cookie} : AMAZON_HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      if (page === 0) return {items: [], unreachable: true};
      break;
    }
    if (!response.ok) {
      if (page === 0) return {items: [], unreachable: true};
      break;
    }
    cookie = cookieJar(response, cookie);
    let html = await response.text();
    // Amazon sometimes serves a cookie/consent shell first; retry once with the jar.
    if (page === 0 && cookie && !/data-itemid="/i.test(html)) {
      try {
        const retry = await fetch(pageUrl, {
          headers: {...AMAZON_HEADERS, Cookie: cookie},
          redirect: 'follow',
          signal: AbortSignal.timeout(15_000),
        });
        if (retry.ok) {
          cookie = cookieJar(retry, cookie);
          html = await retry.text();
        }
      } catch {
        // keep the first response
      }
    }
    sawHtml = true;
    if (/data-itemid="/i.test(html)) sawItemMarkers = true;
    for (const item of parseWishlistHtml(html)) {
      const key = itemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      if (items.length >= MAX_WISHLIST_ITEMS) break;
    }
    pageUrl = nextWishlistPageUrl(html);
  }

  if (items.length === 0 && sawHtml && !sawItemMarkers) {
    return {blocked: true, items: []};
  }

  return {items};
};
