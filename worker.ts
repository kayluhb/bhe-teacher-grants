import handler from 'vinext/server/fetch-handler';
import {notifyQuietly} from '~/lib/email';
import {runReviewNotifications} from '~/lib/review-notifications';

type FetchHandler = {
  fetch?: (
    request: Request,
    env: Cloudflare.Env,
    ctx: ExecutionContext,
  ) => Response | Promise<Response>;
};

const vinext = handler as
  | FetchHandler
  | ((
      request: Request,
      env: Cloudflare.Env,
      ctx: ExecutionContext,
    ) => Response | Promise<Response>);

const handleFetch = (request: Request, env: Cloudflare.Env, ctx: ExecutionContext) => {
  const fetchFn = typeof vinext === 'function' ? vinext : vinext.fetch;
  if (!fetchFn) throw new Error('Vinext fetch handler is missing.');
  return fetchFn(request, env, ctx);
};

export default {
  fetch: handleFetch,
  scheduled(_controller: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      runReviewNotifications({
        db: env.DB,
        now: new Date(),
        origin: env.APP_PUBLIC_URL ?? 'http://localhost:3000',
        send: notifyQuietly,
      }),
    );
  },
};
