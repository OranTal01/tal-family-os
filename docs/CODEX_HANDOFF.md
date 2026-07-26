# Tal Family OS - Codex Handoff Audit

Audit date: 2026-07-24

Audited commit: `848d5e9a4fa891063c7a2d2bcae27c551fcdc605`

Branch at audit start: `main`, tracking `origin/main`

Implementation update: 2026-07-26

- The audited first implementation task is complete locally: membership-aware Finance
  entry, first-owner setup UI, validated Server Action, and a retry-safe household RPC
  migration.
- The second implementation task is also complete locally: private owner-created
  household invitations, exact-verified-email acceptance, real household people in
  Settings, and pending invitation management.
- The first real-data ingestion slice is complete locally: authenticated, bounded,
  in-memory XLSX preview for FIBI, CAL, and Isracard with source detection, signed
  agorot, pending/transfer/context warnings, and deterministic within-file duplicate
  fingerprints. It does not persist files or transactions.
- Import classification reflects the real account usage: Danielle's credit cards are
  mixed household/business, while the shared FIBI account receives possible Danielle
  business income through Bit and bank transfer. Danielle card rows and shared-account
  credits therefore require transaction-level context confirmation. Oran confirmed that
  both Danielle payment channels land in this same shared account.
- The new migration has not been applied to the linked remote database and the
  application changes have not been deployed.
- The current local validation baseline is 18 Vitest files / 100 tests plus 45 passing
  pgTAP household/bootstrap/invitation tests.

## 1. Purpose

Tal Family OS is a private family operating system for Oran and Danielle Tal. The first
and currently only active module is Finance: a Hebrew-first, RTL-first application that
should become the household's real financial system.

The product aims to provide one calm and reliable view of household finances while
keeping Danielle's business expenses rigorously separate. It covers monthly cash flow,
budgeting, classification and review, future commitments, assets and liabilities,
insurance, goals, child savings, and eventually import, backup, and export.

The design language is Financial Calm. Product behavior and Hebrew copy are defined in
`PRODUCT_SPEC.md` and the rendered design sources.

## 2. Audit Scope and Evidence

The audit inspected:

- Git state, branch tracking, recent history, and the authentication commits;
- package scripts, dependencies, TypeScript, ESLint, Vitest, and Next.js configuration;
- all app routes and route registry;
- domain and money types;
- the pure Finance engine and its tests;
- mock data, repository entry points, and server view-model assembly;
- all five Supabase migrations, local seed, generated database types, and linked remote
  migration history;
- Supabase browser/server clients, proxy session refresh, DAL, login/logout, route guard,
  profile handling, and authentication tests;
- Markdown documentation, both `.dc.html` design sources, and rendered PDFs.

No users were created, no financial data was inserted, no hosted database state was
modified, and no repository adapter was replaced during this audit.

## 3. Repository State

At audit start:

- working tree: clean;
- branch: `main`;
- `HEAD`: `848d5e9`, equal to `origin/main`;
- local-only commits: none;
- remote-only commits: none.

Authentication is committed and pushed:

- `d332710` - private authentication and route protection;
- `848d5e9` - keep a missing Supabase environment from failing `next build`.

The preceding database/client commits are also in `origin/main`:

- `b9c3f68` - Finance schema, integrity triggers, RPCs, RLS, and seed;
- `de7ba47` - Supabase dependencies;
- `45ee63f` - Supabase client foundation.

This handoff changes only `AGENTS.md` and adds `docs/CODEX_HANDOFF.md`.

## 4. Current Implementation Status

### Product UI

- All 14 specified Finance routes exist:
  `/dashboard`, `/budget`, `/transactions`, `/transactions/review`, `/planning`,
  `/split`, `/business`, `/assets`, `/insurance`, `/goals`, `/kids`, `/accounts`,
  `/daily`, and `/settings`.
- `/` redirects to `/dashboard`; `/login` is the only public application route.
- Finance routes share the protected App Shell.
- Responsive desktop/mobile layouts, Hebrew RTL, Light/Dark/System theming, loading
  states, and error boundaries are implemented.
- The transaction and review screens have client-side demo interactions. Those changes
  are not persisted.
- Transactions can export the currently filtered in-memory rows to a CSV file. This is
  not a complete backup/export subsystem.
- Transactions now have a private-app XLSX upload dialog. The authenticated Server
  Action reads a bounded workbook in memory and returns a Hebrew review preview with
  transaction-level context, kind, and income-class controls. No raw file or transaction
  is stored; review choices remain client-side until the persistence model is approved.

### Domain and calculation engine

- Money is represented as branded integer `Agorot`.
- Pure functions cover income, spending, refunds, transfers, budget status, projections,
  installments, business/VAT display, net worth, daily summary, and insights.
- Tests cover the core invariants, including transfer exclusion, monthly installment
  portions, refund credits, business separation, budget adjustment behavior, and net
  worth.
- The mock dataset is generated relative to the current date and is guarded by
  cross-screen consistency tests.

### Data access

- `src/server/data/repository.ts` is the single mock entry point, but it currently returns
  the entire `FinanceDb`.
- `src/server/data/views.ts` builds screen-specific serializable view models and invokes
  the Finance engine.
- UI code does not directly import the mock database.
- There are no granular Finance repository interfaces or Supabase Finance adapters yet.
- Live identity/context queries now cover the authenticated profile and its first
  household membership. Finance screen repositories remain mock-backed.

### Database

- The local schema contains the original 25 public Finance tables plus
  `household_invitations`, matching the regenerated TypeScript types.
- Generated types expose the original household/transfer RPCs plus invitation creation,
  safe exact-email lookup, atomic acceptance, and owner revocation.
- Money columns use PostgreSQL `bigint` agorot. Transaction amounts are signed.
- Composite foreign keys prevent cross-household references.
- Integrity triggers enforce transfer pairs, installment linkage, review flags, goal
  totals, last-owner protection, and archive-before-delete behavior.
- RLS is enabled by migration for all 25 public tables. `anon` has no table/function
  access. Viewers are read-only; owners/members receive scoped writes.
- Internal transfers are client-read-only and can be written only through atomic RPCs.
- The linked remote database still has the original five migration versions:
  `20260718090000` through `20260718090400`.
- Local migration `20260726090000` hardens first-owner bootstrap. It serializes calls by
  locking the authenticated profile, returns an existing membership on retry, and
  atomically creates the owner membership plus linked adult `people` row on first use.
  It has not been applied remotely.
- Local migration `20260726110000` adds expiring normalized-email invitations. Owners
  can list them under RLS, while all writes and invitee lookup/acceptance go through
  narrow security-definer RPCs that derive identity from `auth.uid()` and the verified
  Auth email. It has not been applied remotely.
- The remote migration history was verified read-only. The live catalog was not otherwise
  changed or reseeded.

### Authentication

- Browser and per-request server Supabase clients use only the publishable URL/key.
- The root Next.js proxy refreshes/verifies sessions and protects every route except
  `/login`.
- The Finance layout performs a second trusted `getUser()` check close to data access.
- Login uses email/password, has Hebrew validation and generic credential errors, and
  sanitizes post-login redirects.
- Logout is implemented.
- A database trigger creates `public.profiles` rows for new Auth users.
- There is no signup UI.
- A missing profile produces a recoverable error view with logout.
- The Finance layout now requires household membership before showing the App Shell.
  A profile without membership sees the calm Hebrew first-owner setup screen.
- The setup Server Action revalidates authentication/profile/membership, validates the
  fixed household name, calls the authenticated RPC, and redirects to `/dashboard`.
- Owners can register, renew, list, and revoke a pending invitation from Settings.
- A profile without membership sees an exact-email invitation before it is offered a new
  household. Acceptance atomically creates membership and a linked adult person.
- The private app does not send invitation email automatically yet; the invited Auth
  account must still be created through an explicitly authorized administrative step.

### Tests

- 18 Vitest files;
- 100 passing tests;
- Finance engine, mock consistency, currency formatting, login validation, redirect
  safety, proxy route decisions, login/logout UI, Finance layout access states, setup UI,
  and setup Server Action states are covered.
- Two pgTAP files add 45 passing local database tests for bootstrap plus invitation
  ownership, RLS visibility, exact-email matching, expiry/revocation, atomic acceptance,
  retry safety, linked-person creation, and direct-write denial.
- Synthetic import tests cover CAL, FIBI, and Isracard shapes, signed amounts, refunds,
  pending rows, cash/card-settlement transfer warnings, Danielle context confirmation,
  zero rows, rich/empty OOXML compatibility, duplicate fingerprints, authenticated
  upload validation, dialog accessibility, and interactive context/income
  classification.
- All five user-provided real exports passed a temporary local production-parser smoke
  test. That test and the files were not retained in the repository.

There are no comprehensive executable RLS policy tests, Supabase integration tests,
or authenticated browser E2E suite yet.

## 5. Completed Work

The repository has completed four broad foundations:

1. **Design and mock product**
   - Financial Calm design system;
   - application shell and all 14 screens;
   - typed mock dataset and calculation engine;
   - responsive/loading/error states.

2. **Database foundation**
   - 25-table PostgreSQL schema;
   - indexes, constraints, functions, triggers, RPCs, RLS, and local seed;
   - deployed migration history;
   - generated TypeScript database types.

3. **Supabase client foundation**
   - browser/server clients;
   - environment handling;
   - session-refresh proxy;
   - trusted session/profile DAL.

4. **Private authentication**
   - email/password login and logout;
   - route protection and safe redirects;
   - profile bootstrap;
   - authentication unit/component tests.

5. **First-owner household bootstrap (local, not deployed)**
   - cached membership-aware DAL;
   - calm Hebrew setup and load/action failure states;
   - authenticated validated Server Action;
   - retry-safe atomic RPC migration;
   - Vitest and pgTAP coverage.

6. **Private household invitations (local, not deployed)**
   - owner-only invitation dialog and pending-invitation management;
   - safe verified-email invitation discovery and calm acceptance/expiry screens;
   - atomic membership plus linked-adult acceptance RPC;
   - real household people in Settings instead of mock Oran/Danielle rows;
   - Vitest and pgTAP authorization/integrity coverage.

7. **Provider-neutral XLSX import preview (local, not deployed)**
   - server-only XLSX compatibility and bounded archive parsing;
   - source profiles for shared FIBI, CAL, and Isracard;
   - integer signed agorot, dates/currencies/account hints, pending/refund/transfer
     semantics, and deterministic fingerprints;
   - authenticated preview-only Server Action and Hebrew dialog;
   - synthetic parser/action/component tests and ephemeral smoke checks against all five
     real exports.

## 6. Baseline Validation

Run on the audited commit:

| Command | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test` | Pass - 8 files, 62 tests |
| `npm run build` | Pass - 19 pages generated/collected |

The first sandboxed build could not reach Google Fonts for the configured Assistant
font. The same build passed with network access. This is an environment restriction, not
an application build defect.

Required implementation gate:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Database changes additionally require local migration and RLS verification proportional
to the change.

Implementation validation on 2026-07-26:

| Command | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test` | Pass - 18 files, 100 tests |
| `npm run build` | Pass - 19 pages generated/collected |
| `supabase db reset` | Pass - all seven local migrations applied |
| `supabase test db` | Pass - 2 files, 45 tests |
| Browser verification | Pass - private-route redirect, desktop/mobile login content, no overflow/error overlay/console errors |

The authenticated invitation screens are covered by component and database tests. A
browser E2E using real local Auth users was not run because repository policy requires
explicit user authorization before any user creation, including disposable local users.
The import browser flow reached the expected login boundary with a 200 response, no
console errors, and no framework overlay. Authenticated visual submission was not run
because neither controlled browser held a local login session; parser, action, and dialog
boundaries are covered separately.

## 7. Financial Invariants

These rules are non-negotiable across imports, storage, repositories, calculations, and
UI:

1. Money is integer agorot end to end. Never store or calculate financial values as
   floating-point shekels.
2. Internal transfers never count as income, expense, budget use, or business profit.
3. ATM withdrawal is a bank-to-cash transfer; the later cash payment is the expense.
4. Only the installment entry due in a viewed month counts in that month's spending.
5. Refunds reduce spending in the month in which the refund occurred.
6. Household and business expenses never mix. Business income may contribute to family
   income but retains business context.
   Danielle's card ownership and the shared FIBI account do not establish transaction
   context; Bit and bank transfer are payment channels, not classification signals.
7. Guaranteed and uncertain income remain distinct.
8. Budget totals are derived; adjustments are auditable and do not rewrite spending
   history.
9. Referenced entities with history are archived, not hard-deleted.
10. Net worth is assets minus liabilities.
11. Financial status is always communicated with text/icon/sign as well as color.

## 8. Architectural Constraints

- Server Components fetch data; Client Components own only the interaction that requires
  browser state.
- Finance calculations remain pure in `src/lib/finance/`.
- Persistence remains behind `src/server/data/`; screens do not import mocks or Supabase
  directly.
- The mock-to-Supabase transition must be incremental by domain/read model.
- Generated Supabase row types are not UI models. Add explicit validated mappers to
  domain/calculation/view types.
- Household context comes from authenticated membership, not a browser-supplied trusted
  ID.
- Routes remain centralized in `src/lib/routes.ts`.
- UI remains Hebrew-first, RTL-first, logical-properties-only, and token-driven.
- This Next.js version must be implemented against `node_modules/next/dist/docs/`, not
  remembered conventions.
- Supabase Free plan limits must influence file retention, import staging, query bounds,
  polling, and backup design.

## 9. Security Rules

- Do not add public signup.
- Verify hosted Auth signup is disabled before production use.
- Never expose or use a service-role key in browser code.
- Never commit secrets or raw production financial files.
- Never store bank usernames, passwords, one-time codes, CVVs, or scraping credentials.
- Do not scrape bank websites.
- Validate all mutation and import inputs server-side.
- Preserve RLS, grants, composite household foreign keys, and RPC-only transfer writes.
- Do not accept unchecked household IDs from client payloads.
- Avoid logging raw imported rows or sensitive account descriptions.
- Imported files require type/size limits, formula/CSV-injection defenses, bounded
  parsing, and clear Hebrew errors.
- Hosted database writes, user creation, and production data insertion require explicit
  authorization.

## 10. Data-Source Strategy

### Initial production ingestion

Use provider-independent CSV and XLSX imports. Steps 1-8 now have a preview-only XLSX
implementation for the three supplied Israeli providers; account confirmation and
database-aware duplicate checks remain intentionally incomplete:

1. receive a bounded file;
2. detect or select a parser profile;
3. parse into a provider-neutral candidate model;
4. normalize dates, signed amounts, currency, merchant text, and source account;
5. validate and report row-level errors in Hebrew;
6. match an existing account or request explicit user confirmation;
7. compute deterministic duplicate candidates;
8. preview accepted, duplicate, warning, and rejected rows;
9. commit accepted rows atomically as one import batch;
10. record import history and provenance;
11. allow safe rollback of that batch.

The normalized ingestion service should accept future provider adapters. A future Open
Finance provider can therefore produce the same candidate model without changing
classification, preview, duplicate detection, or commit behavior.

Paid Financy/Open Finance integration is deferred. Bank website scraping and credential
storage are prohibited.

### Import schema gap

The current schema has no import-batch/history or staged-row tables and transactions have
no provider-independent import provenance/deduplication fields. A later import phase will
therefore need a migration. Before creating it, document and review:

- proposed import batch and source-file metadata;
- transaction provenance/fingerprint fields or a linked import-row model;
- unique constraints and duplicate semantics;
- rollback behavior when an imported transaction was later edited;
- RLS and retention policy;
- storage and Supabase Free plan impact.

`docs/IMPORT_PERSISTENCE_PROPOSAL.md` now records the proposed schema, atomic commit,
duplicate, rollback, RLS, and retention semantics. No SQL migration has been created.
The current preview deliberately returns serializable candidates without writing files,
batches, fingerprints, or transactions.

## 11. Actual Blockers and Inconsistencies

### Blockers to live Finance repositories

1. **No production household context.** Auth users are not linked to
   `household_members`, and adult `people.profile_id` links are not established. RLS will
   correctly return no Finance rows until this is resolved.
2. **The hardened household bootstrap is local only.** Production still has the previous
   `create_household` body until local migration `20260726090000` is explicitly approved
   and applied. The production setup UI must not be deployed before that migration.
3. **No real Finance data.** Live read adapters would return empty screens after
   membership setup. Reference data and transactions must be created/imported in ordered
   slices.
4. **No import persistence model.** CSV/XLSX history, deduplication, provenance, and
   rollback cannot be implemented safely with the current schema alone.

These are expected next-phase gaps, not reasons to weaken RLS or seed production with
mock data.

### Repository/documentation inconsistencies

1. `README.md` says no environment variables are required in the mock phase, but
   authenticated Finance requests now require the Supabase publishable environment pair
   at runtime.
2. `ARCHITECTURE.md` and `IMPLEMENTATION_PLAN.md` still describe Supabase, its client,
   Playwright-era persistence work, and authentication as deferred. The code and Git
   history have advanced beyond those status sections.
3. `IMPLEMENTATION_PLAN.md` reports 37 tests; the current baseline is 62. Its phase
   numbering also predates the later "Phase 2 authentication" terminology.
4. `DATA_MODEL.md` describes several deferred tables not in the deployed 25-table MVP
   schema, including sync/document/notification/audit concepts. The migrations and
   generated types are the actual current database contract.
5. `src/types/domain.ts` says it mirrors the database mechanically, but it is now a
   mock/calculation model and omits many persisted fields. Explicit mappers are required;
   it should not be treated as a generated row contract.
6. Local `supabase/config.toml` permits email signup even though the product is private
   and exposes no signup UI. The hosted setting was not changed by this audit and must be
   verified before production.
7. `docs/product-design-handoff.pdf` contains damaged PDF streams and renders as blank in
   the available PDF tools. Its `.dc.html` companion is readable and contains the full
   product/design data, so this does not currently block implementation; the PDF should
   be regenerated.
8. There is no checked-in CI workflow or browser/database integration test harness.
   Current validation is local lint/typecheck/unit/component/build only.

No other blocker was found in the audited baseline. The four required application checks
are green.

## 12. Deferred Work

- Paid Open Finance/Financy integration.
- Bank website scraping.
- Real-time bank sync and sync-connection tables.
- Accountant access.
- Multi-household product UX.
- Multi-currency.
- Official VAT/tax filing.
- Notification delivery provider.
- Transaction split UI and schema.
- Document storage.
- Advanced AI insights.

These items should not be pulled into an implementation phase without an explicit product
decision.

## 13. Ordered Implementation Roadmap

Each phase should be a small reviewable change set, retain a green baseline, and avoid
switching unrelated screens at once.

### Phase 1 - Real identity and household setup

1. [Complete locally] Add a membership-aware current-household DAL result.
2. [Complete locally] Show a Hebrew onboarding state when a valid profile has no household membership.
3. [Complete locally] Explain and review a small migration that makes `create_household` retry-safe and
   atomically creates/links the first owner's adult `people` row.
4. [Complete locally] Create and locally verify that migration only after the explanation is reviewed.
5. [Complete locally] Expose the hardened RPC through a validated server-side action.
6. Add a separate owner-controlled Danielle invitation/link flow with no public signup.
7. Add authorization tests for no profile, no membership, owner, member, and viewer.

No mock Finance records should be copied into production.

### Phase 2 - Repository boundary and first real reads

1. Split `getFinanceDb()` into granular repository contracts.
2. Introduce authenticated household context and row-to-domain mappers.
3. Implement the smallest read-only Supabase adapter first (household/settings/shell).
4. Keep mock adapters selectable behind the same contract for tests.
5. Verify query bounds and RLS behavior before moving another screen.

### Phase 3 - Reference-data CRUD

Implement small vertical slices for:

1. household people and roles;
2. financial accounts;
3. businesses;
4. categories and archive/restore.

Each slice includes reads, validated mutations, Hebrew error states, RLS tests, and
archive behavior.

### Phase 4 - Real transaction ledger reads

1. Add transaction/account/category queries by household and bounded date range.
2. Map signed `bigint` agorot safely into branded TypeScript values.
3. Derive account balances and screen view models.
4. Switch `/transactions` and transaction portions of `/dashboard` to the real adapter.
5. Keep mock removal limited to those consumers.

### Phase 5 - Transaction CRUD, review, and classification

1. Create/edit/archive appropriate transaction flows.
2. Persist category/context/owner corrections.
3. Resolve/dismiss review items transactionally.
4. Create and archive merchant rules through "זכור כלל זה".
5. Use existing transfer RPCs for internal-transfer creation/removal.
6. Add undo semantics and concurrency/error handling.

### Phase 6 - Budgets and adjustments

1. Read monthly budget headers/items.
2. Create/edit category allocations.
3. Persist append-only budget adjustments.
4. Support one-time/permanent behavior without rewriting history.
5. Switch `/budget` and the relevant dashboard summaries to real data.

### Phase 7 - Installments, recurring flows, and planning

1. CRUD installment plans/entries with integrity tests.
2. CRUD recurring transactions.
3. Generate and fulfill expected transactions idempotently.
4. Switch `/planning` and future-commitment dashboard sections.
5. Verify monthly-only installment counting and uncertain-income separation.

### Phase 8 - Business, wealth, insurance, goals, and child savings

Move one domain at a time:

1. business reads and classification;
2. assets and liabilities;
3. insurance policies;
4. financial goals and contributions;
5. children profiles and linked savings.

Each switch retains explicit household/business separation and adds CRUD plus RLS tests.

### Phase 9 - Import architecture and migration proposal

1. [Complete locally] Define the provider-neutral candidate/parser interfaces.
2. [Partial] Define account matching, fingerprinting, duplicate, preview, and rollback
   semantics. Within-file fingerprints and preview exist; database matching and rollback
   remain.
3. [Complete locally] Specify the required import schema migration, RLS, indexes,
   retention, and Free plan impact in `docs/IMPORT_PERSISTENCE_PROPOSAL.md`.
4. Review the migration explanation before creating or applying it.

### Phase 10 - CSV/XLSX parsing and preview

1. [Complete locally] Add narrowly chosen parsing dependencies.
2. [Partial] Implement provider-independent parsing: XLSX is implemented; CSV remains.
3. [Complete locally] Add FIBI, CAL, and Isracard profiles without tying the domain to
   one provider.
4. [Complete locally] Normalize integer agorot, Israel dates, signs, currencies,
   descriptions, and masked account hints.
5. [Complete locally] Build Hebrew validation and preview.
6. Add real-account matching and explicit confirmation before persistence.
7. [Partial] Tests cover provider quirks, size/type/auth failures and duplicates. Add
   formula, decompression-bomb fixture, database duplicates, and partial-commit tests.

### Phase 11 - Import commit, history, and rollback

1. Commit an approved preview atomically.
2. Record batch/file/parser metadata and transaction provenance.
3. Enforce duplicate constraints.
4. Show import history and results.
5. Roll back only eligible rows from one batch with a clear audit record.
6. Preserve later user edits according to the approved rollback policy.

### Phase 12 - Backup and export

1. Define a complete household export format and version it.
2. Export CSV/XLSX views plus a machine-readable full backup.
3. Protect against spreadsheet formula injection.
4. Add restore documentation and test round trips where supported.
5. Keep retention/storage within Free plan limits.

### Phase 13 - Security and RLS verification

1. Add executable local RLS tests for owner/member/viewer/outsider/anon.
2. Test every RPC and cross-household composite FK.
3. Test import and mutation authorization.
4. Verify hosted Auth signup is disabled.
5. Review logs, error messages, dependency risks, and secret boundaries.

### Phase 14 - Responsive and accessibility QA

1. Keyboard-test all 14 screens and every overlay.
2. Verify focus trap/restore, screen-reader names, live regions, and RTL order.
3. Test Light/Dark/System parity at mobile/tablet/desktop breakpoints.
4. Check touch targets, contrast, reduced motion, overflow, and long Hebrew content.
5. Add browser E2E coverage for login, onboarding, import, review, budget, and logout.

### Phase 15 - Production deployment and operations

1. Add CI for lint, typecheck, tests, build, and database checks.
2. Configure production environment variables and private Auth settings.
3. Deploy the application without service-role browser exposure.
4. Run production smoke tests under both owner accounts.
5. Establish tested backup/export operations and restore instructions.
6. Add bounded monitoring and an incident/recovery checklist.

## 14. Exact First Implementation Task

Completed locally on 2026-07-26:

**Implement a retry-safe, membership-aware household bootstrap for the first owner,
without a Finance data seed or remote database application.**

Acceptance scope:

1. Add a cached DAL query that returns the authenticated profile's household membership
   and role.
2. Change the protected Finance entry flow so a signed-in profile with no membership sees
   a calm Hebrew household-setup screen instead of proceeding directly to the mock App
   Shell.
3. Before creating SQL, explain a migration that hardens `create_household`: serialize
   bootstrap attempts per authenticated profile, return the existing household on retry,
   and atomically create the owner membership plus the linked adult `people` row on the
   first call.
4. After review, create and locally test that migration and regenerate database types if
   its exposed contract changes. Do not apply it to the linked remote database in this
   task.
5. Add a validated server-side action that calls the hardened
   `create_household('כספי הבית')` RPC.
6. Redirect to `/dashboard`; Finance screens may remain mock-backed in this task.
7. Add unit/integration-level tests for unauthenticated, missing-profile,
   no-membership, successful bootstrap, retry/idempotency, and failure states.
8. Do not create Danielle's Auth user, seed financial records, use a service-role key,
   weaken RLS, or modify the hosted database during implementation/validation.

Danielle's owner invitation and `people.profile_id` linking should be the next separate,
reviewable task.

The exact next implementation task is to design and review the import persistence
migration and confirmation flow: map each masked provider account to a real
`financial_accounts` row, explicitly choose household/business context, store import
batch/provenance fingerprints under RLS, and define rollback semantics. Do not create or
apply the migration remotely without explicit authorization.
