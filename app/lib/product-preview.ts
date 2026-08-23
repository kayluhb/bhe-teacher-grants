const MAX_HTML_BYTES = 512_000;
const AMAZON_ASIN = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i;
const PRIVATE_HOSTS = new Set(['localhost', '0.0.0.0', '::1']);

const isPrivateIpv4 = (host: string): boolean => {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
};

export const isSafePreviewUrl = (raw: string): boolean => {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!host) return false;
    if (PRIVATE_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.local')) {
      return false;
    }
    if (host.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
    if (isPrivateIpv4(host)) return false;
    return true;
  } catch {
    return false;
  }
};

const resolveImageUrl = (raw: string, pageUrl?: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const resolved = new URL(trimmed, pageUrl);
    return isSafePreviewUrl(resolved.toString()) ? resolved.toString() : null;
  } catch {
    return null;
  }
};

const metaContent = (html: string, keys: string[]): string | null => {
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta\\b[^>]*(?:(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["'])`,
      'i',
    );
    const match = html.match(pattern);
    const value = match?.[1] || match?.[2];
    if (value) return value;
  }
  return null;
};

const isProductType = (type: unknown): boolean => {
  const values = Array.isArray(type) ? type : [type];
  return values.some((value) => typeof value === 'string' && /(^|\/)Product$/i.test(value));
};

const imageValue = (image: unknown): string | null => {
  if (typeof image === 'string' && image.trim()) return image.trim();
  if (Array.isArray(image)) return imageValue(image[0]);
  if (image && typeof image === 'object' && 'url' in image) {
    return imageValue((image as {url: unknown}).url);
  }
  return null;
};

const productImageFromLd = (node: unknown): string | null => {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = productImageFromLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== 'object') return null;
  const obj = node as Record<string, unknown>;
  if (isProductType(obj['@type'])) return imageValue(obj.image);
  if (obj['@graph']) return productImageFromLd(obj['@graph']);
  return null;
};

const jsonLdImage = (html: string): string | null => {
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const found = productImageFromLd(JSON.parse(match[1] ?? ''));
      if (found) return found;
    } catch {
      // ignore invalid JSON-LD blocks
    }
  }
  return null;
};

export const parseProductImage = (html: string, pageUrl?: string): string | null => {
  const raw =
    metaContent(html, ['og:image', 'og:image:url']) ??
    metaContent(html, ['twitter:image', 'twitter:image:src']) ??
    jsonLdImage(html);
  return raw ? resolveImageUrl(raw, pageUrl) : null;
};

export const amazonImageUrl = (asin: string): string =>
  `https://images-na.ssl-images-amazon.com/images/P/${asin.trim().toUpperCase()}.01._SCLZZZZZZZ_.jpg`;

export const asinFromUrl = (raw: string): string | null => raw.match(AMAZON_ASIN)?.[1] ?? null;

export const itemImageUrl = (item: {
  asin?: string | null;
  image_url?: string | null;
}): string | null => {
  const stored = item.image_url?.trim();
  if (stored?.startsWith('https://')) return stored;
  const asin = item.asin?.trim();
  if (asin) return amazonImageUrl(asin);
  return null;
};

export const stackPreviewImages = (
  rows: Array<{asin: string | null; grant_id: string; image_url: string | null}>,
  limit = 3,
): Record<string, string[]> => {
  const byGrant: Record<string, string[]> = {};
  for (const row of rows) {
    const url = itemImageUrl(row);
    if (!url) continue;
    const existing = byGrant[row.grant_id];
    const stack = existing ?? [];
    if (!existing) byGrant[row.grant_id] = stack;
    if (stack.length >= limit) continue;
    stack.push(url);
  }
  return byGrant;
};

const readLimitedText = async (response: Response, max: number): Promise<string | null> => {
  const length = Number(response.headers.get('content-length') || 0);
  if (length > max) return null;
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};

export const fetchProductImage = async (
  input: {asin?: string | null; vendorUrl?: string | null},
  fetchFn: typeof fetch = fetch,
): Promise<string | null> => {
  const asin = input.asin?.trim() || asinFromUrl(input.vendorUrl ?? '');
  if (asin) return amazonImageUrl(asin);
  const vendorUrl = input.vendorUrl?.trim() ?? '';
  if (!isSafePreviewUrl(vendorUrl)) return null;

  try {
    const response = await fetchFn(vendorUrl, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'BHETeacherGrants/1.0 (product image preview)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    if (response.url && !isSafePreviewUrl(response.url)) return null;
    const html = await readLimitedText(response, MAX_HTML_BYTES);
    if (!html) return null;
    return parseProductImage(html, response.url || vendorUrl);
  } catch {
    return null;
  }
};
