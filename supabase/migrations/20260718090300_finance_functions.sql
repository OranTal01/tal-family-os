-- Tal Family OS — Finance MVP schema, part 4/5: functions, RPCs, triggers.
--
-- The `app` schema holds internal helpers (RLS predicates, trigger functions); it is
-- not exposed through the API. Client-callable RPCs live in `public`.
-- Security-definer functions run as the migration owner, which bypasses RLS because
-- tables are ENABLE (not FORCE) row level security — that is deliberate: the transfer
-- RPCs must write internal_transfers/transfer legs that clients are forbidden to touch.

create schema if not exists app;
grant usage on schema app to authenticated;

-- ---------------------------------------------------------------- RLS helpers

create or replace function app.member_households()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select household_id
  from public.household_members
  where profile_id = (select auth.uid())
$$;

create or replace function app.household_role(hid uuid)
returns public.member_role
language sql stable security definer
set search_path = ''
as $$
  select role
  from public.household_members
  where household_id = hid
    and profile_id = (select auth.uid())
$$;

revoke all on function app.member_households() from public;
revoke all on function app.household_role(uuid) from public;
grant execute on function app.member_households() to authenticated;
grant execute on function app.household_role(uuid) to authenticated;

-- ---------------------------------------------------------------- updated_at

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'households', 'household_members', 'people', 'businesses',
    'financial_accounts', 'categories', 'monthly_budgets', 'monthly_budget_items',
    'installment_plans', 'installment_entries', 'internal_transfers', 'transactions',
    'recurring_transactions', 'expected_transactions', 'income_sources',
    'merchant_rules', 'review_items', 'assets', 'liabilities', 'insurance_policies',
    'financial_goals', 'children_profiles'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function app.set_updated_at()', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------- profile bootstrap

create or replace function app.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'משתמש'
    ),
    new.raw_user_meta_data ->> 'avatar'
  )
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ---------------------------------------------------------------- transfer integrity

-- Validates one internal transfer and its two legs at commit time. Idempotent; called
-- from deferred constraint triggers on both internal_transfers and transactions.
create or replace function app.assert_internal_transfer(p_transfer_id uuid)
returns void
language plpgsql stable security definer
set search_path = ''
as $$
declare
  tr public.internal_transfers%rowtype;
  ft public.transactions%rowtype;
  tt public.transactions%rowtype;
begin
  select * into tr from public.internal_transfers where id = p_transfer_id;
  if not found then
    if exists (select 1 from public.transactions where transfer_id = p_transfer_id) then
      raise exception 'internal transfer % was removed but transfer legs remain', p_transfer_id;
    end if;
    return;
  end if;

  if tr.from_txn_id is null or tr.to_txn_id is null then
    raise exception 'internal transfer % is missing its transaction legs', p_transfer_id;
  end if;

  select * into ft from public.transactions where id = tr.from_txn_id;
  if not found then
    raise exception 'internal transfer %: from-leg transaction not found', p_transfer_id;
  end if;
  select * into tt from public.transactions where id = tr.to_txn_id;
  if not found then
    raise exception 'internal transfer %: to-leg transaction not found', p_transfer_id;
  end if;

  if ft.kind <> 'transfer' or ft.transfer_id <> tr.id
     or ft.household_id <> tr.household_id
     or ft.account_id <> tr.from_account_id
     or ft.amount <> -tr.amount then
    raise exception 'internal transfer %: from-leg is inconsistent', p_transfer_id;
  end if;

  if tt.kind <> 'transfer' or tt.transfer_id <> tr.id
     or tt.household_id <> tr.household_id
     or tt.account_id <> tr.to_account_id
     or tt.amount <> tr.amount then
    raise exception 'internal transfer %: to-leg is inconsistent', p_transfer_id;
  end if;

  if (select count(*) from public.transactions where transfer_id = tr.id) <> 2 then
    raise exception 'internal transfer % must have exactly two legs', p_transfer_id;
  end if;
end
$$;

create or replace function app.check_internal_transfer_row()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform app.assert_internal_transfer(coalesce(new.id, old.id));
  return null;
end
$$;

create constraint trigger internal_transfers_pair_check
  after insert or update or delete on public.internal_transfers
  deferrable initially deferred
  for each row execute function app.check_internal_transfer_row();

-- ---------------------------------------------------------------- installment integrity

create or replace function app.assert_installment_plan(p_plan_id uuid)
returns void
language plpgsql stable security definer
set search_path = ''
as $$
declare
  plan          public.installment_plans%rowtype;
  entry_count   integer;
  entry_total   bigint;
  out_of_bounds integer;
begin
  select * into plan from public.installment_plans where id = p_plan_id;
  if not found then
    return; -- plan deleted; entries cascade with it
  end if;

  select count(*),
         coalesce(sum(amount), 0),
         count(*) filter (where sequence > plan.installments_count)
    into entry_count, entry_total, out_of_bounds
    from public.installment_entries
   where plan_id = p_plan_id;

  if out_of_bounds > 0 then
    raise exception 'installment plan %: entry sequence exceeds installments_count', p_plan_id;
  end if;

  -- Fully scheduled plans must sum exactly to the purchase total
  -- (the last entry absorbs rounding).
  if entry_count = plan.installments_count and entry_total <> plan.total_amount then
    raise exception 'installment plan %: entries must sum to total_amount (% <> %)',
      p_plan_id, entry_total, plan.total_amount;
  end if;

  -- A charged entry must point at a matching expense on the plan's account,
  -- and that transaction must point back at the entry.
  perform 1
    from public.installment_entries e
    join public.transactions t on t.id = e.transaction_id
   where e.plan_id = p_plan_id
     and (t.kind <> 'expense'
          or t.account_id <> plan.account_id
          or t.amount <> -e.amount
          or t.installment_entry_id is distinct from e.id);
  if found then
    raise exception 'installment plan %: a linked charge is inconsistent with its entry', p_plan_id;
  end if;
end
$$;

create or replace function app.check_installment_entry_row()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform app.assert_installment_plan(coalesce(new.plan_id, old.plan_id));
  if tg_op = 'UPDATE' and new.plan_id <> old.plan_id then
    perform app.assert_installment_plan(old.plan_id);
  end if;
  return null;
end
$$;

create constraint trigger installment_entries_plan_check
  after insert or update or delete on public.installment_entries
  deferrable initially deferred
  for each row execute function app.check_installment_entry_row();

create or replace function app.check_installment_plan_row()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform app.assert_installment_plan(new.id);
  return null;
end
$$;

create constraint trigger installment_plans_entries_check
  after update on public.installment_plans
  deferrable initially deferred
  for each row execute function app.check_installment_plan_row();

-- Transactions participate in both invariants: re-validate any transfer or installment
-- linkage they touch.
create or replace function app.check_transaction_links()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if old.transfer_id is not null then
      perform app.assert_internal_transfer(old.transfer_id);
    end if;
    if old.installment_entry_id is not null then
      select plan_id into v_plan_id
        from public.installment_entries where id = old.installment_entry_id;
      if found then
        perform app.assert_installment_plan(v_plan_id);
      end if;
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    if new.transfer_id is not null then
      perform app.assert_internal_transfer(new.transfer_id);
    end if;
    if new.installment_entry_id is not null then
      select plan_id into v_plan_id
        from public.installment_entries where id = new.installment_entry_id;
      if found then
        perform app.assert_installment_plan(v_plan_id);
      end if;
    end if;
  end if;

  return null;
end
$$;

create constraint trigger transactions_links_check
  after insert or update or delete on public.transactions
  deferrable initially deferred
  for each row execute function app.check_transaction_links();

-- ---------------------------------------------------------------- review flag mirror

-- review_items is the source of truth for the review flow; transactions.needs_review is
-- a denormalized mirror so ledger queries stay join-free.
create or replace function app.sync_needs_review()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.transactions t
     set needs_review  = (new.status = 'open'),
         review_reason = case when new.status = 'open' then new.reason else null end
   where t.id = new.transaction_id
     and (t.needs_review is distinct from (new.status = 'open')
          or t.review_reason is distinct from
             case when new.status = 'open' then new.reason else null end);
  return null;
end
$$;

create trigger review_items_sync_flag
  after insert or update on public.review_items
  for each row execute function app.sync_needs_review();

-- ---------------------------------------------------------------- goal balance mirror

create or replace function app.maintain_goal_current_amount()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  for gid in
    select distinct g
      from unnest(array[
        case when tg_op in ('INSERT', 'UPDATE') then new.goal_id end,
        case when tg_op in ('UPDATE', 'DELETE') then old.goal_id end
      ]) as u(g)
     where g is not null
  loop
    update public.financial_goals
       set current_amount = coalesce(
             (select sum(amount) from public.goal_contributions where goal_id = gid), 0)
     where id = gid;
  end loop;
  return null;
end
$$;

create trigger goal_contributions_maintain_total
  after insert or update or delete on public.goal_contributions
  for each row execute function app.maintain_goal_current_amount();

-- ---------------------------------------------------------------- membership guard

create or replace function app.protect_last_owner()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if not exists (
      select 1 from public.household_members m
       where m.household_id = old.household_id
         and m.role = 'owner'
         and m.id <> old.id
    ) then
      raise exception 'a household must keep at least one owner';
    end if;
  end if;
  return coalesce(new, old);
end
$$;

create trigger household_members_protect_last_owner
  before update or delete on public.household_members
  for each row execute function app.protect_last_owner();

-- ---------------------------------------------------------------- archive guard

-- `on delete restrict` FKs already block these deletes; this trigger fires first with a
-- product-language message pointing at the archive flow instead of an FK error.
create or replace function app.prevent_hard_delete()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  has_history boolean := false;
begin
  if tg_table_name = 'categories' then
    has_history :=
         exists (select 1 from public.transactions where category_id = old.id)
      or exists (select 1 from public.monthly_budget_items where category_id = old.id)
      or exists (select 1 from public.budget_adjustments
                  where category_id = old.id or counterpart_category_id = old.id)
      or exists (select 1 from public.installment_plans where category_id = old.id)
      or exists (select 1 from public.expected_transactions where category_id = old.id)
      or exists (select 1 from public.recurring_transactions where category_id = old.id)
      or exists (select 1 from public.merchant_rules where category_id = old.id);
  elsif tg_table_name = 'financial_accounts' then
    has_history :=
         exists (select 1 from public.transactions where account_id = old.id)
      or exists (select 1 from public.internal_transfers
                  where from_account_id = old.id or to_account_id = old.id)
      or exists (select 1 from public.installment_plans where account_id = old.id)
      or exists (select 1 from public.recurring_transactions where account_id = old.id)
      or exists (select 1 from public.goal_contributions where source_account_id = old.id);
  elsif tg_table_name = 'financial_goals' then
    has_history :=
      exists (select 1 from public.goal_contributions where goal_id = old.id);
  elsif tg_table_name = 'assets' then
    has_history :=
      exists (select 1 from public.financial_goals where linked_asset_id = old.id);
  end if;

  if has_history then
    raise exception '% has history and cannot be deleted — archive it instead (archived_at)',
      tg_table_name using errcode = 'restrict_violation';
  end if;
  return old;
end
$$;

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'financial_accounts', 'financial_goals', 'assets'] loop
    execute format(
      'create trigger prevent_hard_delete before delete on public.%I
         for each row execute function app.prevent_hard_delete()', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------- client RPCs (public)

-- The ONLY write path for internal transfers: creates the transfer row and both
-- mirrored transaction legs in one transaction. Clients never assemble the pieces.
create or replace function public.create_internal_transfer(
  p_household_id uuid,
  p_from_account uuid,
  p_to_account   uuid,
  p_amount       bigint,
  p_date         date,
  p_note         text default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_role        public.member_role;
  v_from_name   text;
  v_to_name     text;
  v_transfer_id uuid;
  v_from_txn    uuid;
  v_to_txn      uuid;
begin
  v_role := app.household_role(p_household_id);
  if v_role is null or v_role not in ('owner', 'member') then
    raise exception 'not authorized to create transfers in this household';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'transfer amount must be a positive number of agorot';
  end if;
  if p_date is null then
    raise exception 'transfer date is required';
  end if;
  if p_from_account = p_to_account then
    raise exception 'transfer accounts must differ';
  end if;

  select name into v_from_name
    from public.financial_accounts
   where id = p_from_account and household_id = p_household_id and archived_at is null;
  if not found then
    raise exception 'source account not found in this household (or archived)';
  end if;

  select name into v_to_name
    from public.financial_accounts
   where id = p_to_account and household_id = p_household_id and archived_at is null;
  if not found then
    raise exception 'target account not found in this household (or archived)';
  end if;

  insert into public.internal_transfers (household_id, from_account_id, to_account_id, amount, date)
  values (p_household_id, p_from_account, p_to_account, p_amount, p_date)
  returning id into v_transfer_id;

  insert into public.transactions
    (household_id, account_id, date, amount, merchant_name, kind, transfer_id, notes, created_by)
  values
    (p_household_id, p_from_account, p_date, -p_amount,
     'העברה אל ' || v_to_name, 'transfer', v_transfer_id, p_note, (select auth.uid()))
  returning id into v_from_txn;

  insert into public.transactions
    (household_id, account_id, date, amount, merchant_name, kind, transfer_id, notes, created_by)
  values
    (p_household_id, p_to_account, p_date, p_amount,
     'העברה מ־' || v_from_name, 'transfer', v_transfer_id, p_note, (select auth.uid()))
  returning id into v_to_txn;

  update public.internal_transfers
     set from_txn_id = v_from_txn,
         to_txn_id   = v_to_txn
   where id = v_transfer_id;

  return v_transfer_id;
end
$$;

-- Atomically removes a transfer and both of its legs (undo / misclassification fix).
create or replace function public.remove_internal_transfer(p_transfer_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  tr     public.internal_transfers%rowtype;
  v_role public.member_role;
begin
  select * into tr from public.internal_transfers where id = p_transfer_id;
  if not found then
    raise exception 'internal transfer not found';
  end if;

  v_role := app.household_role(tr.household_id);
  if v_role is null or v_role not in ('owner', 'member') then
    raise exception 'not authorized to remove transfers in this household';
  end if;

  update public.internal_transfers
     set from_txn_id = null, to_txn_id = null
   where id = p_transfer_id;

  delete from public.transactions
   where id in (tr.from_txn_id, tr.to_txn_id);

  delete from public.internal_transfers where id = p_transfer_id;
end
$$;

-- Creates a household with the caller as its first owner (RLS bootstrap).
create or replace function public.create_household(p_name text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_household_id uuid;
begin
  if v_uid is null then
    raise exception 'must be signed in to create a household';
  end if;

  insert into public.households (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'כספי הבית'), v_uid)
  returning id into v_household_id;

  insert into public.household_members (household_id, profile_id, role)
  values (v_household_id, v_uid, 'owner');

  return v_household_id;
end
$$;

revoke all on function public.create_internal_transfer(uuid, uuid, uuid, bigint, date, text) from public;
revoke all on function public.remove_internal_transfer(uuid) from public;
revoke all on function public.create_household(text) from public;
grant execute on function public.create_internal_transfer(uuid, uuid, uuid, bigint, date, text) to authenticated;
grant execute on function public.remove_internal_transfer(uuid) to authenticated;
grant execute on function public.create_household(text) to authenticated;
