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

const ITEM_MARKER_PATTERN = /data-itemid="/i;

const hasItemMarkers = (html: string): boolean => ITEM_MARKER_PATTERN.test(html);

const isAmazonHost = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'amazon.com' || host.endsWith('.amazon.com');
  } catch {
    return false;
  }
};

const cookieJar = (response: Response, previous = ''): string => {
  const jar = new Map(
    previous
      .split('; ')
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf('=');
        return [part.slice(0, separatorIndex), part.slice(separatorIndex + 1)] as const;
      }),
  );
  const headers =
    typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  for (const header of headers) {
    const pair = header.split(';', 1)[0] ?? '';
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex > 0) {
      jar.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
    }
  }
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
};

const fetchAmazonPage = async (pageUrl: string, cookie: string): Promise<Response | null> => {
  if (!isAmazonHost(pageUrl)) return null;
  const response = await fetch(pageUrl, {
    headers: cookie ? {...AMAZON_HEADERS, Cookie: cookie} : AMAZON_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });
  // Reject open-redirect / hostile hops off Amazon before reading the body.
  if (!isAmazonHost(response.url || pageUrl)) return null;
  return response;
};

const itemKey = (item: WishlistItem): string =>
  item.asin ?? item.vendor_url ?? item.item_description;

export type AmazonWishlistFetch = {
  blocked?: boolean;
  items: WishlistItem[];
  unreachable?: boolean;
};

/** Maps a wishlist fetch outcome to the import route’s JSON error, if any. */
export const wishlistImportFailure = (
  fetched: AmazonWishlistFetch,
): {error: string; status: number} | null => {
  if (fetched.unreachable) {
    return {
      error:
        'Amazon did not return that list. Confirm it is Public, upload the Download list .xlsx, or type the items by hand.',
      status: 422,
    };
  }
  if (fetched.blocked) {
    return {
      error:
        'Amazon blocked the automatic import from this environment. On Amazon choose More → Download list and upload the .xlsx, or try again from production.',
      status: 422,
    };
  }
  if (fetched.items.length === 0) {
    return {
      error:
        'No items found on that page. On Amazon choose More → Download list and upload the .xlsx, or type the lines instead.',
      status: 422,
    };
  }
  return null;
};

export const fetchAmazonWishlist = async (firstUrl: string): Promise<AmazonWishlistFetch> => {
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
    let response: Response | null;
    try {
      response = await fetchAmazonPage(pageUrl, cookie);
    } catch {
      if (page === 0) return {items: [], unreachable: true};
      break;
    }
    if (!response?.ok) {
      if (page === 0) return {items: [], unreachable: true};
      break;
    }
    cookie = cookieJar(response, cookie);
    let html = await response.text();
    // Amazon sometimes serves a cookie/consent shell first; retry once with the jar.
    if (page === 0 && cookie && !hasItemMarkers(html)) {
      try {
        const retry = await fetchAmazonPage(pageUrl, cookie);
        if (retry?.ok) {
          cookie = cookieJar(retry, cookie);
          html = await retry.text();
        }
      } catch {
        // keep the first response
      }
    }
    sawHtml = true;
    if (hasItemMarkers(html)) sawItemMarkers = true;
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
