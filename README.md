# BHE Teacher Grant Portal

Barton Hills Elementary PTA portal for teacher grant requests, committee voting, treasurer fulfillment, and cycle budget actuals.

## Local development

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate
pnpm dev
```

In development the app signs you in as the seeded user for `DEV_ROLE` (default treasurer). Switch roles without email:

```bash
DEV_ROLE=teacher pnpm dev
```

`DEV_ROLE=chairman` signs in as the seeded chairman (`chair@bheeagles.com`, stored as committee). A teacher assigned to the committee uses `/portal` for their grants and `/review` to vote.

To try the OTP login form locally, set `DEV_ROLE=otp`. Codes print to the server log when Resend is not configured. You can request another code after a 60s cooldown (5 per hour).

Seeded accounts: treasurer (`treasurer@bheeagles.com`; `DEV_ROLE=admin` or `treasurer`), `teacher` (also a Fall 2026 committee reviewer), `committee`, `principal`, and `chairman`. AISD (`@austinisd.org`) emails are teachers. Other emails are committee.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vinext + Wrangler local server |
| `pnpm test` | Vitest (votes, fulfillment, wishlist, login) |
| `pnpm typecheck` | `tsc -b` |
| `pnpm lint` | Biome |
| `pnpm db:migrate` | Apply D1 migrations locally |

## Production

The production hostname is `https://grants.bheeagles.com`. Create a real D1 database and R2 bucket, put their IDs in `wrangler.jsonc`, then:

```bash
wrangler secret put SESSION_SECRET
wrangler secret put RESEND_API_KEY
pnpm db:migrate:remote
pnpm deploy
```

Sign-in is a one-time code emailed to you. Teachers use `@austinisd.org`; other emails can sign in as committee.
