import {requireAuth} from '~/lib/auth';
import {canImportWishlist, normalizeWishlistUrl, parseWishlistHtml} from '~/lib/wishlist';

export async function POST(request: Request) {
  await requireAuth();

  const body = (await request.json()) as {url?: string};
  const url = normalizeWishlistUrl(body.url ?? '');
  if (!url) {
    return Response.json(
      {error: 'Paste a public Amazon, Walmart, or Target list URL.'},
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

  const response = await fetch(url, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'BHETeacherGrants/1.0 (public wishlist import)',
    },
  });

  if (!response.ok) {
    return Response.json(
      {error: 'Amazon did not return that list. Confirm it is Public, or type the items by hand.'},
      {status: 422},
    );
  }

  const items = parseWishlistHtml(await response.text());
  if (items.length === 0) {
    return Response.json(
      {error: 'No items found. The list may be private — type the lines instead.'},
      {status: 422},
    );
  }

  return Response.json({items, url});
}
