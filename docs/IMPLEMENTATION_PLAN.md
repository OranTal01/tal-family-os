# Implementation Plan & Status

Phases map to logical commits. Status legend: ☐ pending · ◐ in progress · ☑ done.

## Phase 1 — Repository & documentation ☑ (`fa858b1`)
- ☑ Repository audit (Next 16.2.10, Tailwind v4, shadcn v4/base-ui, next-themes)
- ☑ Design docs fully extracted (tokens, 14 screens, 24 components, UX rules, copy)
- ☑ CLAUDE.md, README.md, PRODUCT_SPEC.md, ARCHITECTURE.md, DATA_MODEL.md, this file

## Phase 2 — Foundation ☑ (`d4cef44`)
- ☑ Deps: zod, date-fns, material-symbols, server-only; dev: vitest + testing-library
- ☑ Scripts: typecheck / test / test:watch
- ☑ components.json → `"rtl": true`; 16 shadcn primitives generated
- ☑ Calm Financial tokens in globals.css (Light/Dark) + Tailwind `@theme` mapping
- ☑ Assistant font, Material Symbols `<Icon>` wrapper
- ☑ lib/routes.ts registry; AppShell (Sidebar 206px / TopBar+MonthSelector / BottomNav + MoreSheet)
- ☑ `/` → `/dashboard` redirect; theme switcher; 14 route stubs

## Phase 3 — Finance design system ☑ (`b3173ee`)
- ☑ Amount, StatusBadge, KpiCard (+future dashed), CategoryRing (RTL SVG), SectionCard
- ☑ CashflowBar, ProgressBar, TransactionRow, ReviewCard, InsightCard, AlertBanner
- ☑ EmptyState (first-use/filtered/all-clear), skeletons, SyncStatus
- ☑ Responsive Modal/BottomSheet host (ResponsiveDetail), Toast (RTL sonner)

## Phase 4 — Domain + engine ☑ (`8524231`)
- ☑ types/ domain models (branded Agorot)
- ☑ mocks/ coherent dataset relative to the real current date (household, 8 accounts,
      19 categories incl. archived, 3 months txns, installments, balanced transfers,
      Bit/PayBox business income, expected flows, 4 review items, rules, wealth)
- ☑ lib/finance/ pure engine (filters, income, spending, budgets, projections,
      installments, business+VAT info, net worth, daily summary, insights)
- ☑ 37 Vitest tests green — all §17 required cases + cross-screen consistency guards

## Phase 5 — Screens ☑ (`3d035a3`, `21a265c`, `f778f8e`, loading/error follow-up)
- ☑ 5a: /dashboard, /budget (+ shared category detail sheet/modal, ring grid,
      server view-models in server/data/views.ts, loading+error states)
- ☑ 5b: /transactions, /transactions/review (+ txn detail, "זכור כלל זה",
      CSV export, resolution sheet, loading+error states)
- ☑ 5c: /planning, /split, /business, /assets, /insurance, /goals, /kids,
      /accounts, /daily, /settings — all implemented with loading.tsx + error.tsx
      added in the validation follow-up (all 10 initially shipped without them)
- All 14 screens now ship default + loading (skeleton matching real layout) +
  empty (where applicable) + error state, mobile + desktop, handoff copy

## Phase 6 — Validation ☑
- ☑ lint · typecheck · test (37/37) · build all green
- ☑ All 14 routes verified 200 via curl smoke test
- ☑ Visual review via headless Chrome screenshots: dashboard/budget (light+dark,
      desktop+mobile), transactions/review/planning/split/accounts/daily (desktop) —
      RTL mirroring confirmed (sidebar on the right, ring progress direction, month
      stepper arrows), no color-only status anywhere, no horizontal overflow observed
- ☑ README + this file updated
- ☐ Full keyboard-navigation pass and Light/Dark parity across all 14 screens not
      individually screenshotted — spot-checked only (dashboard + budget in both
      themes); recommend a manual pass before shipping to production

## Phase 7 — Real household data ◐

- ☑ Supabase-backed reads for all 14 Finance screens; fixture repository removed
- ☑ Persistent XLSX import for FIBI, CAL, and Isracard with learned merchant rules
- ☑ Recurring-expense classification and persisted planning rows
- ☑ Bank-reported balance snapshots; monthly card settlements excluded from spending
- ☑ Sample source files and local finance seed removed
- ☐ Persist budget edits, expected-payment creation, goal contributions, and preferences
- ☐ Add licensed Open Banking and pension/insurance data providers

## Deferred (documented decisions)
- TanStack Query, Playwright e2e, charting library, real bank sync,
  notification provider, transaction splits UI, accountant role, multi-currency.
