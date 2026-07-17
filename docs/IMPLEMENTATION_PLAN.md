# Implementation Plan & Status

Phases map to logical commits. Status legend: ☐ pending · ◐ in progress · ☑ done.

## Phase 1 — Repository & documentation ◐
- ☑ Repository audit (Next 16.2.10, Tailwind v4, shadcn v4/base-ui, next-themes)
- ☑ Design docs fully extracted (tokens, 14 screens, 24 components, UX rules, copy)
- ◐ CLAUDE.md, README.md, PRODUCT_SPEC.md, ARCHITECTURE.md, DATA_MODEL.md, this file

## Phase 2 — Foundation ☐
- ☐ Install deps: zod, date-fns, material-symbols; dev: vitest + testing-library
- ☐ Scripts: typecheck / test / test:watch
- ☐ components.json → `"rtl": true`; add shadcn primitives
- ☐ Calm Financial tokens in globals.css (Light/Dark) + Tailwind `@theme` mapping
- ☐ Assistant font, Material Symbols `<Icon>` wrapper
- ☐ lib/routes.ts registry; AppShell (Sidebar 206px / TopBar / BottomNav + MoreSheet)
- ☐ `/` → `/dashboard` redirect; theme switcher

## Phase 3 — Finance design system ☐
- ☐ Amount, StatusBadge, KpiCard (+future dashed), CategoryRing (RTL SVG), RingGrid
- ☐ CashflowBar, ProgressBar, TransactionRow, ReviewCard, InsightCard, Alert
- ☐ EmptyState (first-use/filtered/all-clear), skeletons, MonthSelector, SyncStatus
- ☐ Responsive Modal/BottomSheet host, Toast (RTL sonner)

## Phase 4 — Domain + engine ☐
- ☐ types/ domain models (branded Agorot)
- ☐ mocks/ coherent dataset (household, 6 accounts, categories, 3 months txns,
      installments, transfers, business income incl. Bit/PayBox, expected txns,
      review items, rules, assets, insurance, goals)
- ☐ lib/finance/ pure engine (income, spending, budgets, projections, installments,
      transfers, business, net worth, daily summary)
- ☐ Vitest coverage for all §17 required cases

## Phase 5 — Screens ☐
- ☐ 5a: /dashboard, /budget (+ category detail sheet)
- ☐ 5b: /transactions, /transactions/review (+ txn detail, "זכור כלל זה")
- ☐ 5c: /planning, /split, /business, /assets, /insurance, /goals, /kids,
      /accounts, /daily, /settings
- Every screen: default + loading + empty + error, mobile + desktop, handoff copy

## Phase 6 — Validation ☐
- ☐ lint · typecheck · test · build all green
- ☐ RTL / Light / Dark / responsive / keyboard review; consistency test across screens
- ☐ README + this file updated; final report

## Deferred (documented decisions)
- TanStack Query, Supabase client, Playwright e2e, charting library, real bank sync,
  notification provider, transaction splits UI, accountant role, multi-currency.
