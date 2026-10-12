import {requireAuth} from '~/lib/auth';
import {
  canImportWishlist,
  isAmazonInviteUrl,
  normalizeWishlistUrl,
  parseWishlistXlsx,
  type WishlistItem,
} from '~/lib/wishlist';
import {fetchAmazonWishlist, wishlistImportFailure} from '~/lib/wishlist-amazon';

const MAX_XLSX_BYTES = 1_000_000;

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
          'Something went wrong while reading that list. Try Amazon’s More → Download list file (no Excel needed), or add items by hand.',
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
      return Response.json({error: 'That download file is too large. Maximum 1MB.'}, {status: 400});
    }
    const bytes = new Uint8Array(await input.file.arrayBuffer());
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      return Response.json(
        {error: 'Upload the file Amazon gives you under More → Download list (no Excel needed).'},
        {status: 400},
      );
    }
    const items = parseWishlistXlsx(bytes);
    if (items.length === 0) {
      return Response.json(
        {
          error:
            'That file had no items we could read. Use Amazon’s More → Download list, or type the lines by hand.',
        },
        {status: 422},
      );
    }
    return Response.json({items, url});
  }

  if (!url) {
    if (isAmazonInviteUrl(input.url)) {
      return Response.json(
        {
          error:
            'That looks like an Amazon Share / Invite link. Open your list, set Privacy to Public, then paste the URL from the address bar (amazon.com/hz/wishlist/ls/…).',
        },
        {status: 400},
      );
    }
    return Response.json(
      {
        error:
          'Paste a public Amazon list URL from the address bar (amazon.com/hz/wishlist/ls/…), or upload Amazon’s More → Download list file.',
      },
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

  const fetched = await fetchAmazonWishlist(url);
  const failure = wishlistImportFailure(fetched);
  if (failure) {
    return Response.json({error: failure.error}, {status: failure.status});
  }

  const items: WishlistItem[] = fetched.items;
  return Response.json({items, url});
};
