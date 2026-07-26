# Tal Family OS - Agent Instructions

## Product

Tal Family OS is a private, Hebrew-first, RTL-first family finance application for
Oran and Danielle Tal. The Finance module is the only active module. Its visual
direction is "Financial Calm": trustworthy, quiet, premium, and non-judgmental.

The end state is a real household finance system, not a demo dashboard. It must support
accounts, categories, transactions, budgets, adjustments, installments, recurring and
expected flows, review/classification, business separation, wealth, insurance, goals,
child savings, import, export, and backup.

## Current State

- All 14 Finance screens and their responsive/loading/error states exist.
- Screen data still comes from the typed mock database through `src/server/data/`.
- The deployed Supabase schema has 25 public Finance tables. All five local migrations
  are present in the linked remote migration history.
- RLS is enabled by migration on every public table. Composite foreign keys enforce
  same-household references.
- Supabase browser/server clients, session refresh, private email/password login, logout,
  route protection, generated database types, and the profile bootstrap trigger exist.
- There is no public signup UI. Verify that hosted Auth signup is disabled before
  production use; local `supabase/config.toml` currently permits email signup.
- No production household membership or `people.profile_id` linkage is set up for Oran
  or Danielle. No real financial data is in use.
- A local, unapplied migration makes `create_household` retry-safe and the application
  now has a first-owner household setup flow. The linked remote database still has the
  older RPC until the user explicitly approves applying the new migration.
- There are no real Finance CRUD mutations or Supabase Finance repository adapters yet.
  Several UI actions intentionally update local client state or show demo toasts.
- The chosen initial ingestion path is CSV/XLSX import. Paid Open Finance integration
  and bank scraping are deferred.

Read `docs/CODEX_HANDOFF.md` for the audited status, known inconsistencies, and ordered
implementation roadmap.

## Sources of Truth

Use the following priority:

1. The user's current request and explicit product decisions.
2. This file and `docs/CODEX_HANDOFF.md` for current engineering status.
3. `CLAUDE.md` for established engineering and design constraints.
4. `docs/PRODUCT_SPEC.md` for product behavior and copy.
5. `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md` for intended architecture and schema
   rationale, while accounting for the status drift recorded in `CODEX_HANDOFF.md`.
6. `docs/design-system-and-mvp.pdf` and the companion `.dc.html` files for visual truth.
   `docs/product-design-handoff.pdf` is currently damaged; use its `.dc.html` companion
   and `PRODUCT_SPEC.md` until the PDF is regenerated.
7. Migrations and generated database types for the actual database contract.
8. Existing tests and implementation.

Before modifying product UI, inspect the relevant rendered design and exact Hebrew copy.
Do not replace Financial Calm with generic dashboard styling.

## Next.js and Stack Rules

This is Next.js 16.2.12 and may differ from prior Next.js knowledge. Before changing
Next.js APIs, conventions, routing, caching, Server Functions, or proxy behavior, read
the relevant guide under `node_modules/next/dist/docs/` and follow deprecation notices.

- React 19.2.4, TypeScript strict, npm.
- Tailwind CSS v4 is CSS-first through `src/app/globals.css`; there is no
  `tailwind.config`.
- shadcn/ui v4 uses `@base-ui/react`, not Radix. `components.json` is RTL-enabled.
- Server Components are the default. Keep Client Components as small interactive leaves.
- Use Material Symbols through `src/components/ui/icon.tsx`; do not add a second app icon
  system.
- Use CSS logical properties and logical Tailwind utilities only. Do not introduce
  `left`/`right`, `ml`/`mr`, `pl`/`pr`, or physical inset utilities in app code.

## Architecture Rules

- UI must not import `src/mocks/` directly. All data access goes through
  `src/server/data/`.
- Replace mock persistence gradually, by a small repository/domain slice. Do not rewrite
  every repository or every route in one change.
- Keep database rows, domain models, calculation inputs, and serializable view models as
  explicit layers. Add tested row-to-domain mappers instead of leaking generated row
  shapes throughout components.
- Keep routes centralized in `src/lib/routes.ts`.
- Keep financial math pure and outside React in `src/lib/finance/`.
- Keep all money in integer agorot. PostgreSQL uses `bigint`; TypeScript uses branded
  `Agorot`. Never use floating-point shekel values.
- Reuse the Finance and shell components before creating new variants.
- Archive historical entities instead of hard-deleting them.
- Preserve existing cross-household composite foreign keys, RLS, RPC-only transfer
  writes, and append-only audit records.

## Financial Invariants

- Internal transfers never count as income, expense, budget use, or profit.
- ATM withdrawal is a transfer from bank to cash; the later cash payment is the expense.
- Only an installment entry due in the viewed month counts in that month's spending.
- Refunds reduce spending in the month in which the refund occurred.
- Business expenses and household expenses never mix. Business income may contribute to
  family income while retaining business context.
- Guaranteed and uncertain income are never presented as the same thing.
- Budget totals are derived from items, and budget changes retain an audit trail.
- Assets minus liabilities equals net worth.
- Financial meaning is never communicated by color alone.

## Authentication, RLS, and Secrets

- The application is private. Do not add public signup.
- Never put a Supabase service-role key in browser code or repository configuration.
- Never commit secrets. Only the publishable Supabase URL/key pair belongs in browser
  configuration.
- Never store or request banking usernames, passwords, one-time codes, CVVs, or scraping
  credentials.
- Do not bypass RLS to make a feature work. Resolve membership and policy design instead.
- Every user-scoped Finance query must derive its household from the authenticated
  profile's membership; never accept an unchecked household ID from the browser.
- Mutations must validate input server-side and rely on RLS/composite FKs as a second
  boundary.
- Do not create users, insert production data, or apply hosted database changes unless
  explicitly requested.

## Schema Migration Rule

Before creating a migration, explain:

- why the current schema cannot support the requirement;
- every table, column, constraint, index, function, trigger, and policy to be added or
  changed;
- data migration and rollback implications;
- household-isolation and RLS behavior;
- Supabase Free plan/storage impact.

Do not apply a migration to the hosted database unless the user explicitly requests it.
Regenerate `src/types/database.generated.ts` after an approved schema change.

## Import and Export Strategy

- Initial ingestion is provider-independent CSV and XLSX.
- Required flow: upload -> parser selection -> normalization -> validation -> account
  matching -> duplicate detection -> Hebrew preview -> atomic commit -> import history.
- Every committed import must be attributable to an import batch and support safe
  rollback.
- Preserve source values needed for audit without logging sensitive raw payloads.
- Keep a provider adapter boundary so a future Open Finance provider can feed the same
  normalization pipeline.
- Do not implement paid Financy/Open Finance access or bank website scraping without a
  new explicit decision.
- Treat spreadsheet formulas, malformed encodings, oversized files, and CSV injection as
  untrusted input concerns.

## Quality and Workflow

- Inspect existing code and local Next.js documentation before editing.
- Preserve unrelated user changes.
- Do not weaken or skip TypeScript, ESLint, tests, RLS, or security checks.
- Add tests with each repository mapper, financial rule, mutation, import parser, and
  authorization boundary.
- Keep changes small and reviewable.
- Do not push to GitHub or modify the hosted database unless explicitly requested.
- Keep Supabase Free plan limits in mind; avoid unnecessary storage, polling, and large
  unbounded reads.

Before declaring implementation work complete, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

For database work, also add and run proportionate local migration/RLS tests before any
remote application.
