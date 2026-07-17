# The Tal Family OS — Data Model (Supabase/PostgreSQL-ready)

The MVP runs on typed mock data, but the domain types in `src/types/` mirror this schema
so the Supabase migration is mechanical. This document is the contract.

## Global decisions

- **Money**: `bigint` **agorot** (minor units, 1₪ = 100 agorot). Never `float`/`real`.
  In TypeScript: branded integer `Agorot`. Rationale: exact integer arithmetic, cheap
  comparisons, `numeric` reserved for rates (e.g. VAT `numeric(5,4)`).
- **IDs**: `uuid` PK, `default gen_random_uuid()`.
- **Timestamps**: `timestamptz`, always UTC in storage. **Dates that mean "a day in
  Israel"** (transaction date, budget month) are `date` columns computed in
  `Asia/Jerusalem`; the app layer owns TZ conversion. Months are stored as the first day
  of the month (`date`).
- **Audit fields** on every table: `created_at`, `updated_at` (trigger), plus
  `created_by uuid → profiles` where user action matters.
- **Household isolation**: every domain table carries `household_id` (FK, `not null`) and
  RLS policy `household_id in (select household_id from household_members where profile_id = auth.uid())`.
- **Archive, don't delete**: user-facing entities get `archived_at timestamptz null`
  instead of hard deletes when history references them (categories, accounts, goals…).
- **External sync duplicate prevention**: rows imported from providers carry
  `source_connection_id` + `external_id` with a unique index
  `(source_connection_id, external_id)`.

## Entities

### Identity & household

- **profiles** — `id (auth.users)`, `display_name`, `avatar`, `locale default 'he-IL'`.
- **households** — `id`, `name` ("כספי הבית"), `currency char(3) default 'ILS'`,
  `carry_over_enabled bool default false`, `timezone default 'Asia/Jerusalem'`.
- **household_members** — `household_id`, `profile_id`, `role enum(owner, member, viewer)`,
  unique `(household_id, profile_id)`. Oran + Danielle = owners.
- **people** — non-login persons (children): `household_id`, `name` (אריאה, אלי),
  `kind enum(adult, child)`, `birth_date null`. Adults may link to `profile_id`.
- **businesses** — `household_id`, `owner_person_id`, `name`, `legal_form enum(osek_patur,
  osek_murshe, company)`, `vat_rate numeric(5,4)`, `vat_reporting_frequency
  enum(monthly, bimonthly)`. Danielle: עוסק מורשה.

### Accounts & instruments

- **financial_accounts** — `household_id`, `name`, `type enum(bank, credit_card, wallet,
  cash, investment, savings, pension, education_fund, other)`, `owner_person_id null`
  (null = shared), `institution null`, `last4 null`, `is_asset bool`, `archived_at`.
  Bit/PayBox are `wallet` — first-class accounts, not channels.
- **payment_methods** — optional refinement of an account (e.g. a card under the bank):
  `account_id`, `label`, `last4`. MVP mock keeps cards as accounts; table reserved.
- **sync_connections** — `household_id`, `provider`, `status enum(ok, syncing, error)`,
  `last_synced_at`, `error_message null`. **Never stores credentials** — only provider
  connection references/tokens server-side via vault.
- **sync_jobs** — `connection_id`, `started_at`, `finished_at`, `status`, `stats jsonb`.

### Categories & budgets

- **categories** — `household_id`, `name`, `short_name`, `icon`, `tint`, `context
  enum(household, business)`, `priority enum(essential, important, flexible,
  discretionary)`, `sort_order int`, `archived_at`. Unique `(household_id, name)` where
  not archived. Archived categories keep transactions; they simply stop appearing in
  pickers/budgets.
- **monthly_budgets** — `household_id`, `month date`, `context`, unique
  `(household_id, month, context)`. Total budget is *derived* (sum of items), not stored.
- **monthly_budget_items** — `monthly_budget_id`, `category_id`, `amount bigint`,
  unique `(monthly_budget_id, category_id)`.
- **budget_adjustments** (audit trail) — `household_id`, `month`, `category_id`,
  `delta bigint`, `kind enum(reallocation, increase, decrease, exceptional)`,
  `counterpart_category_id null` (for reallocations), `scope enum(one_time, permanent)`,
  `note`, `created_by`, `created_at`.

### Transactions

- **transactions** — `household_id`, `account_id`, `date date` (Israel day),
  `occurred_at timestamptz null`, `amount bigint` (signed: negative = outflow),
  `currency char(3)`, `merchant_name`, `description null`, `category_id null`,
  `context enum(household, business)`, `owner_person_id null`,
  `kind enum(expense, income, refund, transfer)`,
  `income_class enum(salary, business, other) null`,
  `status enum(cleared, pending)`, `needs_review bool`, `review_reason null`,
  `installment_entry_id null`, `transfer_id null`, `source_connection_id + external_id`,
  `notes`, audit fields.
  Indexes: `(household_id, date desc)`, `(household_id, category_id, date)`,
  `(household_id, context, date)`, partial on `needs_review`.
  **Rule encoded in engine + CHECK**: `kind = 'transfer'` ⇒ excluded from all
  income/expense aggregates; refunds reduce category spending in their own month.
- **transaction_splits** — `transaction_id`, `category_id`, `amount bigint`, `context`;
  sum of splits = parent amount (deferred in mock UI, schema reserved).
- **internal_transfers** — `household_id`, `from_account_id`, `to_account_id`,
  `amount bigint`, `date`, links the two mirrored transaction rows
  (`from_txn_id`, `to_txn_id`).
- **installment_plans** — `household_id`, `merchant_name`, `total_amount bigint`,
  `installments_count int`, `first_charge_date date`, `account_id`, `category_id`,
  `context`.
- **installment_entries** — `plan_id`, `sequence int` (1-based), `due_month date`,
  `amount bigint`, `transaction_id null` (set when charged). Only the entry whose
  `due_month` = current month counts in that month's actual spending.
- **recurring_transactions** — `household_id`, `name`, `amount bigint | null` +
  `estimate bool`, `category_id`, `account_id`, `day_of_month int`, `cadence
  enum(monthly, bimonthly, weekly, yearly)`, `context`, `active bool`.
- **expected_transactions** — planning rows for a month: `household_id`, `month date`,
  `name`, `amount bigint`, `estimate bool`, `due_date date null`,
  `group enum(fixed, variable_estimate, one_time)`, `category_id null`,
  `direction enum(inflow, outflow)`, `certainty enum(guaranteed, uncertain)` (income),
  `recurring_id null`, `fulfilled_txn_id null`.
- **income_sources** — `household_id`, `person_id`, `name` (משכורת אורן…),
  `kind enum(salary, business, other)`, `expected_amount bigint`,
  `certainty enum(guaranteed, uncertain)`, `business_id null`, `active`.
- **merchant_rules** — "זכור כלל זה": `household_id`, `merchant_pattern`,
  `category_id`, `context`, `owner_person_id null`, `mark_as_transfer bool`,
  `created_by`, `created_at`, `archived_at`. Unique `(household_id, merchant_pattern)`.
- **review_items** — `household_id`, `transaction_id unique`, `reason enum(uncategorized,
  unrecognized_merchant, possible_duplicate, possible_transfer, low_confidence)`,
  `status enum(open, resolved, dismissed)`, `resolved_by`, `resolved_at`,
  `resolution jsonb` (category/context/owner/transfer + remember-rule flag).

### Wealth, insurance, goals

- **assets** — `household_id`, `name`, `type enum(real_estate, pension, education_fund,
  provident_fund, investment, savings, child_savings, deposit, other)`, `owner_person_id
  null`, `current_value bigint`, `valued_at`, `meta jsonb` (yield, liquidity date…),
  `archived_at`.
- **liabilities** — `household_id`, `name`, `type enum(mortgage, loan, other)`,
  `balance bigint` (positive number, displayed negative), `institution`, `end_date null`.
  Net worth = Σassets − Σliabilities (engine).
- **insurance_policies** — `household_id`, `name`, `provider`, `insured_person_id null`,
  `policy_type enum(life, health, car, home, mortgage, disability, other)`,
  `premium_monthly bigint`, `coverage_summary text`, `renewal_date date null`,
  `status enum(active, renewal_due, lapsed)`, `document_id null`.
- **financial_goals** — `household_id`, `name` (יעד דירה…), `target_amount bigint`,
  `current_amount bigint` (derived from contributions, denormalized for display),
  `target_date null`, `beneficiary_person_id null` (אריאה/אלי), `linked_asset_id null`,
  `status enum(active, paused, done)`, `archived_at`.
- **goal_contributions** — `goal_id`, `amount bigint`, `date`, `source_account_id null`,
  `note`.
- **children_profiles** — view over `people where kind='child'` + linked goal/asset
  aggregates (או table with `person_id unique`, `monthly_deposit bigint`,
  `target_age int default 18`).
- **documents** — `household_id`, `bucket_path`, `mime`, `label`, `related enum/table+id`,
  uploaded via sanitized storage; referenced by insurance etc.

### Summaries & notifications

- **daily_summaries** — `household_id`, `date unique per household`, `payload jsonb`
  (typed `DailySummary`), `generated_at`. Generated 21:30 Asia/Jerusalem.
- **notification_preferences** — `profile_id`, `daily_summary_enabled bool`,
  `daily_summary_time time default '21:30'`, `channels jsonb`.
- **audit_events** — `household_id`, `actor_profile_id`, `entity`, `entity_id`,
  `action`, `diff jsonb`, `created_at`. Budget adjustments, rule creation, category
  archiving all emit events.

## Derivations the engine owns (never stored per-screen)

- Category: spent, remaining, utilization %, status, projected month-end.
- Month: actual/expected-guaranteed/uncertain income, actual/expected/committed spending,
  remaining budget, projected EOM balance, surplus/deficit.
- Household vs business separation; family income includes business income.
- Installment monthly portions and future commitments; transfer exclusion; refund credits;
  net worth; VAT informational summary.

## RLS sketch

```sql
alter table transactions enable row level security;
create policy household_isolation on transactions
  using (household_id in (
    select household_id from household_members
    where profile_id = auth.uid()));
-- identical policy on every household_id table
```

Storage: per-household folder prefix + policy on path; uploads validated (mime allowlist,
size cap) before write.
