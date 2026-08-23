const AMAZON_LIST_ID = /\/(?:hz\/wishlist\/ls|gp\/registry\/wishlist|registries)\/([A-Za-z0-9]+)/i;
const WALMART_LIST_PATH = /^\/(?:lists|registry)\//i;
const TARGET_LIST_PATH = /^\/(?:gift-registry|lists)(?:\/|$)/i;
const ASIN = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i;

type WishlistRetailer = 'amazon' | 'walmart' | 'target';

export type WishlistItem = {
  asin: string | null;
  item_description: string;
  quantity: number;
  source: 'WISHLIST';
  unit_price: number;
  vendor_url: string | null;
};

const hostOf = (url: URL): string => url.hostname.replace(/^www\./, '').toLowerCase();

const retailerFromHost = (host: string): WishlistRetailer | null => {
  if (host === 'amazon.com' || host === 'smile.amazon.com') return 'amazon';
  if (host === 'walmart.com') return 'walmart';
  if (host === 'target.com') return 'target';
  return null;
};

const isListPath = (retailer: WishlistRetailer, url: URL): boolean => {
  if (retailer === 'amazon') return AMAZON_LIST_ID.test(url.pathname);
  if (retailer === 'walmart') return WALMART_LIST_PATH.test(url.pathname);
  return TARGET_LIST_PATH.test(url.pathname);
};

const searchWithoutTracking = (url: URL): string => {
  const params = new URLSearchParams(url.search);
  let changed = false;
  for (const key of [...params.keys()]) {
    if (/^(ref|gclid|fbclid|icid)/i.test(key) || key.toLowerCase().startsWith('utm_')) {
      params.delete(key);
      changed = true;
    }
  }
  if (!changed) return url.search;
  const next = params.toString();
  return next ? `?${next}` : '';
};

export const normalizeWishlistUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = hostOf(parsed);
  const retailer = retailerFromHost(host);
  if (!retailer || !isListPath(retailer, parsed)) return null;

  if (retailer === 'amazon') {
    const match = parsed.pathname.match(AMAZON_LIST_ID);
    if (!match?.[1]) return null;
    return `https://www.amazon.com/hz/wishlist/ls/${match[1]}`;
  }

  return `https://www.${host}${parsed.pathname}${searchWithoutTracking(parsed)}`;
};

export const wishlistRetailer = (raw: string): WishlistRetailer | null => {
  const url = normalizeWishlistUrl(raw);
  if (!url) return null;
  return retailerFromHost(hostOf(new URL(url)));
};

export const wishlistRetailerLabel = (raw: string): string | null => {
  const retailer = wishlistRetailer(raw);
  if (retailer === 'amazon') return 'Amazon';
  if (retailer === 'walmart') return 'Walmart';
  if (retailer === 'target') return 'Target';
  return null;
};

export const canImportWishlist = (url: string): boolean => wishlistRetailer(url) === 'amazon';

export const parseWishlistHtml = (html: string): WishlistItem[] => {
  const items: WishlistItem[] = [];
  const blocks = html.split(/data-itemid="/i).slice(1);

  for (const block of blocks) {
    const title =
      block.match(/data-item-name="([^"]+)"/i)?.[1] ??
      block.match(/<h[2-3][^>]*>([^<]+)<\/h[2-3]>/i)?.[1];
    if (!title) continue;

    const priceRaw =
      block.match(/data-price="([0-9.]+)"/i)?.[1] ?? block.match(/\$([0-9]+(?:\.[0-9]{2})?)/)?.[1];
    const qtyRaw = block.match(/data-requested-qty="(\d+)"/i)?.[1];
    const href = block.match(/href="(https:\/\/www\.amazon\.com\/[^"]+)"/i)?.[1];
    const asin = href?.match(ASIN)?.[1] ?? block.match(/data-asin="([A-Z0-9]{10})"/i)?.[1] ?? null;

    items.push({
      asin,
      item_description: decodeBasicEntities(title).trim(),
      quantity: qtyRaw ? Number(qtyRaw) : 1,
      source: 'WISHLIST',
      unit_price: priceRaw ? Number(priceRaw) : 0,
      vendor_url: href ?? null,
    });

    if (items.length >= 40) break;
  }

  return items;
};

const decodeBasicEntities = (value: string): string =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
