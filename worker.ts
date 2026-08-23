import * as Sentry from '@sentry/cloudflare/nodejs_compat';
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
  const {pathname} = new URL(request.url);
  if (pathname === '/debug-sentry') {
    throw new Error('Sentry test error 2026-08-23T19:03Z — delete me');
  }

  const fetchFn = typeof vinext === 'function' ? vinext : vinext.fetch;
  if (!fetchFn) throw new Error('Vinext fetch handler is missing.');
  return fetchFn(request, env, ctx);
};

export default Sentry.withSentry(
  (env: Cloudflare.Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    dataCollection: {
      // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/cloudflare/configuration/options/#dataCollection
      // userInfo: false,
      // httpBodies: [],
    },
  }),
  {
    fetch: handleFetch,
    scheduled(_controller: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
      ctx.waitUntil(
        Sentry.startSpan({forceTransaction: true, name: 'review-notifications', op: 'task'}, () =>
          runReviewNotifications({
            db: env.DB,
            now: new Date(),
            origin: env.APP_PUBLIC_URL ?? 'http://localhost:3000',
            send: notifyQuietly,
          }),
        ),
      );
    },
  } satisfies ExportedHandler<Cloudflare.Env>,
);
