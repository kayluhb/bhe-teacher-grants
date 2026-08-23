import {requireAuth} from '~/lib/auth';
import {
  canImportWishlist,
  MAX_WISHLIST_ITEMS,
  MAX_WISHLIST_PAGES,
  nextWishlistPageUrl,
  normalizeWishlistUrl,
  parseWishlistHtml,
  parseWishlistXlsx,
  type WishlistItem,
} from '~/lib/wishlist';

const MAX_XLSX_BYTES = 1_000_000;
const AMAZON_HEADERS = {
  Accept: 'text/html',
  'User-Agent': 'BHETeacherGrants/1.0 (public wishlist import)',
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

const fetchAmazonPages = async (
  firstUrl: string,
): Promise<{items: WishlistItem[]; unreachable?: boolean}> => {
  const items: WishlistItem[] = [];
  const seen = new Set<string>();
  let pageUrl: string | null = firstUrl;
  let cookie = '';

  for (
    let page = 0;
    page < MAX_WISHLIST_PAGES && pageUrl && items.length < MAX_WISHLIST_ITEMS;
    page++
  ) {
    let response: Response;
    try {
      response = await fetch(pageUrl, {
        headers: cookie ? {...AMAZON_HEADERS, Cookie: cookie} : AMAZON_HEADERS,
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
    const html = await response.text();
    for (const item of parseWishlistHtml(html)) {
      const key = itemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      if (items.length >= MAX_WISHLIST_ITEMS) break;
    }
    pageUrl = nextWishlistPageUrl(html);
  }

  return {items};
};

const readInput = async (request: Request) => {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    const uploaded =
      typeof file === 'object' &&
      file !== null &&
      'arrayBuffer' in file &&
      'size' in file &&
      Number(file.size) > 0
        ? (file as Blob)
        : null;
    return {
      file: uploaded,
      url: String(form.get('url') ?? ''),
    };
  }
  const body = (await request.json()) as {url?: string};
  return {file: null, url: body.url ?? ''};
};

export async function POST(request: Request) {
  await requireAuth();

  try {
    return await importWishlist(request);
  } catch {
    return Response.json(
      {
        error:
          'Something went wrong while reading that list. Try Amazon’s Download list spreadsheet, or add items by hand.',
      },
      {status: 500},
    );
  }
}

const importWishlist = async (request: Request) => {
  const input = await readInput(request);
  const url = normalizeWishlistUrl(input.url);

  if (input.file) {
    if (input.file.size > MAX_XLSX_BYTES) {
      return Response.json({error: 'That spreadsheet is too large. Maximum 1MB.'}, {status: 400});
    }
    const bytes = new Uint8Array(await input.file.arrayBuffer());
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      return Response.json(
        {error: 'Upload the .xlsx Amazon gives you under More → Download list.'},
        {status: 400},
      );
    }
    const items = parseWishlistXlsx(bytes);
    if (items.length === 0) {
      return Response.json(
        {
          error:
            'That spreadsheet had no items we could read. Use Amazon’s More → Download list, or type the lines by hand.',
        },
        {status: 422},
      );
    }
    return Response.json({items, url});
  }

  if (!url) {
    return Response.json(
      {error: 'Paste a public Amazon list URL, or upload Amazon’s Download list .xlsx.'},
      {status: 400},
    );
  }
  if (!canImportWishlist(url)) {
    return Response.json(
      {
        error:
          'Import is only available for Amazon lists. Walmart and Target links are saved with the grant — add those items by hand.',
      },
      {status: 400},
    );
  }

  const fetched = await fetchAmazonPages(url);
  if (fetched.unreachable) {
    return Response.json(
      {
        error:
          'Amazon did not return that list. Confirm it is Public, upload the Download list .xlsx, or type the items by hand.',
      },
      {status: 422},
    );
  }
  const items = fetched.items;
  if (items.length === 0) {
    return Response.json(
      {
        error:
          'No items found on that page. On Amazon choose More → Download list and upload the .xlsx, or type the lines instead.',
      },
      {status: 422},
    );
  }

  return Response.json({items, url});
};
