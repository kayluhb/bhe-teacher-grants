# Teacher Grant Portal — Technical Architecture & Build Guide
**Platform:** Vinext on Cloudflare Workers (same stack as Lil CRM, Kindred, Current Forward, Current Signals)  
**Target Audience:** Engineering & Product Teams  
**Document Version:** 1.8.0  
**Date:** August 2026  

---

## Executive Summary

The **Teacher Grant Portal** is a web application designed for school PTAs to manage the lifecycle of teacher grants. Every grant belongs to a **school year** and a **semester** (Fall or Spring), matching how Barton Hills already files reimbursements, so the PTA can compare windows over time. The platform streamlines four core phases:

1. **Submission:** Teachers submit itemized funding requests (typed lines). If they have a **public Amazon wishlist**, they can paste it to prefill those lines — they do not have to.
2. **Voting:** Board members **and** grant committee members each cast a vote. A grant is approved or rejected only after quorum and majority are met — not by a single reviewer.
3. **Fulfillment:** PTA Treasurers track approved grants, submit purchases, record **actual** unit prices and quantities from vendor receipts, attach receipts, and upload tracking details.
4. **Delivery & Reconciliation:** Teachers acknowledge receipt of physical items. The system closes the audit trail by comparing requested vs. actual spend and releasing unused approved funds back to the cycle pool.

Teachers routinely estimate one cost and the vendor charges another (sale pricing, substitutions, tax/shipping, out-of-stock items). The portal treats **requested**, **approved**, and **actual** as three distinct ledgers so the PTA never mistakes a quote for money spent.

The app is a **single Vinext package** (like Lil CRM), not a monorepo. Implementation patterns come from `~/Projects/lillian` (Vinext, Server Actions, D1, Google OAuth, Resend). **Look and copy** come from `~/Projects/beckett/bhe-pta` (Barton Hills Elementary PTA site at bheeagles.com) — same school, same parents, same treasurer workflows. Do not invent a second BHE brand.

---

## 1. Preferred Stack (from `~/Projects/lillian`)

Do **not** introduce Hono, Remix, Cloudflare Access, `wrangler.toml`, or a standalone Worker API. Those do not match how the Lillian apps are built. Do **not** port `bhe-pta`'s React Router 8 app — take its **design tokens and admin/form UX** only.

| Layer | Choice | Precedent |
| :--- | :--- | :--- |
| App framework | **Vinext** (`vinext` ^0.0.40) — Next.js App Router surface on Vite, deployed to Workers | lil-crm, kindred, current-forward, reddit-analysis |
| UI | React 19 Server Components; `"use client"` only for interactivity | all Lillian apps |
| Mutations | **Server Actions** (`'use server'`) colocated as `actions.ts` | kindred `app/**/actions.ts` |
| HTTP routes | Thin `app/api/` only for OAuth callback and multipart R2 uploads | lil-crm auth callback; kindred `upload-photo` |
| Database | Cloudflare **D1**, `getDb()` / `env.DB`, parameterized `.bind(...)` | all Lillian apps |
| Files | Cloudflare **R2** via authenticated `POST` of `FormData` (not presigned URLs) | kindred `PHOTOS_BUCKET` |
| Auth | Google OAuth + `users` / `sessions` cookies; email must already exist (allowlist) | lil-crm |
| Email | **Resend** HTTP API from server code | kindred `app/lib/email.ts` |
| Styling | Tailwind CSS v4 + **BHE tokens** from `bhe-pta/app/app.css` | bhe-pta |
| Lint / test / pkg | Biome, Vitest (colocated `*.test.ts` or `__tests__/`), **pnpm** | all Lillian apps |
| Config | `wrangler.jsonc` (not toml), `migrations/`, `.dev.vars` | all Lillian apps |
| Bindings | `import { env } from 'cloudflare:workers'` | all Lillian apps |

### Project shape (single package, Lil CRM style)

```
app/
  (app)/                    # Authenticated shell (requireAuth in layout)
    page.tsx                # Role-aware home
    grants/                 # Teacher list + new + detail
    grants/[id]/
    grants/new/
    review/                 # Voting queue (board + committee)
    review/[id]/            # Tally, comments, cast/change vote
    fulfill/                # Treasurer queue + actuals form
    fulfill/[id]/
    budget/                 # Ledger filtered by school year + semester
    admin/                  # School years, semester windows, roster, vote rules
    layout.tsx
  login/page.tsx
  api/
    auth/callback/route.ts
    auth/logout/route.ts
    uploads/route.ts        # Quotes, receipts, delivery photos → R2
    wishlist/import/route.ts  # Public Amazon list → line-item preview
  components/
  lib/
    auth.ts                 # Google OAuth, sessions, requireRole()
    db.ts                   # getDb()
    grants.ts               # Grant CRUD + state transitions
    votes.ts                # Cast/tally; quorum + majority
    budget.ts               # Cycle snapshot + remaining
    fulfillment.ts          # Actuals + variance (track only, no approval gate)
    format-currency.ts      # Copy formatUsd from bhe-pta
    school-year.ts          # Copy formatSchoolYearLong from bhe-pta
    wishlist.ts             # Normalize Amazon list URLs; map import → grant_items
    email.ts                # Resend helper
    sanitize.ts
  env.d.ts
  layout.tsx
  app.css                   # Copy @theme tokens from bhe-pta
migrations/
  0001_initial_schema.sql
  0002_seed_admin.sql
wrangler.jsonc
vite.config.ts
biome.json
package.json
```

Path alias: `"~/*": ["./app/*"]` (same as lil-crm / kindred).

### Architecture

```
                    ┌─────────────────────────────────────────┐
                    │               END USERS                 │
                    │  (Teachers, Board, Committee, Treasurer)│
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │     GOOGLE OAUTH (allowlisted users)    │
                    │     Session cookie → users / sessions   │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKERS (Vinext RSC)                          │
│         Server Components + Server Actions + thin API routes                │
├──────────────────────────────────────┬──────────────────────────────────────┤
│            PAGES                     │            SERVER                    │
│   • Teacher dashboard / wishlist import│ • app/**/actions.ts (mutations)    │
│   • Board + committee voting         │   • app/lib/grants.ts, votes.ts      │
│   • Treasurer fulfillment + actuals  │   • app/api/auth/*                   │
│   • Cycle budget ledger              │   • app/api/uploads (R2 FormData)    │
│   • Admin cycles + roster            │   • app/lib/email.ts (Resend)        │
└──────────────────┬──────────────────┴──────────────────┬────────────────────┘
                   │                                     │
                   ▼                                     ▼
┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐
│          CLOUDFLARE D1              │ │            CLOUDFLARE R2            │
│       Binding: DB                   │ │        Binding: FILES_BUCKET        │
│  • users & sessions                 │ │  • Vendor quotes                    │
│  • school years + Fall/Spring cycles│ │  • Receipts & invoices              │
│  • grants & line items              │ │  • Delivery proof photos            │
│  • requested / approved / actual $  │ │                                     │
│  • Amazon wishlist URL + item ASINs │ │                                     │
│  • grant_votes (board + committee)  │ │                                     │
│  • variance notes & audit trail     │ │                                     │
└─────────────────────────────────────┘ └─────────────────────────────────────┘
```

---

## 2. Design System (from `~/Projects/beckett/bhe-pta`)

Copy the **visual language**, money UI, and admin-table patterns from the existing Barton Hills PTA site. Do **not** copy its React Router architecture — this portal stays Vinext.

Source of truth: `bhe-pta/app/app.css`, `bhe-pta/app/root.tsx`, `bhe-pta/app/components/Header.tsx`, `bhe-pta/app/routes/admin.reimbursements.tsx`, `bhe-pta/app/lib/format-currency.ts`.

### Brand tokens

Copy this `@theme` block into `app/app.css` verbatim:

```css
@import "tailwindcss";

@theme {
  --color-eagle-blue: #1a6b3a;
  --color-spirit-gold: #d4a843;
  --color-creek-green: #2d6a4f;
  --color-warm-white: #faf8f5;
  --color-night-blue: #0a2a15;
  --color-charcoal: #1a2e1a;
  --font-family-heading: "Montserrat", sans-serif;
  --font-family-body: "Inter", sans-serif;
}
```

Load the same Google fonts as `bhe-pta/app/root.tsx`: Inter (body, 100–900) and Montserrat (heading, 400/500/600/700).

| Token | Hex | Use |
| :--- | :--- | :--- |
| `eagle-blue` | `#1a6b3a` | App header, primary buttons, focus rings on inputs, links |
| `spirit-gold` | `#d4a843` | Marketing CTA pills, pending/vote-in-progress badges, `:focus-visible` outline |
| `creek-green` | `#2d6a4f` | Approved / delivered / under-budget (positive variance) |
| `warm-white` | `#faf8f5` | Page background (`body`, main) |
| `night-blue` | `#0a2a15` | Header gradient end, footer, CTA text on gold |
| `charcoal` | `#1a2e1a` | Body text |

Do **not** use Lillian cream / navy / gold (`#f5f0eb`, `#0F2137`, `#C4962C`). Those are Current Forward, not BHE.

### Typography & chrome

- Body: `font-body bg-warm-white text-charcoal` (same as `bhe-pta` `<body>`).
- Headings and stat numbers: `font-heading font-bold`. Money always `tabular-nums` via `formatUsd()` copied from `bhe-pta/app/lib/format-currency.ts`.
- Sticky header: `bg-eagle-blue` (or `bg-gradient-to-r from-eagle-blue to-night-blue` on internal tools, matching the reimbursement admin bar). Wordmark: **Barton Hills Elementary PTA** / Teacher Grants. Reuse the eagle `HeaderLogo` asset from `bhe-pta` if it can be copied.
- Content width: `max-w-7xl mx-auto px-4`.
- Skip link: gold on night-blue, same classes as `bhe-pta` root (`sr-only focus:not-sr-only … focus:bg-spirit-gold focus:text-night-blue`).
- `:focus-visible { outline: 2px solid #d4a843; outline-offset: 2px; }` and `prefers-reduced-motion` reset — copy from `app.css`.
- Primary **page** CTA (teacher “Submit grant”): gold pill like the site’s Give button — `bg-spirit-gold text-night-blue font-heading font-bold rounded-full border-2 border-spirit-gold hover:bg-white`.
- Primary **admin/tool** action (cast vote, record purchase): `bg-eagle-blue text-white font-heading font-semibold rounded-lg hover:bg-eagle-blue/90`.
- Inputs: `rounded-lg border border-gray-300 bg-white shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue font-body`.

### Status pills (copy reimbursement admin)

`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border`

| Grant status | Classes (from `admin.reimbursements.tsx` `StatusBadge`) |
| :--- | :--- |
| `DRAFT` | `bg-gray-100 text-gray-700 border-gray-300` |
| `PENDING` (voting) | `bg-spirit-gold/15 text-spirit-gold border-spirit-gold/30` |
| `APPROVED` | `bg-creek-green/15 text-creek-green border-creek-green/30` |
| `REJECTED` | `bg-red-100 text-red-700 border-red-300` |
| `PURCHASED` | `bg-indigo-100 text-indigo-800 border-indigo-300` (same as “check written”) |
| `DELIVERED` | `bg-slate-100 text-slate-700 border-slate-300` |

Variance: negative (under) `text-creek-green`; positive (over) `text-red-700`.

### Screens to imitate, not reinvent

| Portal screen | Closest `bhe-pta` reference |
| :--- | :--- |
| Login | `admin.login.tsx` — centered card on `warm-white`, eagle-blue/night-blue icon tile, “Barton Hills Elementary” subtitle. Board/admin copy can mention `@bheeagles.com`; teachers will often be AISD emails and must still be invited. |
| Teacher grant form | `FormWizard` — itemized lines are required. Optional “Have an Amazon wishlist?” import; help `<dialog>` says the list must be **Public** if they use one. |
| Voting / treasurer queues | `admin.reimbursements.tsx` — snapshot stat cards, school-year/status filters, searchable table, status pills, `formatUsd`. |
| Cycle budget ledger | Same stat-card + table pattern; **school-year dropdown + Fall / Spring / All-year tabs** (copy the reimbursement year filter). Columns requested / approved / actual / variance. |
| Confirmations | Native `<dialog>` with `backdrop:bg-black/40` (reimbursement help modal). |
| School years admin | `admin.school-years.tsx` — label `2026-27`, starts/ends, `is_default` current year. Then create Fall and Spring grant windows under that year. |

### Biome (match bhe-pta, not Lillian)

`bhe-pta/biome.json` is the house style for this school:

- 2-space indent, **100** char line width, single quotes, semicolons
- `bracketSpacing: false` (`import {useState} from 'react'`)
- `useSortedAttributes: on` — alphabetize JSX props (also in `bhe-pta/CLAUDE.md`)

---

## 3. User Roles & State Machine

### Core User Roles

Stored on `users.role`. Guards live in `app/lib/auth.ts` as `requireAuth()`, `requireRole(...)`, matching Kindred's `requireAdmin()` / Lil CRM's `requireAuth()`.

| Role | Access Level | Responsibilities |
| :--- | :--- | :--- |
| **teacher** | Standard User | Itemizes a grant (required). May optionally import a public Amazon wishlist to prefill lines. Tracks status; confirms delivery. Cannot edit actuals. Cannot vote on their own grant. |
| **board** | Voter | Casts a vote on pending grants; comments; sees cycle remaining and post-purchase variance. Same voting weight as committee. |
| **committee** | Voter | Grant committee member. Same voting rights and weight as board — one vote per person, not a rubber stamp of the board. |
| **treasurer** | Purchaser | Buys from the grant’s Amazon wishlist when present; records **actuals** from the receipt; uploads receipts; optional variance notes. Does not vote (one role per user). |
| **admin** | System Administrator | Creates school years and Fall/Spring windows; manages budget caps and vote rules; invites users and assigns roles. May vote. |

A user may hold one role. Admin can do everything a voter or treasurer can do. **Board and committee are both voters.** A single board or committee member cannot approve or reject a grant by themselves.

### State Machine Lifecycle

```
                     ┌───────────────┐
                     │     DRAFT     │
                     └───────┬───────┘
                             │ (Teacher Submits)
                             ▼
                     ┌───────────────┐
                     │    PENDING    │
                     └───────┬───────┘
                             │
            ┌────────────────┴────────────────┐
   (Vote passes)                      (Vote fails)
            │                                 │
            ▼                                 ▼
    ┌───────────────┐                 ┌───────────────┐
    │   APPROVED    │                 │   REJECTED    │
    └───────┬───────┘                 └───────────────┘
            │ (Treasurer Purchases + records actuals)
            ▼
    ┌───────────────┐
    │   PURCHASED   │
    └───────┬───────┘
            │ (Teacher Confirms Arrival)
            ▼
    ┌───────────────┐
    │   DELIVERED   │
    └───────────────┘
```

#### State Definitions & Rules

1. **`DRAFT`**: Created by a teacher. Editable at any time. Not visible to reviewers. Amounts are **requested estimates** only and do not consume cycle budget.
2. **`PENDING`**: Submitted into an active grant window. Locked for editing by teacher. Visible to board and committee voters. Each eligible voter casts APPROVE / REJECT / ABSTAIN. Status stays `PENDING` until quorum and majority are met. Requested amounts are informational (soft pipeline), not committed.
3. **`APPROVED`**: Vote passed (quorum met and approve majority). `approved_amount` is locked (defaults to requested total; admin/board may lower it before purchase). This amount is **committed** against the cycle budget until fulfillment.
4. **`REJECTED`**: Vote failed (quorum met and reject majority). Rejection notes come from voter comments. Releases any soft pipeline visibility; never committed.
5. **`PURCHASED`**: Order executed by Treasurer. Each line item has actual quantity/price (or an unavailable/substituted status). Grant `actual_amount` is the sum of purchased actuals. Cycle budget **releases** unused committed funds when under, or **consumes extra** when over — both are tracked as variance, never blocked for approval. Must include vendor, tracking (if shipped), and receipt R2 key.
6. **`DELIVERED`**: Teacher verifies physical item arrival. Grant lifecycle complete. Actuals remain the source of truth for spent dollars.

### Committee & Board Voting

Approval is a **recorded vote**, not a single reviewer's decision. Board members and committee members have equal weight.

| Rule | Detail |
| :--- | :--- |
| **Who votes** | Every user with role `board`, `committee`, or `admin`. |
| **Who does not** | Teachers and treasurers. The submitting teacher is always excluded, even if they somehow had a voter role. |
| **Ballot** | `APPROVE`, `REJECT`, or `ABSTAIN`, plus an optional comment. One vote per person per grant. |
| **Change vote** | Allowed while the grant is still `PENDING`. Upsert on `(grant_id, voter_id)`. |
| **Quorum** | Per cycle: `vote_quorum` (default **3** non-abstain votes). No decision until quorum is met. |
| **Majority** | Of non-abstain votes: approve count must be **strictly greater** than reject count to pass; reject count strictly greater to fail. Ties stay `PENDING`. |
| **`approved_amount`** | When the vote passes, lock to `requested_amount`. Admin or board may lower it before the treasurer purchases. |
| **Comments** | Visible to other voters after they vote (or immediately — keep it simple and show comments to all voters; teachers see outcome, not individual ballots). |
| **Recusal** | A voter who is the grant's `teacher_id` cannot vote. |

`castVote()` writes the ballot, retallies, and only then transitions `PENDING` → `APPROVED` or `REJECTED`. Until that transition, nothing is committed against the cycle budget.

### School years and semesters

Grants are never free-floating. Every grant belongs to exactly one **semester window**, and every window belongs to exactly one **school year** — the same `2026-27` identity the reimbursement app uses.

```
school_years          grant_cycles                         grants
2025-26          ┬── FALL   (Fall 2025–26 window)    →  grants…
                 └── SPRING (Spring 2025–26 window)  →  grants…
2026-27 ★        ┬── FALL   (Fall 2026–27, active)   →  grants…
                 └── SPRING (Spring 2026–27)         →  grants…
```

| Concept | How it is stored | Example |
| :--- | :--- | :--- |
| **School year** | `school_years.id` = `2026-27` (same as `bhe-pta`). Display with `formatSchoolYearLong` → `2026-2027`. `is_default` marks the current year. | 2026-27 runs ~ Aug 2026 – Jul 2027 |
| **Semester** | `grant_cycles.semester` = `FALL` or `SPRING`. Unique per year: at most one Fall and one Spring. | Fall 2026–27, Spring 2026–27 |
| **Grant** | `grants.cycle_id` → cycle. Do not also store year/semester on the grant; join through the cycle. | Ms. Lee’s Fall 2026–27 request |

**Rules:**

- Teachers may submit only into the cycle with `is_active = 1` (the open window). Past years and the other semester stay visible as history.
- Admin creates a school year first (copy `bhe-pta` school-years CRUD), then opens Fall and/or Spring under it. Cannot create a second Fall for the same year.
- Only one cycle is `is_active` at a time. Closing a window does not hide its grants.
- Default filter everywhere is `school_years.is_default` + the active semester if one is open, otherwise “All year”.
- Lists, ledgers, and CSV export always include **school year + semester** so Fall 2025–26 and Fall 2026–27 never mix.
- Budget is set **per semester**. The year view sums Fall + Spring so the PTA can see a full-year total and compare years.

### Amazon wishlists (optional shortcut)

Teachers **do not need** a wishlist. A grant with only typed line items is complete. When they *do* have a public Amazon classroom list, importing it saves retyping — treat that URL as a catalog helper, not a requirement.

**Why it helps**

| Pain today | What the portal does |
| :--- | :--- |
| Teachers retype every kit, title, and price | Paste the list URL → import becomes line items |
| Quotes are stale by the time the treasurer buys | Import **snapshots** title, qty, and price as `requested_*`. Live Amazon prices at purchase time become `actual_*` (the variance we already track) |
| Treasurer hunts for 12 different vendor links | One “Open wishlist” button; buy the list, attach one receipt |
| Board cannot see what “the Amazon list” contains | Voters see the snapshotted items **and** the live link |

**Teacher flow**

1. New grant: title, impact, and **line items** (description, qty, price). That is enough to submit.
2. Optional: paste a public Amazon wishlist URL and run `importWishlistAction` / `POST /api/wishlist/import`. Preview: title, quantity, unit price, product URL, ASIN. Help copy: the list must be **Public** if they use this. Private lists cannot be imported.
3. Teacher reviews imported rows: remove extras, fix qty, keep or add non-Amazon lines (Lakeshore, etc.).
4. If they imported, submit stores `grants.wishlist_url` plus the **reviewed snapshot**. `requested_amount` is always the sum of line items on the form — not a later Amazon price.
5. A grant may have a wishlist **and** extra manual lines, or **no wishlist at all**.

**Treasurer / voters**

- Detail pages show a persistent **Open Amazon wishlist** link (`target="_blank"`, `rel="noopener"`).
- Fulfillment starts from the snapshotted lines. Treasurer records actuals from the checkout/receipt (tax, shipping, substitutions — already first-class).
- Do not re-import at purchase time to overwrite requested prices. Re-import is only for a `DRAFT` the teacher is still editing.

**Import rules (keep this boring and legal)**

- Accept only `amazon.com` list URLs (`/hz/wishlist/ls/…`, `/gp/registry/wishlist/…`, `/registries/…`). Reject everything else via `sanitizeUrl` + host allowlist.
- Amazon has no public wishlist API. Fetch a **public** list page with **Cloudflare Browser Rendering** (`BROWSER` binding) and map visible items to `{title, quantity, unit_price, vendor_url, asin}`. Cap at **40 items**.
- If the list is private, empty, or the fetch fails: keep the URL, show a clear error, and let the teacher itemize by hand. The grant is still valid with just the link + manual lines.
- Do not store Amazon cookies or teacher Amazon accounts. Rate-limit imports per user.
- Unit-test `normalizeWishlistUrl` and HTML→item mapping against **checked-in fixtures** (`app/lib/wishlist.test.ts`). Do not depend on live amazon.com in CI.

---

## 4. Budget Ledger: Requested vs. Approved vs. Actual

This is a first-class product requirement, not a reporting afterthought. Quotes from teachers are frequently wrong: items go on sale, tax/shipping was omitted, a kit is substituted, or a SKU is discontinued.

### Three Amounts (never collapse them)

| Ledger | Who sets it | When | Meaning |
| :--- | :--- | :--- | :--- |
| **Requested** | Teacher | Draft / submit | Sum of line items (typed and/or imported). Used by voters. Wishlist prices are snapshotted at import and not refreshed later. |
| **Approved** | Vote outcome | When vote passes | Authorized spend cap. Defaults to requested total; admin/board may reduce it before purchase. **Commits** cycle budget. |
| **Actual** | Treasurer | Fulfillment | What was really paid, from the receipt. **Spends** cycle budget. May be per-line-item and may include substitutions. |

Variance is always `actual − approved` once purchased (negative = under budget / funds returned to pool; positive = overage).

### Cycle Budget Rollup

For a **semester** (`grant_cycles.budget_limit`):

| Bucket | Formula | Consumes budget? |
| :--- | :--- | :--- |
| **Pipeline (requested)** | `SUM(requested_amount)` for `PENDING` grants | No — display only so voters see demand |
| **Committed** | `SUM(approved_amount)` for `APPROVED` grants (not yet purchased) | Yes |
| **Spent** | `SUM(actual_amount)` for `PURCHASED` and `DELIVERED` grants | Yes |
| **Remaining** | `budget_limit − committed − spent` | — |
| **Variance (cycle)** | `SUM(actual_amount − approved_amount)` for purchased/delivered | Informational |

**Do not** keep using requested or approved amounts as “spent” after purchase. If a teacher requested $180, the vote approved $180, and the treasurer paid $142.17, remaining cycle budget must increase by $37.83.

### Line-Item Fulfillment Outcomes

Treasurers record actuals **per line item**, not only a grant-level lump sum. Common cases:

| `item_status` | Actual quantity / price | Effect on `actual_amount` |
| :--- | :--- | :--- |
| `PURCHASED` | Required | `actual_quantity × actual_unit_price` |
| `SUBSTITUTED` | Required, plus `actual_description` | Same, using the replacement item’s actuals |
| `UNAVAILABLE` | Actuals null / zero | $0 — item not bought; unused approved share returns to pool |
| `CANCELLED` | Actuals null / zero | $0 — treasurer or a voter dropped the line after approval |

Shipping, tax, and fees that were not on the original request are recorded as an additional fulfillment line (`is_ad_hoc = 1`) so the receipt still ties out.

### Overage is tracked, not gated

If `actual_amount > approved_amount`, the treasurer still marks the grant `PURCHASED`. There is **no** board/committee confirmation, no 10% / $25 threshold, and no required note. `fulfillGrant()` always accepts the actuals.

- Variance (`actual − approved`) is stored (computed) and shown in red on the grant, the cycle ledger, and the export.
- Extra dollars **do** reduce remaining cycle budget (`spent` uses actuals).
- An optional `variance_note` / line-level note is for the treasurer’s memory (tax, shipping, substitution) — never a blocker.

### What Each UI Must Show

- **Teacher dashboard:** Grouped by school year, then Fall / Spring. Wishlist-backed grants show an Amazon pill + item count. Requested total only before purchase; after purchase, requested vs. actual. Teachers do not edit actuals.
- **Voting console (board + committee):** School-year dropdown + semester tabs (same control as reimbursement admin). Per-grant requested total, current tally, remaining semester budget if this grant passed, and (for closed grants) actual vs. approved variance.
- **Treasurer fulfillment:** Same year/semester filter. **Open wishlist** when `wishlist_url` is set. Side-by-side requested (snapshot) vs. actual columns; live variance as information only.
- **Budget ledger:** Year selector + Fall / Spring / All-year. Semester view uses that cycle’s `budget_limit`. All-year view sums both semesters’ committed, spent, remaining, and variance so years can be compared.

---

## 5. Database Schema (Cloudflare D1)

Migrations live in `migrations/` and are applied with `pnpm db:migrate` / `pnpm db:migrate:remote`, same as Lil CRM. IDs use D1 defaults (`lower(hex(randomblob(16)))`).

```sql
-- migrations/0001_initial_schema.sql

PRAGMA foreign_keys = ON;

-- Auth (Lil CRM / Kindred pattern: allowlisted users + cookie sessions)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'board', 'committee', 'treasurer', 'admin')),
  google_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- School years (same identity as bhe-pta reimbursements)
CREATE TABLE IF NOT EXISTS school_years (
  id TEXT PRIMARY KEY,                            -- e.g. '2026-27'
  label TEXT NOT NULL,                            -- display short label, usually same as id
  starts_on TEXT NOT NULL,                        -- date, e.g. 2026-08-01
  ends_on TEXT NOT NULL,                          -- date, e.g. 2027-07-31
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_school_years_label ON school_years(label);

-- Semester windows (exactly one FALL and one SPRING per school year)
CREATE TABLE IF NOT EXISTS grant_cycles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  school_year_id TEXT NOT NULL REFERENCES school_years(id) ON DELETE RESTRICT,
  semester TEXT NOT NULL CHECK (semester IN ('FALL', 'SPRING')),
  name TEXT NOT NULL,                             -- e.g. 'Fall 2026-27 Teacher Grants'
  budget_limit REAL NOT NULL DEFAULT 0.0,         -- pot for this semester
  max_grant_amount REAL NOT NULL DEFAULT 500.0,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0, 1)),
  vote_quorum INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_year_id, semester)
);

CREATE INDEX IF NOT EXISTS idx_cycles_school_year ON grant_cycles(school_year_id);
CREATE INDEX IF NOT EXISTS idx_cycles_active ON grant_cycles(is_active);

-- Grant Applications
CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  cycle_id TEXT NOT NULL REFERENCES grant_cycles(id) ON DELETE RESTRICT,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  grade_level_subject TEXT NOT NULL,
  title TEXT NOT NULL,
  impact_statement TEXT NOT NULL,
  wishlist_url TEXT,                          -- Public Amazon list; optional
  wishlist_imported_at TEXT,                  -- When the snapshot was last pulled
  requested_amount REAL NOT NULL DEFAULT 0.0,
  approved_amount REAL,
  actual_amount REAL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(
    status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PURCHASED', 'DELIVERED')
  ),
  rejection_reason TEXT,
  variance_note TEXT,                         -- Optional treasurer note when actual ≠ approved
  vendor_name TEXT,
  tracking_number TEXT,
  receipt_r2_key TEXT,
  proof_of_delivery_r2_key TEXT,
  purchased_at TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Itemized Grant Line Items (requested + actual)
CREATE TABLE IF NOT EXISTS grant_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  total_price REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  vendor_url TEXT,
  asin TEXT,                                  -- Amazon ASIN when imported from a wishlist
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('WISHLIST', 'MANUAL')),
  quote_r2_key TEXT,
  is_ad_hoc INTEGER NOT NULL DEFAULT 0 CHECK(is_ad_hoc IN (0, 1)),
  item_status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK(
    item_status IN ('REQUESTED', 'PURCHASED', 'SUBSTITUTED', 'UNAVAILABLE', 'CANCELLED')
  ),
  actual_description TEXT,
  actual_quantity INTEGER,
  actual_unit_price REAL,
  actual_total_price REAL GENERATED ALWAYS AS (
    CASE
      WHEN actual_quantity IS NULL OR actual_unit_price IS NULL THEN NULL
      ELSE actual_quantity * actual_unit_price
    END
  ) STORED,
  variance_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Votes (board + committee + admin; one ballot per voter per grant)
CREATE TABLE IF NOT EXISTS grant_votes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('APPROVE', 'REJECT', 'ABSTAIN')),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (grant_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_grant ON grant_votes(grant_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON grant_votes(voter_id);

-- Audit Log
CREATE TABLE IF NOT EXISTS grant_audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  grant_id TEXT NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grants_cycle_status ON grants(cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_grants_teacher ON grants(teacher_id);
CREATE INDEX IF NOT EXISTS idx_items_grant ON grant_items(grant_id);
CREATE INDEX IF NOT EXISTS idx_audit_grant ON grant_audit_logs(grant_id);
```

Seed `school_years` (`2026-27`, `is_default = 1`) and its Fall/Spring cycles the same way `bhe-pta` seeds `2025-26`. Seed the first admin (`migrations/0002_seed_admin.sql`), then invite everyone else from `/admin`.

Semester remaining is **computed**, not stored. Filter by cycle, or roll up a whole year:

```sql
-- One semester
SELECT
  c.id,
  y.id AS school_year_id,
  y.label AS school_year,
  c.semester,
  c.budget_limit,
  COALESCE(SUM(CASE WHEN g.status = 'PENDING' THEN g.requested_amount ELSE 0 END), 0) AS pipeline_requested,
  COALESCE(SUM(CASE WHEN g.status = 'APPROVED' THEN g.approved_amount ELSE 0 END), 0) AS committed,
  COALESCE(SUM(CASE WHEN g.status IN ('PURCHASED', 'DELIVERED') THEN g.actual_amount ELSE 0 END), 0) AS spent,
  c.budget_limit
    - COALESCE(SUM(CASE WHEN g.status = 'APPROVED' THEN g.approved_amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN g.status IN ('PURCHASED', 'DELIVERED') THEN g.actual_amount ELSE 0 END), 0)
    AS remaining,
  COALESCE(SUM(
    CASE
      WHEN g.status IN ('PURCHASED', 'DELIVERED')
        THEN g.actual_amount - g.approved_amount
      ELSE 0
    END
  ), 0) AS cycle_variance
FROM grant_cycles c
JOIN school_years y ON y.id = c.school_year_id
LEFT JOIN grants g ON g.cycle_id = c.id
WHERE c.id = ?
GROUP BY c.id;

-- All-year rollup (Fall + Spring)
SELECT
  y.id AS school_year_id,
  y.label AS school_year,
  SUM(c.budget_limit) AS budget_limit,
  COALESCE(SUM(CASE WHEN g.status = 'PENDING' THEN g.requested_amount ELSE 0 END), 0) AS pipeline_requested,
  COALESCE(SUM(CASE WHEN g.status = 'APPROVED' THEN g.approved_amount ELSE 0 END), 0) AS committed,
  COALESCE(SUM(CASE WHEN g.status IN ('PURCHASED', 'DELIVERED') THEN g.actual_amount ELSE 0 END), 0) AS spent,
  SUM(c.budget_limit)
    - COALESCE(SUM(CASE WHEN g.status = 'APPROVED' THEN g.approved_amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN g.status IN ('PURCHASED', 'DELIVERED') THEN g.actual_amount ELSE 0 END), 0)
    AS remaining,
  COALESCE(SUM(
    CASE
      WHEN g.status IN ('PURCHASED', 'DELIVERED')
        THEN g.actual_amount - g.approved_amount
      ELSE 0
    END
  ), 0) AS year_variance
FROM school_years y
JOIN grant_cycles c ON c.school_year_id = y.id
LEFT JOIN grants g ON g.cycle_id = c.id
WHERE y.id = ?
GROUP BY y.id;
```

---

## 6. Application Code

Business logic lives in `app/lib/*` as **pure-ish functions that take `db`**. Server Actions and pages call those functions. That is how Kindred and Lil CRM stay testable with Vitest (`vi.mock('cloudflare:workers')` or a mock D1).

### Auth

Copy the Lil CRM pattern: Google OAuth, 7-day httpOnly session cookie, **reject emails that are not already in `users`**.

```ts
// app/lib/auth.ts
import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '~/lib/db';

const SESSION_COOKIE = 'bhe-grants-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type Role = 'teacher' | 'board' | 'committee' | 'treasurer' | 'admin';

export const VOTER_ROLES: Role[] = ['board', 'committee', 'admin'];

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  return (
    (await getDb()
      .prepare(
        `SELECT u.id, u.email, u.name, u.role
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = ? AND s.expires_at > datetime('now')`,
      )
      .bind(sessionId)
      .first<User>()) ?? null
  );
}

export async function requireAuth(): Promise<User> {
  const user = await getSession();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireAuth();
  if (user.role === 'admin') return user;
  if (!roles.includes(user.role)) redirect('/');
  return user;
}
```

OAuth callback (`app/api/auth/callback/route.ts`) mirrors Lil CRM: exchange code → look up `users.email` → if missing, redirect `/login?error=not_authorized` → else `createSession` and redirect `/`.

In development, a `DEV_USER` short-circuit (Lil CRM) is acceptable so local work does not need Google.

### Bindings

```ts
// app/env.d.ts
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES_BUCKET: R2Bucket;
    BROWSER: Fetcher; // Cloudflare Browser Rendering — public wishlist import
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    SESSION_SECRET: string;
    RESEND_API_KEY: string;
    APP_PUBLIC_URL?: string;
  }
}

declare module 'cloudflare:workers' {
  const env: Cloudflare.Env;
  export { env };
}
```

```ts
// app/lib/db.ts
import { env } from 'cloudflare:workers';

export const getDb = () => env.DB;
```

### Budget + fulfillment (unit-tested)

```ts
// app/lib/fulfillment.ts
export type FulfillmentItemInput = {
  id: string;
  item_status: 'PURCHASED' | 'SUBSTITUTED' | 'UNAVAILABLE' | 'CANCELLED';
  actual_quantity?: number | null;
  actual_unit_price?: number | null;
  actual_description?: string | null;
  variance_note?: string | null;
};

export type AdHocItemInput = {
  item_description: string;
  actual_quantity: number;
  actual_unit_price: number;
  variance_note?: string;
};

export const lineActual = (item: FulfillmentItemInput): number => {
  if (item.item_status === 'UNAVAILABLE' || item.item_status === 'CANCELLED') return 0;
  return (item.actual_quantity ?? 0) * (item.actual_unit_price ?? 0);
};

export const sumActuals = (items: FulfillmentItemInput[], adHoc: AdHocItemInput[] = []): number => {
  const lines = items.reduce((sum, item) => sum + lineActual(item), 0);
  const extras = adHoc.reduce((sum, item) => sum + item.actual_quantity * item.actual_unit_price, 0);
  return lines + extras;
};

export const variance = (approved: number, actual: number): number => actual - approved;
```

```ts
// app/lib/budget.ts
export type CycleBudgetSnapshot = {
  id: string;
  school_year_id: string;
  school_year: string;
  semester: 'FALL' | 'SPRING';
  name: string;
  budget_limit: number;
  pipeline_requested: number;
  committed: number;
  spent: number;
  remaining: number;
  cycle_variance: number;
};

export const getCycleBudget = async (db: D1Database, cycleId: string) => {
  return db
    .prepare(
      `SELECT
         c.id, y.id AS school_year_id, y.label AS school_year, c.semester, c.name, c.budget_limit,
         COALESCE(SUM(CASE WHEN g.status = 'PENDING' THEN g.requested_amount ELSE 0 END), 0) AS pipeline_requested,
         COALESCE(SUM(CASE WHEN g.status = 'APPROVED' THEN g.approved_amount ELSE 0 END), 0) AS committed,
         COALESCE(SUM(CASE WHEN g.status IN ('PURCHASED', 'DELIVERED') THEN g.actual_amount ELSE 0 END), 0) AS spent,
         c.budget_limit
           - COALESCE(SUM(CASE WHEN g.status = 'APPROVED' THEN g.approved_amount ELSE 0 END), 0)
           - COALESCE(SUM(CASE WHEN g.status IN ('PURCHASED', 'DELIVERED') THEN g.actual_amount ELSE 0 END), 0)
           AS remaining,
         COALESCE(SUM(
           CASE WHEN g.status IN ('PURCHASED', 'DELIVERED')
             THEN g.actual_amount - g.approved_amount ELSE 0 END
         ), 0) AS cycle_variance
       FROM grant_cycles c
       JOIN school_years y ON y.id = c.school_year_id
       LEFT JOIN grants g ON g.cycle_id = c.id
       WHERE c.id = ?
       GROUP BY c.id`,
    )
    .bind(cycleId)
    .first<CycleBudgetSnapshot>();
};
```

### Server Actions (not a Hono API)

Mutations are Server Actions, Kindred-style: `'use server'`, `requireRole`, `revalidatePath`, return `{ error }` objects instead of throwing for form errors.

```ts
// app/grants/new/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '~/lib/auth';
import { getDb } from '~/lib/db';
import { createGrant } from '~/lib/grants';

export const submitGrantAction = async (formData: FormData) => {
  const user = await requireRole('teacher');
  const db = getDb();

  const items = JSON.parse(String(formData.get('items') || '[]')) as {
    item_description: string;
    quantity: number;
    unit_price: number;
    vendor_url?: string;
    asin?: string;
    source?: 'WISHLIST' | 'MANUAL';
    quote_r2_key?: string;
  }[];

  const result = await createGrant(db, {
    cycleId: String(formData.get('cycle_id') || ''),
    teacherId: user.id,
    gradeLevelSubject: String(formData.get('grade_level_subject') || ''),
    title: String(formData.get('title') || ''),
    impactStatement: String(formData.get('impact_statement') || ''),
    wishlistUrl: String(formData.get('wishlist_url') || '') || null,
    items,
  });

  if ('error' in result) return result;

  revalidatePath('/grants');
  redirect(`/grants/${result.grantId}`);
};
```

```ts
// app/lib/votes.ts
export type Ballot = 'APPROVE' | 'REJECT' | 'ABSTAIN';

export type VoteTally = {
  approve: number;
  reject: number;
  abstain: number;
  notVoted: number;
  quorum: number;
  decided: boolean;
  outcome: 'APPROVED' | 'REJECTED' | null;
};

export const tallyVotes = (
  votes: { vote: Ballot; voterId: string }[],
  eligibleVoterIds: string[],
  teacherId: string,
  quorum: number,
): VoteTally => {
  const eligible = eligibleVoterIds.filter((id) => id !== teacherId);
  const approve = votes.filter((v) => v.vote === 'APPROVE').length;
  const reject = votes.filter((v) => v.vote === 'REJECT').length;
  const abstain = votes.filter((v) => v.vote === 'ABSTAIN').length;
  const decidedNonAbstain = approve + reject;
  const decided = decidedNonAbstain >= quorum && approve !== reject;
  const outcome = !decided ? null : approve > reject ? 'APPROVED' : 'REJECTED';

  return {
    approve,
    reject,
    abstain,
    notVoted: eligible.length - votes.length,
    quorum,
    decided,
    outcome,
  };
};
```

```ts
// app/review/[id]/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '~/lib/auth';
import { getDb } from '~/lib/db';
import { castVote } from '~/lib/votes';

export const castVoteAction = async (formData: FormData) => {
  const user = await requireRole('board', 'committee');
  const vote = String(formData.get('vote') || '');
  if (vote !== 'APPROVE' && vote !== 'REJECT' && vote !== 'ABSTAIN') {
    return { error: 'Invalid vote.' };
  }

  const result = await castVote(getDb(), {
    grantId: String(formData.get('grant_id') || ''),
    voter: user,
    vote,
    comment: String(formData.get('comment') || '') || null,
  });

  if ('error' in result) return result;
  revalidatePath('/review');
  revalidatePath('/budget');
  return { ok: true as const, status: result.status, tally: result.tally };
};
```

```ts
// app/fulfill/[id]/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '~/lib/auth';
import { getDb } from '~/lib/db';
import { fulfillGrant } from '~/lib/grants';

export const fulfillGrantAction = async (formData: FormData) => {
  const user = await requireRole('treasurer');
  const items = JSON.parse(String(formData.get('items') || '[]'));
  const adHocItems = JSON.parse(String(formData.get('ad_hoc_items') || '[]'));

  const result = await fulfillGrant(getDb(), {
    grantId: String(formData.get('grant_id') || ''),
    actor: user,
    vendorName: String(formData.get('vendor_name') || ''),
    trackingNumber: String(formData.get('tracking_number') || '') || null,
    receiptR2Key: String(formData.get('receipt_r2_key') || ''),
    items,
    adHocItems,
    varianceNote: String(formData.get('variance_note') || '') || null,
  });

  if ('error' in result) return result;
  revalidatePath('/fulfill');
  revalidatePath('/budget');
  return {
    ok: true as const,
    actualAmount: result.actualAmount,
    variance: result.variance,
  };
};
```

`createGrant` / `castVote` / `fulfillGrant` own the D1 writes. `castVote` upserts the ballot, retallies, and only then sets `APPROVED` or `REJECTED`. Pages are Server Components that `await requireRole(...)` then load data with `Promise.all`.

### File uploads (Kindred pattern)

No presigned URLs. A client component posts `FormData` to `app/api/uploads/route.ts`. The route calls `requireAuth()`, validates type/size, writes `env.FILES_BUCKET.put(...)`, and returns `{ key }`.

Allowed types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`. Max 10MB. Keys: `quotes/{grantId}/{itemId}-{ts}.ext`, `receipts/{grantId}-{ts}.ext`, `delivery/{grantId}-{ts}.ext`.

### Email (Kindred Resend helper)

```ts
// app/lib/email.ts
export const sendEmail = async ({
  to,
  subject,
  html,
  env,
}: {
  to: string | string[];
  subject: string;
  html: string;
  env: { RESEND_API_KEY: string };
}) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BHE Teacher Grants <grants@bheeagles.com>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error: ${res.status} ${body}`);
  }
};
```

Send from Server Actions after status changes (submitted, vote decided, purchased, delivered). Also remind eligible voters who have not balloted. PTA volume does not need Queues.

### Authenticated layout

```tsx
// app/(app)/layout.tsx
import { Sidebar } from '~/components/sidebar';
import { requireAuth } from '~/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="flex h-full flex-col md:flex-row">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto bg-warm-white">{children}</main>
    </div>
  );
}
```

Sidebar links are role-filtered: teachers see Grants; board and committee see Review + Budget; treasurer sees Fulfill + Budget; admin sees all plus Admin.

---

## 7. Tooling & Deploy

### `package.json` scripts (Lil CRM)

```json
{
  "scripts": {
    "dev": "vinext dev",
    "build": "vinext build",
    "preview": "vinext start",
    "deploy": "pnpm build && wrangler deploy",
    "db:migrate": "wrangler d1 migrations apply bhe-teacher-grants-db --local",
    "db:migrate:remote": "wrangler d1 migrations apply bhe-teacher-grants-db --remote",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b"
  }
}
```

Dependencies match Lil CRM / Kindred: `vinext`, `react` ^19, `@tailwindcss/vite`, `@cloudflare/vite-plugin`, `wrangler` ^4, `vitest`, `@biomejs/biome`. Package manager: **pnpm**.

### `vite.config.ts`

```ts
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import vinext from 'vinext';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
    tailwindcss(),
  ],
});
```

Externalize `cloudflare:workers` for RSC/SSR if the Vinext version requires it (see Lil CRM `CLAUDE.md`).

### `wrangler.jsonc`

```jsonc
{
  "name": "bhe-teacher-grants",
  "compatibility_date": "2026-03-24",
  "assets": {
    "directory": "dist/client"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "bhe-teacher-grants-db",
      "database_id": "<YOUR_CLOUDFLARE_D1_DATABASE_ID>",
      "migrations_dir": "migrations"
    }
  ],
  "r2_buckets": [
    {
      "binding": "FILES_BUCKET",
      "bucket_name": "bhe-teacher-grant-files"
    }
  ],
  "browser": {
    "binding": "BROWSER"
  },
  "vars": {
    "GOOGLE_CLIENT_ID": ""
  }
}
```

Secrets via `wrangler secret put` (never committed): `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `RESEND_API_KEY`. Local secrets in `.dev.vars` (gitignored).

### Coding conventions

**From Lillian (structure):** guard clauses; `??` over `||`; `import type` separate; `type` over `interface`; no enums; no barrel files; named exports; Server Components by default; `Link` / `redirect` / `notFound` / `cookies` from Next shims; parameterized SQL; `{ error }` result objects; `Promise.all` for independent fetches.

**From bhe-pta (this school):** Biome 2-space, 100 columns, single quotes, `bracketSpacing: false`, alphabetized JSX props. Copy `formatUsd`. Money and counts use `tabular-nums`. Tests colocated: `app/lib/fulfillment.test.ts`, `app/lib/budget.test.ts`, `app/lib/votes.test.ts`, `app/lib/wishlist.test.ts`.

---

## 8. Implementation Milestones

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         IMPLEMENTATION ROADMAP                             │
├─────────────────┬──────────────────────────────────────────────────────────┤
│ Phase 1         │ Vinext app skeleton + auth                               │
│ Weeks 1–2       │ • Scaffold Vinext + wrangler.jsonc + D1/R2 bindings      │
│                 │ • users/sessions migrations; Google OAuth allowlist      │
│                 │ • (app) layout + bhe-pta tokens/fonts; login; roster     │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ Phase 2         │ Teacher application flow                                 │
│ Weeks 3–4       │ • School years + Fall/Spring cycle admin                 │
│                 │ • Itemized form; optional Amazon wishlist import         │
│                 │ • Teacher dashboard grouped by year / semester           │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ Phase 3         │ Board + committee voting + cycle budget ledger           │
│ Weeks 5–6       │ • castVoteAction; quorum + majority tally                │
│                 │ • One vote per voter; change allowed while PENDING       │
│                 │ • Year + semester filters; remaining = limit − commit − spent │
│                 │ • Audit log writes from lib/votes.ts                     │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ Phase 4         │ Treasurer actuals + delivery                             │
│ Weeks 7–8       │ • Fulfillment form: requested vs actual columns          │
│                 │ • Per-line actuals, substitutions, unavailable, ad-hoc   │
│                 │ • Variance shown on fulfill + ledger (no approval gate)  │
│                 │ • Receipt upload, tracking, teacher delivery confirm     │
│                 │ • Variance table + CSV export Server Action              │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ Phase 5         │ Resend notifications + launch                            │
│ Weeks 9–10      │ • Status-change emails via app/lib/email.ts              │
│                 │ • Vitest coverage for budget/fulfillment + e2e click-thru│
│                 │ • PTA board + committee sign-off and wrangler deploy     │
└────────────────────────────────────────────────────────────────────────────┘
```

**Phase 2 acceptance criteria (school year + wishlist):**

- A school year `2026-27` can have at most one Fall and one Spring cycle (`UNIQUE (school_year_id, semester)`).
- Teachers can submit only to the `is_active` cycle; past years remain listed, grouped under that year.
- Default filters land on `school_years.is_default`.
- Pasting a fixture public-list URL fills line items; a private/invalid URL keeps the field and asks the teacher to itemize.
- Submitted `requested_amount` matches the reviewed snapshot, not a later Amazon price.

**Phase 3 acceptance criteria (voting):**

- A pending grant with two APPROVE votes and quorum 3 stays `PENDING` and does not commit cycle budget.
- A third APPROVE vote (board or committee) moves it to `APPROVED` and commits `requested_amount`.
- Three REJECT votes (mix of board and committee) move it to `REJECTED`.
- A voter can change APPROVE → REJECT while `PENDING`; the tally updates and can un-decide if it drops below majority.
- The submitting teacher cannot vote on their own grant.
- Teachers see the outcome, not individual ballots.

**Phase 4 acceptance criteria (budget actuals):**

- A grant requested at $180, approved at $180, purchased at $142.17 shows remaining cycle budget increased by $37.83.
- A line marked `UNAVAILABLE` contributes $0 to `actual_amount`.
- A substituted line requires `actual_description` and uses the replacement price.
- Tax/shipping added as ad-hoc lines appear on the receipt tie-out and in `actual_amount`.
- A grant approved at $180 and purchased at $210 is marked `PURCHASED` immediately; remaining cycle budget decreases by the extra $30; the ledger shows +$30 variance with no approval step.
- Export includes school year, semester, requested, approved, actual, and variance per grant.
- Fall 2025–26 and Fall 2026–27 filter independently; All-year for 2026–27 sums Fall + Spring.

---

## Summary Checklist for Deployment

- [ ] `pnpm create` / scaffold Vinext app; `wrangler d1 create bhe-teacher-grants-db` and R2 bucket.
- [ ] Bind `DB`, `FILES_BUCKET`, and `BROWSER` in `wrangler.jsonc`; put secrets; add `.dev.vars`.
- [ ] `pnpm db:migrate` then `pnpm db:migrate:remote`; seed first admin and the current school year + Fall/Spring cycles.
- [ ] Google OAuth client with callback `/api/auth/callback`; invite users before they can sign in.
- [ ] Confirm UI uses BHE tokens (eagle-blue / spirit-gold / warm-white / Montserrat + Inter), not Current Forward cream/navy.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm deploy`.
- [ ] Test end-to-end: **Itemize (no wishlist) → vote → treasurer records actuals → teacher confirms**.
- [ ] Test optional path: **Paste public wishlist → review snapshot → vote → treasurer buys from list**.
- [ ] Verify a grant with only typed lines and no `wishlist_url` submits; a private/non-Amazon URL does not invent line items.
- [ ] Verify a single board or committee vote does **not** approve or reject a grant.
- [ ] Verify cycle remaining uses **actuals** after purchase, not the original teacher estimate.
- [ ] Verify an over-approved purchase still records as `PURCHASED` and shows variance on the ledger (no confirmation step).
- [ ] Verify lists and the ledger filter by school year and semester, and that a prior year’s grants still load.
