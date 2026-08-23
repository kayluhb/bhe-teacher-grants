declare module '*.css';

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES_BUCKET: R2Bucket;
    SESSION_SECRET: string;
    RESEND_API_KEY: string;
    APP_PUBLIC_URL?: string;
  }
}

declare module 'cloudflare:workers' {
  const env: Cloudflare.Env;

  export {env};
}
