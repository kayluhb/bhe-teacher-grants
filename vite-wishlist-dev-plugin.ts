import type {IncomingMessage, ServerResponse} from 'node:http';
import type {Plugin, ViteDevServer} from 'vite';

const HTTP_METHOD_POST = 'POST';
const WISHLIST_IMPORT_PATH = '/api/wishlist/import';
const CONTENT_TYPE_MULTIPART = 'multipart/form-data';
const CONTENT_TYPE_JSON = 'application/json';
const MAX_BODY_BYTES = 1_000_000;

const readBody = async (req: IncomingMessage, maxBytes: number): Promise<Buffer | null> => {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    total += buf.length;
    if (total > maxBytes) return null;
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
};

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

/**
 * Local Wrangler/workerd fetches to Amazon often get a bot shell with no items.
 * In `pnpm dev`, handle URL imports in Node instead so teachers can test the flow.
 */
export const wishlistDevPlugin = (): Plugin => ({
  name: 'wishlist-dev-import',
  configureServer(server: ViteDevServer) {
    server.middlewares.use(async (req, res, next) => {
      if (req.method !== HTTP_METHOD_POST || req.url?.split('?')[0] !== WISHLIST_IMPORT_PATH) {
        next();
        return;
      }

      try {
        const contentType = req.headers['content-type'] ?? '';
        // File uploads still go to the Worker route.
        if (contentType.includes(CONTENT_TYPE_MULTIPART)) {
          next();
          return;
        }

        const raw = await readBody(req, MAX_BODY_BYTES);
        if (!raw) {
          sendJson(res, 413, {error: 'Request body is too large.'});
          return;
        }
        const bodyText = new TextDecoder().decode(raw);
        let urlRaw = '';
        if (contentType.includes(CONTENT_TYPE_JSON)) {
          urlRaw = String((JSON.parse(bodyText || '{}') as {url?: string}).url ?? '');
        } else {
          urlRaw = new URLSearchParams(bodyText).get('url') ?? '';
        }

        const wishlist = (await server.ssrLoadModule('/app/lib/wishlist.ts')) as {
          canImportWishlist: (url: string) => boolean;
          normalizeWishlistUrl: (raw: string) => string | null;
        };
        const amazon = (await server.ssrLoadModule('/app/lib/wishlist-amazon.ts')) as {
          fetchAmazonWishlist: (url: string) => Promise<{
            blocked?: boolean;
            items: unknown[];
            unreachable?: boolean;
          }>;
          wishlistImportFailure: (fetched: {
            blocked?: boolean;
            items: unknown[];
            unreachable?: boolean;
          }) => {error: string; status: number} | null;
        };

        const url = wishlist.normalizeWishlistUrl(urlRaw);
        if (!url) {
          sendJson(res, 400, {
            error: 'Paste a public Amazon list URL, or upload Amazon’s Download list .xlsx.',
          });
          return;
        }
        if (!wishlist.canImportWishlist(url)) {
          sendJson(res, 400, {
            error:
              'Import is only available for Amazon lists. Walmart and Target links are saved with the grant — add those items by hand.',
          });
          return;
        }

        const fetched = await amazon.fetchAmazonWishlist(url);
        const failure = amazon.wishlistImportFailure(fetched);
        if (failure) {
          sendJson(res, failure.status, {error: failure.error});
          return;
        }

        sendJson(res, 200, {items: fetched.items, url});
      } catch (error) {
        console.error('[wishlist-dev-import]', error);
        sendJson(res, 500, {
          error:
            'Something went wrong while reading that list. Try Amazon’s Download list spreadsheet, or add items by hand.',
        });
      }
    });
  },
});
