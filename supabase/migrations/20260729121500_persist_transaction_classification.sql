-- Persist a correction from the transaction detail sheet in one transaction.
-- The function updates the ledger row, resolves any open review item, and
-- optionally learns a merchant rule for future imports.

create or replace function public.update_transaction_classification(
  p_household_id    uuid,
  p_transaction_id uuid,
  p_category_id    uuid,
  p_context        public.finance_context,
  p_owner_person_id uuid default null,
  p_remember_rule  boolean default false
)
returns table (
  transaction_id uuid,
  category_id uuid,
  category_name text,
  category_icon text,
  context public.finance_context,
  owner_person_id uuid,
  needs_review boolean,
  rule_saved boolean
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid         uuid := (select auth.uid());
  v_role        public.member_role;
  v_transaction public.transactions%rowtype;
  v_category    public.categories%rowtype;
  v_pattern     text;
begin
  v_role := app.household_role(p_household_id);
  if v_uid is null or v_role is null or v_role not in ('owner', 'member') then
    raise exception 'not authorized to classify transactions in this household';
  end if;

  if p_context is null then
    raise exception 'transaction context is required';
  end if;

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

  if v_transaction.kind = 'transfer' then
    raise exception 'transfer transactions require the internal transfer workflow';
  end if;

  if v_transaction.kind in ('expense', 'refund') and p_category_id is null then
    raise exception 'expense and refund transactions require a category';
  end if;

  if v_transaction.kind = 'income' and p_category_id is not null then
    raise exception 'income transactions cannot use an expense category';
  end if;

  if p_category_id is not null then
    select c.*
      into v_category
      from public.categories c
     where c.id = p_category_id
       and c.household_id = p_household_id
       and c.archived_at is null;

    if not found then
      raise exception 'category not found in this household';
    end if;

    if v_category.context <> p_context then
      raise exception 'transaction category context mismatch';
    end if;
  end if;

  if p_owner_person_id is not null and not exists (
    select 1
      from public.people p
     where p.id = p_owner_person_id
       and p.household_id = p_household_id
       and p.archived_at is null
  ) then
    raise exception 'transaction owner not found in this household';
  end if;

  if coalesce(p_remember_rule, false) and p_category_id is null then
    raise exception 'a merchant rule requires a category';
  end if;

  update public.transactions tx
     set category_id = p_category_id,
         context = p_context,
         owner_person_id = p_owner_person_id,
         needs_review = false,
         review_reason = null
   where tx.id = p_transaction_id
     and tx.household_id = p_household_id;

  update public.review_items ri
     set status = 'resolved',
         resolved_by = v_uid,
         resolved_at = now(),
         resolution = jsonb_build_object(
           'category_id', p_category_id,
           'context', p_context,
           'owner_person_id', p_owner_person_id,
           'is_transfer', false,
           'remember_rule', coalesce(p_remember_rule, false)
         )
   where ri.transaction_id = p_transaction_id
     and ri.household_id = p_household_id
     and ri.status = 'open';

  if coalesce(p_remember_rule, false) then
    v_pattern := app.normalize_merchant_pattern(v_transaction.merchant_name);
    if v_pattern = '' then
      raise exception 'merchant name cannot create an empty rule';
    end if;

    insert into public.merchant_rules (
      household_id,
      merchant_pattern,
      category_id,
      context,
      owner_person_id,
      mark_as_transfer,
      created_by
    )
    values (
      p_household_id,
      v_pattern,
      p_category_id,
      p_context,
      p_owner_person_id,
      false,
      v_uid
    )
    on conflict (household_id, merchant_pattern, context)
      where archived_at is null
    do update
      set category_id = excluded.category_id,
          owner_person_id = excluded.owner_person_id,
          mark_as_transfer = false,
          created_by = excluded.created_by,
          updated_at = now();
  end if;

  return query
  select
    tx.id,
    tx.category_id,
    c.name,
    c.icon,
    tx.context,
    tx.owner_person_id,
    tx.needs_review,
    coalesce(p_remember_rule, false)
  from public.transactions tx
  left join public.categories c
    on c.id = tx.category_id
   and c.household_id = tx.household_id
  where tx.id = p_transaction_id
    and tx.household_id = p_household_id;
end
$$;

revoke all on function public.update_transaction_classification(
  uuid,
  uuid,
  uuid,
  public.finance_context,
  uuid,
  boolean
) from public;

grant execute on function public.update_transaction_classification(
  uuid,
  uuid,
  uuid,
  public.finance_context,
  uuid,
  boolean
) to authenticated;
