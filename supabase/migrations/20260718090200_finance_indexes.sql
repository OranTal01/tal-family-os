-- Tal Family OS — Finance MVP schema, part 3/5: indexes.
-- Composite/unique keys created with the tables already cover many lookups; this file
-- adds the hot-path indexes for the screens (month views, category drill-down,
-- household/business split, review badge, planning, balances) and FK-side lookups on
-- the large tables. Small lookup tables rely on their unique keys.

-- transactions — the only table expected to grow meaningfully
create index txn_hh_date_idx      on public.transactions (household_id, date desc);
create index txn_hh_cat_date_idx  on public.transactions (household_id, category_id, date);
create index txn_hh_ctx_date_idx  on public.transactions (household_id, context, date);
create index txn_hh_kind_date_idx on public.transactions (household_id, kind, date);
create index txn_account_date_idx on public.transactions (account_id, date);        -- balance derivation
create index txn_owner_date_idx   on public.transactions (household_id, owner_person_id, date);
create index txn_needs_review_idx on public.transactions (household_id) where needs_review;
create index txn_transfer_idx     on public.transactions (transfer_id) where transfer_id is not null;
-- Unique: an installment entry is charged by at most one transaction. Also serves
-- the FK-side lookup that a plain txn_installment_idx would have covered.
create unique index transactions_installment_entry_unique
                                  on public.transactions (installment_entry_id)
                                  where installment_entry_id is not null;
create index txn_created_by_idx   on public.transactions (created_by) where created_by is not null;

-- review queue (badge counts open items only)
create index review_open_idx      on public.review_items (household_id) where status = 'open';

-- planning & commitments
create index expected_month_idx   on public.expected_transactions (household_id, month, direction);
create index expected_fulfilled_idx on public.expected_transactions (fulfilled_txn_id)
                                  where fulfilled_txn_id is not null;
create index expected_recurring_idx on public.expected_transactions (recurring_id)
                                  where recurring_id is not null;
create index entries_due_month_idx on public.installment_entries (household_id, due_month);
create index entries_txn_idx      on public.installment_entries (transaction_id)
                                  where transaction_id is not null;

-- budgets
create index adjustments_month_idx on public.budget_adjustments (household_id, month);

-- accounts / categories / goals — active-row pickers
create index accounts_active_idx  on public.financial_accounts (household_id)
                                  where archived_at is null;
create index categories_active_idx on public.categories (household_id, context, sort_order)
                                  where archived_at is null;
create index goals_active_idx     on public.financial_goals (household_id)
                                  where archived_at is null;
create index contributions_goal_idx on public.goal_contributions (goal_id, date desc);

-- transfers by account (account drill-down)
create index transfers_from_account_idx on public.internal_transfers (from_account_id);
create index transfers_to_account_idx   on public.internal_transfers (to_account_id);

-- membership lookups (RLS helper + settings screen)
create index members_profile_idx  on public.household_members (profile_id);
