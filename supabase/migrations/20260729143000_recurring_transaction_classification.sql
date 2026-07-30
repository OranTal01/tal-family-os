-- Classify a saved transaction and maintain its matching monthly recurring
-- expense in one database transaction. The existing finance tables already
-- model recurring flows, so this migration adds only the atomic RPC boundary.

create or replace function public.update_transaction_classification_with_recurring(
  p_household_id     uuid,
  p_transaction_id  uuid,
  p_category_id     uuid,
  p_context         public.finance_context,
  p_owner_person_id uuid default null,
  p_remember_rule   boolean default false,
  p_is_recurring    boolean default false
)
returns table (
  transaction_id uuid,
  category_id uuid,
  category_name text,
  category_icon text,
  context public.finance_context,
  owner_person_id uuid,
  needs_review boolean,
  rule_saved boolean,
  is_recurring boolean
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_classification record;
  v_transaction public.transactions%rowtype;
  v_recurring public.recurring_transactions%rowtype;
  v_pattern text;
begin
  select result.*
    into v_classification
    from public.update_transaction_classification(
      p_household_id,
      p_transaction_id,
      p_category_id,
      p_context,
      p_owner_person_id,
      p_remember_rule
    ) result;

  select tx.*
    into v_transaction
    from public.transactions tx
   where tx.id = p_transaction_id
     and tx.household_id = p_household_id
     and tx.archived_at is null
   for update;

  if not found then
    raise exception 'transaction not found in this household';
  end if;

  v_pattern := app.normalize_merchant_pattern(v_transaction.merchant_name);
  if v_pattern = '' then
    raise exception 'merchant name cannot identify a recurring expense';
  end if;

  select rt.*
    into v_recurring
    from public.recurring_transactions rt
   where rt.household_id = p_household_id
     and rt.account_id is not distinct from v_transaction.account_id
     and app.normalize_merchant_pattern(rt.name) = v_pattern
   order by rt.active desc, rt.updated_at desc
   limit 1
   for update;

  if coalesce(p_is_recurring, false) then
    if v_transaction.kind <> 'expense' or v_transaction.amount >= 0 then
      raise exception 'only expense transactions can become recurring expenses';
    end if;

    if v_recurring.id is null then
      insert into public.recurring_transactions (
        household_id,
        name,
        amount,
        estimate,
        category_id,
        account_id,
        direction,
        day_of_month,
        cadence,
        context,
        active
      )
      values (
        p_household_id,
        trim(v_transaction.merchant_name),
        abs(v_transaction.amount),
        false,
        p_category_id,
        v_transaction.account_id,
        'outflow',
        extract(day from v_transaction.date)::integer,
        'monthly',
        p_context,
        true
      );
    else
      update public.recurring_transactions rt
         set name = trim(v_transaction.merchant_name),
             amount = abs(v_transaction.amount),
             estimate = false,
             category_id = p_category_id,
             account_id = v_transaction.account_id,
             direction = 'outflow',
             day_of_month = extract(day from v_transaction.date)::integer,
             cadence = 'monthly',
             context = p_context,
             active = true,
             updated_at = now()
       where rt.id = v_recurring.id
         and rt.household_id = p_household_id;
    end if;
  elsif v_recurring.id is not null and v_recurring.active then
    update public.recurring_transactions rt
       set active = false,
           updated_at = now()
     where rt.id = v_recurring.id
       and rt.household_id = p_household_id;
  end if;

  return query
  select
    v_classification.transaction_id,
    v_classification.category_id,
    v_classification.category_name,
    v_classification.category_icon,
    v_classification.context,
    v_classification.owner_person_id,
    v_classification.needs_review,
    v_classification.rule_saved,
    coalesce(p_is_recurring, false);
end
$$;

revoke all on function public.update_transaction_classification_with_recurring(
  uuid,
  uuid,
  uuid,
  public.finance_context,
  uuid,
  boolean,
  boolean
) from public;

grant execute on function public.update_transaction_classification_with_recurring(
  uuid,
  uuid,
  uuid,
  public.finance_context,
  uuid,
  boolean,
  boolean
) to authenticated;
