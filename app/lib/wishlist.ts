import {unzipSync} from 'fflate';
import {itemImageUrl} from '~/lib/product-preview';

const AMAZON_LIST_ID = /\/(?:hz\/wishlist\/ls|gp\/registry\/wishlist|registries)\/+([A-Za-z0-9]+)/i;
const WALMART_LIST_PATH = /^\/(?:lists|registry)\//i;
const TARGET_LIST_PATH = /^\/(?:gift-registry|lists)(?:\/|$)/i;
const ASIN = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i;

type WishlistRetailer = 'amazon' | 'walmart' | 'target';

export type WishlistItem = {
  asin: string | null;
  image_url: string | null;
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

export const MAX_WISHLIST_ITEMS = 100;
export const MAX_WISHLIST_PAGES = 10;

const decodeBasicEntities = (value: string): string =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');

const stripTags = (value: string): string =>
  decodeBasicEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();

const amazonUrl = (href: string | undefined): string | null => {
  if (!href) return null;
  const decoded = decodeBasicEntities(href.trim());
  if (decoded.startsWith('https://www.amazon.com/')) return decoded;
  if (decoded.startsWith('/')) return `https://www.amazon.com${decoded}`;
  return null;
};

const asinOf = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const fromUrl = value.match(ASIN)?.[1];
  if (fromUrl) return fromUrl;
  const trimmed = value.trim();
  return /^[A-Z0-9]{10}$/i.test(trimmed) ? trimmed : null;
};

const toItem = (input: {
  asin: string | null;
  image_url?: string | null;
  item_description: string;
  quantity: number;
  unit_price: number;
  vendor_url: string | null;
}): WishlistItem => ({
  ...input,
  image_url: itemImageUrl({asin: input.asin, image_url: input.image_url}),
  source: 'WISHLIST',
});

const imageFromBlock = (block: string): string | null => {
  const src =
    block.match(/<img\b[^>]*(?:data-src|src)="(https:\/\/[^"]+)"/i)?.[1] ??
    block.match(/<img\b[^>]*(?:data-src|src)="(\/\/[^"]+)"/i)?.[1];
  if (!src) return null;
  const url = src.startsWith('//') ? `https:${src}` : src;
  return url.startsWith('https://') ? url : null;
};

export const parseWishlistHtml = (html: string): WishlistItem[] => {
  const items: WishlistItem[] = [];
  const blocks = html.split(/data-itemid="/i).slice(1);

  for (const block of blocks) {
    const title =
      block.match(/data-item-name="([^"]+)"/i)?.[1] ||
      block.match(/id="itemName_[^"]+"[^>]*title="([^"]+)"/i)?.[1] ||
      stripTags(block.match(/id="itemName_[^"]+"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? '') ||
      stripTags(block.match(/<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/i)?.[1] ?? '');
    if (!title) continue;

    const priceRaw =
      block.match(/data-price="([0-9.]+)"/i)?.[1] ?? block.match(/\$([0-9]+(?:\.[0-9]{2})?)/)?.[1];
    const qtyRaw =
      block.match(/data-requested-qty="(\d+)"/i)?.[1] ??
      block.match(/id="itemRequested_[^"]+"[^>]*>\s*(\d+)/i)?.[1];
    const href =
      amazonUrl(block.match(/id="itemName_[^"]+"[^>]*href="([^"]+)"/i)?.[1]) ??
      amazonUrl(block.match(/href="(https:\/\/www\.amazon\.com\/[^"]+)"/i)?.[1]) ??
      amazonUrl(block.match(/href="(\/(?:dp|gp\/product)\/[^"]+)"/i)?.[1]);
    const asin =
      asinOf(href) ??
      block.match(/data-asin="([A-Z0-9]{10})"/i)?.[1] ??
      block.match(/ASIN:([A-Z0-9]{10})/i)?.[1] ??
      null;

    items.push(
      toItem({
        asin,
        image_url: imageFromBlock(block),
        item_description: decodeBasicEntities(title).trim(),
        quantity: qtyRaw ? Number(qtyRaw) : 1,
        unit_price: priceRaw ? Number(priceRaw) : 0,
        vendor_url: href,
      }),
    );

    if (items.length >= MAX_WISHLIST_ITEMS) break;
  }

  return items;
};

export const nextWishlistPageUrl = (html: string): string | null => {
  const raw =
    html.match(/name="showMoreUrl"[^>]*value="([^"]+)"/i)?.[1] ??
    html.match(/value="([^"]+)"[^>]*name="showMoreUrl"/i)?.[1] ??
    html.match(/"showMoreUrl"\s*:\s*"(\/[^"]+)"/i)?.[1];
  if (!raw) return null;
  const decoded = decodeBasicEntities(raw.replaceAll('\\u0026', '&').replaceAll('\\/', '/'));
  if (decoded.startsWith('/')) return `https://www.amazon.com${decoded}`;
  if (decoded.startsWith('https://www.amazon.com/')) return decoded;
  return null;
};

const headerKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const COLUMN_ALIASES = {
  asin: ['item identifier', 'asin', 'item id', 'asin or isbn'],
  link: ['link', 'url', 'item link', 'product url'],
  price: ['price', 'list price', 'current price'],
  qty: ['quantity to buy', 'quantity', 'qty', 'requested'],
  title: ['title', 'item name', 'name', 'product name', 'item description'],
};

const columnIndex = (headers: string[], aliases: string[]): number => {
  const normalized = headers.map(headerKey);
  return aliases.reduce((found, alias) => (found >= 0 ? found : normalized.indexOf(alias)), -1);
};

const parsePrice = (raw: string): number => {
  const n = Number(raw.replace(/[^0-9.]+/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const parseQty = (raw: string): number => {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

export const parseWishlistRows = (rows: string[][]): WishlistItem[] => {
  const headerIndex = rows.findIndex((row) => {
    const keys = row.map(headerKey);
    return COLUMN_ALIASES.title.some((alias) => keys.includes(alias));
  });
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex] ?? [];
  const titleCol = columnIndex(headers, COLUMN_ALIASES.title);
  const priceCol = columnIndex(headers, COLUMN_ALIASES.price);
  const qtyCol = columnIndex(headers, COLUMN_ALIASES.qty);
  const linkCol = columnIndex(headers, COLUMN_ALIASES.link);
  const asinCol = columnIndex(headers, COLUMN_ALIASES.asin);
  if (titleCol < 0) return [];

  const items: WishlistItem[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const title = (row[titleCol] ?? '').trim();
    if (!title) continue;
    const href = amazonUrl((row[linkCol] ?? '').trim());
    const asin = asinOf((row[asinCol] ?? '').trim()) ?? asinOf(href);
    if (asinCol >= 0 && !asin) continue;
    items.push(
      toItem({
        asin,
        item_description: title,
        quantity: parseQty(row[qtyCol] ?? ''),
        unit_price: parsePrice(row[priceCol] ?? ''),
        vendor_url: href ?? (asin ? `https://www.amazon.com/dp/${asin}` : null),
      }),
    );
    if (items.length >= MAX_WISHLIST_ITEMS) break;
  }
  return items;
};

const MAX_XLSX_ROWS = 2000;
const XML_NS = '(?:[\\w]+:)?';

const xmlText = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

const xmlRe = (body: string, flags: string): RegExp =>
  new RegExp(body.replaceAll('NS', XML_NS), flags);

const sharedStrings = (xml: string): string[] =>
  xml
    .split(xmlRe(`<${XML_NS}si[ >]`, 'i'))
    .slice(1)
    .map((si) =>
      [...si.matchAll(xmlRe(`<${XML_NS}t[^>]*>([\\s\\S]*?)</${XML_NS}t>`, 'gi'))]
        .map((match) => decodeBasicEntities(match[1]))
        .join(''),
    );

const colLetters = (ref: string): number => {
  const letters = /^[A-Z]+/i.exec(ref)?.[0] ?? 'A';
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const rowNumber = (ref: string): number => Number(/(\d+)$/.exec(ref)?.[1] ?? '1') - 1;

const cellValue = (attrs: string, inner: string, strings: string[]): string => {
  const type = /\bt="([^"]+)"/i.exec(attrs)?.[1] ?? '';
  if (type === 'inlineStr') {
    return [...inner.matchAll(xmlRe(`<${XML_NS}t[^>]*>([\\s\\S]*?)</${XML_NS}t>`, 'gi'))]
      .map((match) => decodeBasicEntities(match[1]))
      .join('');
  }
  const raw = xmlRe(`<${XML_NS}v>([^<]*)</${XML_NS}v>`, 'i').exec(inner)?.[1] ?? '';
  if (type === 's') return strings[Number(raw)] ?? '';
  return raw;
};

const sheetRows = (xml: string, strings: string[]): string[][] => {
  const data =
    xmlRe(`<${XML_NS}sheetData\\b[^>]*>([\\s\\S]*?)</${XML_NS}sheetData>`, 'i').exec(xml)?.[1] ??
    xml;
  const grid: string[][] = [];
  for (const match of data.matchAll(
    xmlRe(`<${XML_NS}c\\b([^>]*)>([\\s\\S]*?)</${XML_NS}c>`, 'gi'),
  )) {
    const ref = /\br="([^"]+)"/i.exec(match[1])?.[1];
    if (!ref) continue;
    const row = rowNumber(ref);
    if (row >= MAX_XLSX_ROWS) continue;
    const col = colLetters(ref);
    if (!grid[row]) grid[row] = [];
    grid[row][col] = cellValue(match[1], match[2], strings);
  }
  return grid.map((row) => {
    const width = row.length;
    return Array.from({length: width}, (_, i) => row[i] ?? '');
  });
};

const isWorkbookXml = (name: string): boolean =>
  name.endsWith('sharedStrings.xml') || /worksheets\/sheet\d+\.xml$/i.test(name);

export const parseWishlistXlsx = (bytes: Uint8Array): WishlistItem[] => {
  try {
    const files = unzipSync(bytes, {filter: (file) => isWorkbookXml(file.name)});
    const names = Object.keys(files);
    const stringsPath = names.find((name) => name.endsWith('sharedStrings.xml'));
    const sheetPath = names.find((name) => /worksheets\/sheet\d+\.xml$/i.test(name));
    if (!sheetPath || !files[sheetPath]) return [];
    const strings =
      stringsPath && files[stringsPath] ? sharedStrings(xmlText(files[stringsPath])) : [];
    return parseWishlistRows(sheetRows(xmlText(files[sheetPath]), strings));
  } catch {
    return [];
  }
};
