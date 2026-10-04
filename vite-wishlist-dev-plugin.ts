import type {IncomingMessage, ServerResponse} from 'node:http';
import type {Plugin, ViteDevServer} from 'vite';

const readBody = async (req: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
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
      if (req.method !== 'POST' || req.url?.split('?')[0] !== '/api/wishlist/import') {
        next();
        return;
      }

      try {
        const contentType = req.headers['content-type'] ?? '';
        // File uploads still go to the Worker route.
        if (contentType.includes('multipart/form-data')) {
          next();
          return;
        }

        const raw = await readBody(req);
        const bodyText = new TextDecoder().decode(raw);
        let urlRaw = '';
        if (contentType.includes('application/json')) {
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
        if (fetched.unreachable) {
          sendJson(res, 422, {
            error:
              'Amazon did not return that list. Confirm it is Public, upload the Download list .xlsx, or type the items by hand.',
          });
          return;
        }
        if (fetched.blocked) {
          sendJson(res, 422, {
            error:
              'Amazon blocked the automatic import from this environment. On Amazon choose More → Download list and upload the .xlsx.',
          });
          return;
        }
        if (fetched.items.length === 0) {
          sendJson(res, 422, {
            error:
              'No items found on that page. On Amazon choose More → Download list and upload the .xlsx, or type the lines instead.',
          });
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
