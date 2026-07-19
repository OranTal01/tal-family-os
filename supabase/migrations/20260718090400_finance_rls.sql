-- Tal Family OS — Finance MVP schema, part 5/5: Row Level Security + grants.
--
-- Model: private family app. All access is `authenticated` under RLS; `anon` has zero
-- grants. Reads: any household member (including future read-only viewers). Writes:
-- owner or member — viewers are read-only everywhere. WITH CHECK pins household_id on
-- every new/updated row; the composite FKs (part 2) block cross-household references
-- even for valid members. Tables use ENABLE (not FORCE) RLS so the security-definer
-- RPCs/triggers in part 4 can maintain rows clients must not touch directly.

-- ---------------------------------------------------------------- enable RLS everywhere

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'households', 'household_members', 'people', 'businesses',
    'financial_accounts', 'categories', 'monthly_budgets', 'monthly_budget_items',
    'budget_adjustments', 'transactions', 'internal_transfers', 'installment_plans',
    'installment_entries', 'recurring_transactions', 'expected_transactions',
    'income_sources', 'merchant_rules', 'review_items', 'assets', 'liabilities',
    'insurance_policies', 'financial_goals', 'goal_contributions', 'children_profiles'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------- standard domain tables

-- select: member · insert/update/delete: owner or member
do $$
declare
  t text;
begin
  foreach t in array array[
    'people', 'businesses', 'financial_accounts', 'categories', 'monthly_budgets',
    'monthly_budget_items', 'installment_plans', 'installment_entries',
    'recurring_transactions', 'expected_transactions', 'income_sources',
    'merchant_rules', 'assets', 'liabilities', 'insurance_policies',
    'financial_goals', 'children_profiles'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (household_id in (select app.member_households()))',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (app.household_role(household_id) in (''owner'', ''member''))',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (app.household_role(household_id) in (''owner'', ''member''))
         with check (app.household_role(household_id) in (''owner'', ''member''))',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (app.household_role(household_id) in (''owner'', ''member''))',
      t || '_delete', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------- transactions

-- Same as standard tables, plus: clients can never write transfer legs directly —
-- transfers exist only through the create/remove RPCs.
create policy transactions_select on public.transactions
  for select to authenticated
  using (household_id in (select app.member_households()));

create policy transactions_insert on public.transactions
  for insert to authenticated
  with check (app.household_role(household_id) in ('owner', 'member')
              and kind <> 'transfer');

create policy transactions_update on public.transactions
  for update to authenticated
  using (app.household_role(household_id) in ('owner', 'member')
         and kind <> 'transfer')
  with check (app.household_role(household_id) in ('owner', 'member')
              and kind <> 'transfer');

create policy transactions_delete on public.transactions
  for delete to authenticated
  using (app.household_role(household_id) in ('owner', 'member')
         and kind <> 'transfer');

-- ---------------------------------------------------------------- internal_transfers

-- Read-only for clients; written exclusively by the security-definer RPCs.
create policy internal_transfers_select on public.internal_transfers
  for select to authenticated
  using (household_id in (select app.member_households()));

-- ---------------------------------------------------------------- append-only tables

create policy budget_adjustments_select on public.budget_adjustments
  for select to authenticated
  using (household_id in (select app.member_households()));

create policy budget_adjustments_insert on public.budget_adjustments
  for insert to authenticated
  with check (app.household_role(household_id) in ('owner', 'member')
              and created_by = (select auth.uid()));

create policy goal_contributions_select on public.goal_contributions
  for select to authenticated
  using (household_id in (select app.member_households()));

create policy goal_contributions_insert on public.goal_contributions
  for insert to authenticated
  with check (app.household_role(household_id) in ('owner', 'member')
              and (created_by is null or created_by = (select auth.uid())));

-- ---------------------------------------------------------------- review queue

-- Resolve/dismiss are status updates; review rows are never deleted by clients
-- (they cascade if their transaction is deleted).
create policy review_items_select on public.review_items
  for select to authenticated
  using (household_id in (select app.member_households()));

create policy review_items_insert on public.review_items
  for insert to authenticated
  with check (app.household_role(household_id) in ('owner', 'member'));

create policy review_items_update on public.review_items
  for update to authenticated
  using (app.household_role(household_id) in ('owner', 'member'))
  with check (app.household_role(household_id) in ('owner', 'member'));

-- ---------------------------------------------------------------- households

-- Creation goes through the create_household() RPC; no direct insert or delete.
create policy households_select on public.households
  for select to authenticated
  using (id in (select app.member_households()));

create policy households_update on public.households
  for update to authenticated
  using (app.household_role(id) = 'owner')
  with check (app.household_role(id) = 'owner');

-- ---------------------------------------------------------------- household_members

-- Membership is managed by owners; the last-owner trigger (part 4) guards downgrades.
create policy household_members_select on public.household_members
  for select to authenticated
  using (household_id in (select app.member_households()));

create policy household_members_insert on public.household_members
  for insert to authenticated
  with check (app.household_role(household_id) = 'owner');

create policy household_members_update on public.household_members
  for update to authenticated
  using (app.household_role(household_id) = 'owner')
  with check (app.household_role(household_id) = 'owner');

create policy household_members_delete on public.household_members
  for delete to authenticated
  using (app.household_role(household_id) = 'owner');

-- ---------------------------------------------------------------- profiles

-- Own profile plus fellow household members (display names/avatars in shared screens).
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid())
         or id in (select hm.profile_id
                     from public.household_members hm
                    where hm.household_id in (select app.member_households())));

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------- authenticated grants

-- Supabase no longer auto-exposes new tables to the API roles (always-revoked default):
-- without explicit GRANTs, `authenticated` cannot touch these tables at all, RLS or not.
-- Grants mirror the policies above — the narrowest privilege set each table's policies
-- can actually use; RLS then restricts rows within that.

grant usage on schema public to authenticated;

do $$
declare
  t text;
begin
  -- full DML, row-restricted by the standard policies
  foreach t in array array[
    'people', 'businesses', 'financial_accounts', 'categories', 'monthly_budgets',
    'monthly_budget_items', 'installment_plans', 'installment_entries',
    'recurring_transactions', 'expected_transactions', 'income_sources',
    'merchant_rules', 'assets', 'liabilities', 'insurance_policies',
    'financial_goals', 'children_profiles', 'transactions', 'household_members'
  ] loop
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$$;

grant select                 on public.internal_transfers to authenticated; -- writes: RPCs only
grant select, insert         on public.budget_adjustments to authenticated; -- append-only
grant select, insert         on public.goal_contributions to authenticated; -- append-only
grant select, insert, update on public.review_items       to authenticated; -- never client-deleted
grant select, update         on public.households          to authenticated; -- create: RPC only
grant select, insert, update on public.profiles            to authenticated; -- own row only

-- ---------------------------------------------------------------- anon: zero access

revoke all on all tables    in schema public from anon;
revoke all on all functions in schema public from anon;
revoke all on all sequences in schema public from anon;

alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on sequences from anon;
