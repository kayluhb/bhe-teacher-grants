import {requireAuth} from '~/lib/auth';
import {fetchProductImage} from '~/lib/product-preview';

export async function POST(request: Request) {
  await requireAuth();

  let body: {asin?: string; url?: string};
  try {
    body = (await request.json()) as {asin?: string; url?: string};
  } catch {
    return Response.json({error: 'Invalid request.'}, {status: 400});
  }

  const imageUrl = await fetchProductImage({
    asin: body.asin,
    vendorUrl: body.url,
  });
  return Response.json({image_url: imageUrl});
}
