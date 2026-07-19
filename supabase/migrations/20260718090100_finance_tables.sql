-- Tal Family OS — Finance MVP schema, part 2/5: tables, checks, composite FKs.
--
-- Conventions (docs/DATA_MODEL.md):
--   * Money is bigint integer agorot. transactions.amount is SIGNED (outflow < 0);
--     everywhere else amounts are positive magnitudes.
--   * "A day in Israel" is a `date`; months are a `date` pinned to the 1st.
--   * Every domain table carries household_id for uniform, join-free RLS.
--   * Archive, don't delete: archived_at + `on delete restrict` references.
--   * Cross-entity references are composite FKs (ref_id, household_id) so rows can
--     never point at another household's data, independently of RLS.
-- Circular references (transactions ↔ internal_transfers / installment_entries) are
-- added via `alter table` at the end of this file.

-- ---------------------------------------------------------------- identity

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar       text,
  locale       text not null default 'he-IL',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.households (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  currency           char(3) not null default 'ILS',
  carry_over_enabled boolean not null default false,
  timezone           text not null default 'Asia/Jerusalem',
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete restrict,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  role         public.member_role not null default 'member',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (household_id, profile_id)
);

create table public.people (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete restrict,
  profile_id   uuid references public.profiles (id) on delete set null,
  name         text not null,
  kind         public.person_kind not null,
  birth_date   date,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, household_id),
  constraint people_children_have_no_login check (kind = 'adult' or profile_id is null)
);

create unique index people_household_profile_key
  on public.people (household_id, profile_id)
  where profile_id is not null;

create table public.businesses (
  id                      uuid primary key default gen_random_uuid(),
  household_id            uuid not null references public.households (id) on delete restrict,
  owner_person_id         uuid not null,
  name                    text not null,
  legal_form              public.legal_form not null,
  -- No default on purpose: the VAT rate is data, not schema. Seeded explicitly.
  vat_rate                numeric(5, 4) not null
                          constraint businesses_vat_rate_range check (vat_rate >= 0 and vat_rate < 1),
  vat_reporting_frequency public.vat_reporting_frequency not null,
  archived_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (id, household_id),
  foreign key (owner_person_id, household_id)
    references public.people (id, household_id) on delete restrict
);

-- ---------------------------------------------------------------- accounts

create table public.financial_accounts (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households (id) on delete restrict,
  name                 text not null,
  type                 public.account_type not null,
  owner_person_id      uuid,                          -- null = shared
  institution          text,
  last4                text constraint financial_accounts_last4_digits check (last4 ~ '^[0-9]{4}$'),
  icon                 text not null default 'account_balance',
  is_asset             boolean not null default true, -- false: credit card ("חיוב צפוי")
  context              public.finance_context not null default 'household',
  opening_balance      bigint not null default 0,     -- signed agorot
  opening_balance_date date,                          -- null ⇒ every transaction counts
  sort_order           integer not null default 0,
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (id, household_id),
  foreign key (owner_person_id, household_id)
    references public.people (id, household_id) on delete restrict
);

comment on column public.financial_accounts.opening_balance is
  'Balance is derived, never stored: opening_balance + sum of the account''s signed '
  'transaction amounts (ALL kinds, transfer legs included) dated after opening_balance_date.';

-- ---------------------------------------------------------------- categories & budgets

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete restrict,
  name         text not null,
  short_name   text not null,
  icon         text not null,
  tint         text,                                  -- design-token name, never raw hex
  context      public.finance_context not null,
  priority     public.category_priority not null default 'flexible',
  sort_order   integer not null default 0,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, household_id)
);

create unique index categories_household_name_key
  on public.categories (household_id, name)
  where archived_at is null;

create table public.monthly_budgets (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete restrict,
  month        date not null
               constraint monthly_budgets_month_is_first_day
               check (month = date_trunc('month', month)::date),
  context      public.finance_context not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (household_id, month, context),
  unique (id, household_id)
);

comment on table public.monthly_budgets is
  'Budget header per (household, month, context). The total budget is derived from '
  'monthly_budget_items and is intentionally not stored.';

create table public.monthly_budget_items (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households (id) on delete restrict,
  monthly_budget_id uuid not null,
  category_id       uuid not null,
  amount            bigint not null constraint monthly_budget_items_amount_nonneg check (amount >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (monthly_budget_id, category_id),
  foreign key (monthly_budget_id, household_id)
    references public.monthly_budgets (id, household_id) on delete cascade,
  foreign key (category_id, household_id)
    references public.categories (id, household_id) on delete restrict
);

create table public.budget_adjustments (
  id                      uuid primary key default gen_random_uuid(),
  household_id            uuid not null references public.households (id) on delete restrict,
  month                   date not null
                          constraint budget_adjustments_month_is_first_day
                          check (month = date_trunc('month', month)::date),
  category_id             uuid not null,
  delta                   bigint not null constraint budget_adjustments_delta_nonzero check (delta <> 0),
  kind                    public.adjustment_kind not null,
  counterpart_category_id uuid,
  scope                   public.adjustment_scope not null default 'one_time',
  note                    text not null default '',
  created_by              uuid not null references public.profiles (id) on delete restrict,
  created_at              timestamptz not null default now(),
  constraint budget_adjustments_reallocation_counterpart
    check ((kind = 'reallocation') = (counterpart_category_id is not null)),
  foreign key (category_id, household_id)
    references public.categories (id, household_id) on delete restrict,
  foreign key (counterpart_category_id, household_id)
    references public.categories (id, household_id) on delete restrict
);

comment on table public.budget_adjustments is
  'Append-only audit trail of budget changes (who/when/what). Spending history is never moved.';

-- ---------------------------------------------------------------- transactions & flows

create table public.installment_plans (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null references public.households (id) on delete restrict,
  merchant_name      text not null,
  icon               text,
  total_amount       bigint not null constraint installment_plans_total_positive check (total_amount > 0),
  installments_count integer not null
                     constraint installment_plans_count_range check (installments_count between 2 and 60),
  first_charge_date  date not null,
  account_id         uuid not null,
  category_id        uuid not null,
  context            public.finance_context not null default 'household',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (id, household_id),
  foreign key (account_id, household_id)
    references public.financial_accounts (id, household_id) on delete restrict,
  foreign key (category_id, household_id)
    references public.categories (id, household_id) on delete restrict
);

create table public.installment_entries (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households (id) on delete restrict,
  plan_id        uuid not null,
  sequence       integer not null constraint installment_entries_sequence_positive check (sequence >= 1),
  due_month      date not null
                 constraint installment_entries_due_month_is_first_day
                 check (due_month = date_trunc('month', due_month)::date),
  amount         bigint not null constraint installment_entries_amount_positive check (amount > 0),
  transaction_id uuid,                                -- set when the charge lands
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (plan_id, sequence),
  unique (plan_id, due_month),
  unique (id, household_id),
  foreign key (plan_id, household_id)
    references public.installment_plans (id, household_id) on delete cascade
);

comment on table public.installment_entries is
  'One row per scheduled charge. Only the entry whose due_month equals the viewed month '
  'counts in that month''s actual spending; the rest are future commitments.';

create table public.internal_transfers (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete restrict,
  from_account_id uuid not null,
  to_account_id   uuid not null,
  amount          bigint not null constraint internal_transfers_amount_positive check (amount > 0),
  date            date not null,
  from_txn_id     uuid,
  to_txn_id       uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, household_id),
  constraint internal_transfers_accounts_differ check (from_account_id <> to_account_id),
  foreign key (from_account_id, household_id)
    references public.financial_accounts (id, household_id) on delete restrict,
  foreign key (to_account_id, household_id)
    references public.financial_accounts (id, household_id) on delete restrict
);

comment on table public.internal_transfers is
  'Movements between owned accounts (Bit/PayBox/bank/cash, ATM withdrawal = bank→cash). '
  'Never income or expense. Rows are written exclusively by the create/remove RPCs, '
  'which also write the two mirrored transfer-leg transactions atomically.';

create table public.transactions (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households (id) on delete restrict,
  account_id           uuid not null,
  date                 date not null,                 -- Israel day
  occurred_at          timestamptz,
  amount               bigint not null,               -- SIGNED agorot
  currency             char(3) not null default 'ILS',
  merchant_name        text not null,
  description          text,
  icon                 text,
  category_id          uuid,
  context              public.finance_context not null default 'household',
  owner_person_id      uuid,
  kind                 public.transaction_kind not null,
  income_class         public.income_class,
  status               public.transaction_status not null default 'cleared',
  needs_review         boolean not null default false,
  review_reason        public.review_reason,
  installment_entry_id uuid,
  transfer_id          uuid,
  notes                text,
  created_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (id, household_id),
  constraint transactions_amount_sign_matches_kind
    check ((kind = 'expense'              and amount < 0)
        or (kind in ('income', 'refund')  and amount > 0)
        or (kind = 'transfer'             and amount <> 0)),
  constraint transactions_income_class_only_on_income
    check (income_class is null or kind = 'income'),
  constraint transactions_transfer_iff_linked
    check ((kind = 'transfer') = (transfer_id is not null)),
  constraint transactions_transfers_never_categorized
    check (kind <> 'transfer' or category_id is null),
  constraint transactions_installment_is_expense
    check (installment_entry_id is null or kind = 'expense'),
  constraint transactions_review_reason_requires_flag
    check (review_reason is null or needs_review),
  foreign key (account_id, household_id)
    references public.financial_accounts (id, household_id) on delete restrict,
  foreign key (category_id, household_id)
    references public.categories (id, household_id) on delete restrict,
  foreign key (owner_person_id, household_id)
    references public.people (id, household_id) on delete restrict
);

comment on table public.transactions is
  'The ledger. kind=''transfer'' rows are excluded from every income/expense/budget '
  'aggregate (they only move balance between accounts); refunds reduce category spending '
  'in their own month.';

-- Circular references, now that all three tables exist.
alter table public.transactions
  add constraint transactions_installment_entry_fk
  foreign key (installment_entry_id, household_id)
  references public.installment_entries (id, household_id) on delete restrict;

alter table public.transactions
  add constraint transactions_transfer_fk
  foreign key (transfer_id, household_id)
  references public.internal_transfers (id, household_id) on delete restrict;

alter table public.installment_entries
  add constraint installment_entries_transaction_fk
  foreign key (transaction_id, household_id)
  references public.transactions (id, household_id) on delete restrict;

alter table public.internal_transfers
  add constraint internal_transfers_from_txn_fk
  foreign key (from_txn_id, household_id)
  references public.transactions (id, household_id)
  deferrable initially deferred;

alter table public.internal_transfers
  add constraint internal_transfers_to_txn_fk
  foreign key (to_txn_id, household_id)
  references public.transactions (id, household_id)
  deferrable initially deferred;

alter table public.internal_transfers
  add constraint internal_transfers_from_txn_key unique (from_txn_id) deferrable initially deferred;

alter table public.internal_transfers
  add constraint internal_transfers_to_txn_key unique (to_txn_id) deferrable initially deferred;

create table public.recurring_transactions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete restrict,
  name         text not null,
  amount       bigint constraint recurring_transactions_amount_positive
               check (amount is null or amount > 0),
  estimate     boolean not null default false,
  category_id  uuid,
  account_id   uuid,
  direction    public.flow_direction not null default 'outflow',
  day_of_month integer not null
               constraint recurring_transactions_day_range check (day_of_month between 1 and 31),
  cadence      public.recurring_cadence not null default 'monthly',
  context      public.finance_context not null default 'household',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, household_id),
  constraint recurring_transactions_amount_or_estimate check (estimate or amount is not null),
  foreign key (category_id, household_id)
    references public.categories (id, household_id) on delete restrict,
  foreign key (account_id, household_id)
    references public.financial_accounts (id, household_id) on delete restrict
);

create table public.expected_transactions (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references public.households (id) on delete restrict,
  month            date not null
                   constraint expected_transactions_month_is_first_day
                   check (month = date_trunc('month', month)::date),
  name             text not null,
  icon             text,
  amount           bigint not null
                   constraint expected_transactions_amount_positive check (amount > 0),
  estimate         boolean not null default false,
  due_date         date,
  group_kind       public.expected_group not null,   -- DATA_MODEL "group"; renamed: reserved word
  category_id      uuid,
  direction        public.flow_direction not null,
  certainty        public.income_certainty,          -- income only, never conflated
  context          public.finance_context not null default 'household',
  recurring_id     uuid,
  fulfilled_txn_id uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint expected_transactions_certainty_income_only
    check (certainty is null or direction = 'inflow'),
  foreign key (category_id, household_id)
    references public.categories (id, household_id) on delete restrict,
  foreign key (recurring_id, household_id)
    references public.recurring_transactions (id, household_id) on delete set null (recurring_id),
  foreign key (fulfilled_txn_id, household_id)
    references public.transactions (id, household_id) on delete set null (fulfilled_txn_id)
);

create table public.income_sources (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete restrict,
  person_id       uuid not null,
  name            text not null,
  kind            public.income_class not null,
  expected_amount bigint not null
                  constraint income_sources_amount_positive check (expected_amount > 0),
  certainty       public.income_certainty not null,
  business_id     uuid,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint income_sources_business_link
    check ((kind = 'business') = (business_id is not null)),
  foreign key (person_id, household_id)
    references public.people (id, household_id) on delete restrict,
  foreign key (business_id, household_id)
    references public.businesses (id, household_id) on delete restrict
);

-- ---------------------------------------------------------------- review & classification

create table public.merchant_rules (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references public.households (id) on delete restrict,
  merchant_pattern text not null,
  category_id      uuid,
  context          public.finance_context not null default 'household',
  owner_person_id  uuid,
  mark_as_transfer boolean not null default false,
  created_by       uuid not null references public.profiles (id) on delete restrict,
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint merchant_rules_decide_something
    check (mark_as_transfer or category_id is not null),
  foreign key (category_id, household_id)
    references public.categories (id, household_id) on delete restrict,
  foreign key (owner_person_id, household_id)
    references public.people (id, household_id) on delete restrict
);

create unique index merchant_rules_household_pattern_key
  on public.merchant_rules (household_id, merchant_pattern)
  where archived_at is null;

create table public.review_items (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households (id) on delete restrict,
  transaction_id uuid not null unique,
  reason         public.review_reason not null,
  status         public.review_status not null default 'open',
  resolved_by    uuid references public.profiles (id) on delete set null,
  resolved_at    timestamptz,
  resolution     jsonb,   -- {category_id, context, owner_person_id, is_transfer, remember_rule}
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint review_items_open_iff_unresolved check ((status = 'open') = (resolved_at is null)),
  foreign key (transaction_id, household_id)
    references public.transactions (id, household_id) on delete cascade
);

-- ---------------------------------------------------------------- wealth, insurance, goals

create table public.assets (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete restrict,
  name            text not null,
  subtitle        text,
  icon            text,
  type            public.asset_type not null,
  owner_person_id uuid,
  current_value   bigint not null constraint assets_value_nonneg check (current_value >= 0),
  valued_at       timestamptz not null default now(),
  meta            jsonb not null default '{}',
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, household_id),
  foreign key (owner_person_id, household_id)
    references public.people (id, household_id) on delete restrict
);

create table public.liabilities (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete restrict,
  name         text not null,
  type         public.liability_type not null,
  balance      bigint not null constraint liabilities_balance_nonneg check (balance >= 0),
  institution  text,
  end_date     date,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.liabilities.balance is
  'Stored positive, displayed negative. Net worth = Σassets − Σliabilities (engine).';

create table public.insurance_policies (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households (id) on delete restrict,
  name              text not null,
  provider          text not null,
  insured_person_id uuid,
  policy_type       public.policy_type not null,
  premium_monthly   bigint not null
                    constraint insurance_policies_premium_nonneg check (premium_monthly >= 0),
  coverage_summary  text not null default '',
  renewal_date      date,
  status            public.policy_status not null default 'active',
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (insured_person_id, household_id)
    references public.people (id, household_id) on delete restrict
);

create table public.financial_goals (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references public.households (id) on delete restrict,
  name                  text not null,
  icon                  text,
  target_amount         bigint not null
                        constraint financial_goals_target_positive check (target_amount > 0),
  current_amount        bigint not null default 0
                        constraint financial_goals_current_nonneg check (current_amount >= 0),
  monthly_deposit       bigint not null default 0
                        constraint financial_goals_deposit_nonneg check (monthly_deposit >= 0),
  target_date           date,
  beneficiary_person_id uuid,
  linked_asset_id       uuid,
  status                public.goal_status not null default 'active',
  archived_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, household_id),
  foreign key (beneficiary_person_id, household_id)
    references public.people (id, household_id) on delete restrict,
  foreign key (linked_asset_id, household_id)
    references public.assets (id, household_id) on delete restrict
);

comment on column public.financial_goals.current_amount is
  'Denormalized Σ goal_contributions.amount, maintained by trigger. Display-only shortcut.';

create table public.goal_contributions (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households (id) on delete restrict,
  goal_id           uuid not null,
  amount            bigint not null
                    constraint goal_contributions_amount_nonzero check (amount <> 0),
  date              date not null,
  source_account_id uuid,
  note              text,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  foreign key (goal_id, household_id)
    references public.financial_goals (id, household_id) on delete cascade,
  foreign key (source_account_id, household_id)
    references public.financial_accounts (id, household_id) on delete restrict
);

create table public.children_profiles (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete restrict,
  person_id       uuid not null unique,
  monthly_deposit bigint not null default 0
                  constraint children_profiles_deposit_nonneg check (monthly_deposit >= 0),
  target_age      integer not null default 18
                  constraint children_profiles_target_age_range check (target_age between 1 and 30),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (person_id, household_id)
    references public.people (id, household_id) on delete restrict
);
