-- Seed a real category catalog and atomically learn per-merchant import rules.
--
-- Categories are household-owned rows (not global lookup data), so families can
-- rename/archive them later. Learned merchant rules remain private to one
-- household and can differ between household and business contexts.

-- ---------------------------------------------------------------- category catalog

create or replace function app.seed_default_categories(p_household_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.households h where h.id = p_household_id
  ) then
    raise exception 'household not found while seeding categories';
  end if;

  insert into public.categories (
    household_id,
    name,
    short_name,
    icon,
    context,
    priority,
    sort_order
  )
  select
    p_household_id,
    defaults.name,
    defaults.short_name,
    defaults.icon,
    defaults.context::public.finance_context,
    defaults.priority::public.category_priority,
    defaults.sort_order
  from (
    values
      ('דיור ומשכנתא',       'דיור',      'home',              'household', 'essential',      1),
      ('סופר וקניות',        'סופר',      'shopping_cart',     'household', 'essential',      2),
      ('מסעדות ומשלוחים',    'מסעדות',    'restaurant',        'household', 'flexible',       3),
      ('ילדים',              'ילדים',     'child_care',        'household', 'important',      4),
      ('חינוך וצהרון',       'חינוך',     'school',            'household', 'essential',      5),
      ('מנקה',               'מנקה',      'cleaning_services', 'household', 'important',      6),
      ('חשמל',               'חשמל',      'bolt',              'household', 'essential',      7),
      ('אינטרנט וסלולר',     'תקשורת',    'wifi',              'household', 'essential',      8),
      ('ביגוד',              'ביגוד',     'checkroom',         'household', 'flexible',       9),
      ('תחבורה וחניה',       'תחבורה',    'directions_car',    'household', 'important',     10),
      ('ביטוחים',            'ביטוחים',   'shield',            'household', 'essential',     11),
      ('בריאות ופארם',       'בריאות',    'medication',        'household', 'important',     12),
      ('בילויים',            'בילויים',   'celebration',       'household', 'discretionary', 13),
      ('מתנות ואירועים',     'מתנות',     'redeem',            'household', 'discretionary', 14),
      ('חופשות ופנאי',       'חופשות',    'travel',            'household', 'discretionary', 15),
      ('עמלות ומסים',        'עמלות',     'receipt_long',      'household', 'important',     16),
      ('אחר לבית',           'אחר',       'category',          'household', 'flexible',      99),
      ('פרסום ושיווק',       'שיווק',     'campaign',          'business',  'important',      1),
      ('ציוד וטכנולוגיה',    'ציוד',      'devices',           'business',  'important',      2),
      ('שירותים מקצועיים',   'שירותים',   'work',              'business',  'essential',      3),
      ('נסיעות ופגישות',     'נסיעות',    'commute',           'business',  'important',      4),
      ('עמלות ומסים לעסק',   'מסים',      'request_quote',     'business',  'essential',      5),
      ('אחר לעסק',           'אחר',       'category',          'business',  'flexible',      99)
  ) as defaults(name, short_name, icon, context, priority, sort_order)
  on conflict do nothing;
end
$$;

revoke all on function app.seed_default_categories(uuid) from public;

do $$
declare
  v_household_id uuid;
begin
  for v_household_id in select h.id from public.households h
  loop
    perform app.seed_default_categories(v_household_id);
  end loop;
end
$$;

-- Keep new household creation self-contained.
create or replace function public.create_household(p_name text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_display_name text;
  v_household_id uuid;
begin
  if v_uid is null then
    raise exception 'must be signed in to create a household';
  end if;

  select p.display_name
    into v_display_name
    from public.profiles p
   where p.id = v_uid
   for update;

  if not found then
    raise exception 'profile not found for authenticated user';
  end if;

  select hm.household_id
    into v_household_id
    from public.household_members hm
   where hm.profile_id = v_uid
   order by hm.created_at, hm.id
   limit 1;

  if v_household_id is null then
    insert into public.households (name, created_by)
    values (coalesce(nullif(trim(p_name), ''), 'כספי הבית'), v_uid)
    returning id into v_household_id;

    insert into public.household_members (household_id, profile_id, role)
    values (v_household_id, v_uid, 'owner');
  end if;

  insert into public.people (household_id, profile_id, name, kind)
  select v_household_id, v_uid, v_display_name, 'adult'
  where not exists (
    select 1
      from public.people p
     where p.household_id = v_household_id
       and p.profile_id = v_uid
  );

  perform app.seed_default_categories(v_household_id);
  return v_household_id;
end
$$;

revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;

-- ---------------------------------------------------------------- learned rules

drop index public.merchant_rules_household_pattern_key;

create unique index merchant_rules_household_pattern_context_key
  on public.merchant_rules (household_id, merchant_pattern, context)
  where archived_at is null;

create or replace function app.normalize_merchant_pattern(p_value text)
returns text
language sql immutable
set search_path = ''
as $$
  select lower(regexp_replace(trim(p_value), '\s+', ' ', 'g'))
$$;

revoke all on function app.normalize_merchant_pattern(text) from public;

create or replace function public.commit_categorized_transaction_import(
  p_household_id      uuid,
  p_provider          text,
  p_display_file_name text,
  p_file_sha256       text,
  p_parser_version    text,
  p_rows              jsonb,
  p_skipped_count     integer default 0
)
returns table (
  batch_id       uuid,
  inserted_count integer,
  duplicate_count integer,
  review_count integer
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid             uuid := (select auth.uid());
  v_batch_id        uuid;
  v_inserted_count  integer;
  v_duplicate_count integer;
  v_review_count    integer;
  v_row             jsonb;
  v_remember_rule   boolean;
  v_merchant        text;
  v_category_id     uuid;
  v_context         public.finance_context;
  v_owner_person_id uuid;
  v_kind            public.transaction_kind;
begin
  select committed.batch_id,
         committed.inserted_count,
         committed.duplicate_count,
         committed.review_count
    into v_batch_id,
         v_inserted_count,
         v_duplicate_count,
         v_review_count
    from public.commit_transaction_import(
      p_household_id,
      p_provider,
      p_display_file_name,
      p_file_sha256,
      p_parser_version,
      p_rows,
      p_skipped_count
    ) committed;

  -- Income is intentionally uncategorized. It has its own income classification,
  -- so it must not enter the expense-category review queue.
  update public.transactions tx
     set needs_review = false,
         review_reason = null,
         updated_at = now()
    from public.import_rows ir
   where ir.batch_id = v_batch_id
     and ir.transaction_id = tx.id
     and tx.kind = 'income'
     and tx.category_id is null
     and tx.needs_review;

  update public.import_rows ir
     set committed_snapshot = app.transaction_import_snapshot(tx)
    from public.transactions tx
   where ir.batch_id = v_batch_id
     and ir.transaction_id = tx.id
     and tx.kind = 'income'
     and tx.category_id is null;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_remember_rule :=
      coalesce((v_row ->> 'remember_rule')::boolean, false);
    if not v_remember_rule then
      continue;
    end if;

    v_merchant := nullif(trim(v_row ->> 'merchant'), '');
    v_category_id := nullif(v_row ->> 'category_id', '')::uuid;
    v_context := (v_row ->> 'context')::public.finance_context;
    v_owner_person_id := nullif(v_row ->> 'owner_person_id', '')::uuid;
    v_kind := (v_row ->> 'kind')::public.transaction_kind;

    if v_category_id is null or v_kind not in ('expense', 'refund') then
      raise exception 'remembered import rules require an expense/refund category';
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
      app.normalize_merchant_pattern(v_merchant),
      v_category_id,
      v_context,
      v_owner_person_id,
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
  end loop;

  select count(*)::integer
    into v_review_count
    from public.import_rows ir
    join public.transactions tx on tx.id = ir.transaction_id
   where ir.batch_id = v_batch_id
     and tx.needs_review;

  update public.import_batches ib
     set review_count = v_review_count
   where ib.id = v_batch_id;

  return query
  select v_batch_id, v_inserted_count, v_duplicate_count, v_review_count;
end
$$;

revoke all on function public.commit_categorized_transaction_import(
  uuid, text, text, text, text, jsonb, integer
) from public;

grant execute on function public.commit_categorized_transaction_import(
  uuid, text, text, text, text, jsonb, integer
) to authenticated;
