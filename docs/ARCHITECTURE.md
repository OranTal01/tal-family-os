# The Tal Family OS — Architecture

## Stack (verified against the repo — inspect `package.json`, don't assume)

- **Next.js 16.2.10**, App Router. ⚠️ This version differs from most training data —
  consult `node_modules/next/dist/docs/` before using unfamiliar APIs. Known: `params` /
  `searchParams` are **Promises** (`await params`), `proxy.ts` replaces middleware,
  standard `page/layout/loading/error` conventions apply.
- **React 19.2.4**, TypeScript strict, `noEmit` typecheck.
- **Tailwind CSS v4** (CSS-first config via `@theme` in `globals.css`; no tailwind.config).
- **shadcn/ui v4**, style `base-nova`, built on **@base-ui/react** (not Radix).
  Components generated into `src/components/ui`. `components.json` has `"rtl": true`.
- **next-themes** (`attribute="class"`, Light default theme in design, System supported).
- **Fonts**: Assistant (Hebrew) via `next/font/google`. Icons: **Material Symbols
  Rounded** self-hosted via the `material-symbols` package, wrapped by
  `src/components/ui/icon.tsx` (`aria-hidden` by default).
- **zod** (form/external validation), **date-fns** (date math; `Intl`/hand-rolled Hebrew
  labels for display), **Vitest + Testing Library** (jsdom).

### Deliberately deferred (do not add without need)

- **TanStack Query** — data flows from repository interfaces into Server Components; a
  client cache earns its keep only with a live Supabase backend + mutations.
- **Charting library** — the only visualizations are the stacked cashflow bar and SVG
  rings/progress bars; hand-rolled accessible SVG is smaller and matches the design exactly.
- **Playwright** — planned for the Supabase phase; current quality gate is unit +
  component tests + lint + typecheck + build.
- **Supabase client** — architecture is Supabase-*ready* (see DATA_MODEL.md and the
  repository interfaces); no client installed until real persistence begins.

## Folder structure

```
src/
  app/                    # Routes only — thin files that compose feature sections
    layout.tsx            # he/RTL root, Assistant font, ThemeProvider
    page.tsx              # redirect → /dashboard
    (finance)/            # route group: all screens share the AppShell layout
      layout.tsx          # AppShell
      dashboard/ budget/ transactions/ transactions/review/ planning/ split/
      business/ assets/ insurance/ goals/ kids/ accounts/ daily/ settings/
        page.tsx loading.tsx [error.tsx]
  components/
    ui/                   # shadcn primitives + icon.tsx (generated/adapted)
    shell/                # Sidebar, TopBar, BottomNav, MoreSheet, PageContainer, …
    finance/              # design-system components (KpiCard, CategoryRing, …)
  features/<screen>/      # screen-level sections; server components by default
  lib/
    finance/              # PURE calculation engine — no I/O, no React
    format/               # currency/date/number formatting (single source)
    routes.ts             # route map + nav registry (labels, icons, badges)
    utils.ts              # cn()
  server/data/            # repository interfaces + mock implementation
  mocks/                  # typed seed dataset (single source of all demo data)
  types/                  # domain models (branded Agorot, entities)
  schemas/                # zod schemas for forms/external data
  test/                   # vitest setup
```

## Principles

1. **Server Components by default.** Client components only for interaction (theme
   switcher, tabs, sheets, month selector, forms). Keep client leaves small; pass data down
   from server sections.
2. **Domain logic never lives in components.** All financial math is pure functions in
   `src/lib/finance/`, unit-tested, operating on **integer agorot** (branded `Agorot`
   type). Screens render engine output; they never compute or hardcode totals — this is
   what keeps every screen mathematically consistent with every other.
3. **Money is never floating point.** `Agorot = number & { brand }` integers in TS;
   `bigint` minor units in Postgres. Display formatting (rounding to shekels, ₪ prefix,
   tabular numerals, LTR embedding) happens only in `lib/format/currency.ts`.
4. **Repository interfaces isolate persistence.** `server/data/*` exposes e.g.
   `getMonthSnapshot(month)`, `getTransactions(filter)`, backed today by `src/mocks/`;
   the Supabase implementation later swaps in behind the same interfaces. UI and engine
   never import mock files directly.
5. **Design tokens are CSS custom properties** in `globals.css` (`:root` = Light, `.dark`
   = Dark), exposed to Tailwind via `@theme inline` (e.g. `text-pos`, `bg-warn-soft`).
   Components never hardcode hex values; shadcn semantic vars are mapped onto the same
   palette.
6. **RTL via logical properties only** (`ms-*`, `me-*`, `ps-*`, `pe-*`, `inset-inline-*`,
   `text-start`…). Physical `left/right`, `ml/mr/pl/pr` utilities are forbidden in
   app code. Directional icons flip; time-forward = left.
7. **Centralized routes** in `lib/routes.ts` — nav components, deep links and breadcrumbs
   all read from the one registry.
8. **Modals/sheets**: one responsive pattern — same content renders in a bottom sheet
   (<1024px) or centered dialog (≥1024px).
9. **Future modules** (calendar, tasks…) mount as additional route groups + `features/`
   folders; Finance shares nothing module-specific through globals.

## Theming

- next-themes with `attribute="class"`, `defaultTheme="system"`, Light as the design's
  primary. The `.dark` class swaps token values only — structure, spacing, hierarchy and
  typography are identical. Dark elevation = lighter surface + subtle border + soft shadow.
- The Settings screen's segmented control (בהיר / כהה / מערכת) is the canonical consumer.

## Daily summary service

`lib/finance/daily-summary.ts` builds a `DailySummary` model from repository data (pure).
The `/daily` screen renders it. Delivery scheduling (21:30 Asia/Jerusalem) is specified as
an interface (`NotificationScheduler`) with a no-op implementation; a real provider (e.g.
Supabase cron + push) plugs in later. No paid provider is assumed.

## Security posture (mock phase, but no insecure normalization)

- No secrets in the repo; `.env.example` documents future variables.
- Server-only code stays out of client bundles (`server/` modules; no secret exposure).
- Never store bank passwords/CVV; never log raw financial payloads.
- Supabase later: RLS on `household_id` for every table (see DATA_MODEL.md), storage
  upload sanitization, zod validation at every external boundary, error messages free of
  sensitive data.

## Validation commands

```bash
npm run lint        # eslint (flat config)
npm run typecheck   # tsc --noEmit
npm run test        # vitest run
npm run build       # production build — must pass before declaring work complete
```
