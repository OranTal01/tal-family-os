begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(10);

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'classification-owner@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"אורן"}'::jsonb,
    now(),
    now()
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'classification-outsider@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"אחר"}'::jsonb,
    now(),
    now()
  );

create temp table classification_results (
  household_id uuid,
  transaction_id uuid,
  category_id uuid,
  owner_person_id uuid,
  account_id uuid,
  returned_category_name text,
  returned_rule_saved boolean
);

grant select, insert, update on table classification_results to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000001',
  true
);
insert into classification_results (household_id)
values (public.create_household('בית סיווג תנועות'));
reset role;

update classification_results r
   set category_id = c.id,
       owner_person_id = p.id
  from public.categories c,
       public.people p
 where c.household_id = r.household_id
   and c.name = 'סופר וקניות'
   and p.household_id = r.household_id
   and p.profile_id = '40000000-0000-0000-0000-000000000001';

with inserted as (
  insert into public.financial_accounts (
    household_id,
    name,
    type,
    last4,
    is_asset
  )
  select household_id, 'כרטיס בדיקה', 'credit_card', '1234', false
    from classification_results
  returning id
)
update classification_results
   set account_id = inserted.id
  from inserted;

with inserted as (
  insert into public.transactions (
    household_id,
    account_id,
    date,
    amount,
    merchant_name,
    kind,
    needs_review,
    review_reason,
    created_by
  )
  select
    household_id,
    account_id,
    '2026-07-29',
    -4290,
    '  WOLT   ישראל ',
    'expense',
    true,
    'uncategorized',
    '40000000-0000-0000-0000-000000000001'
  from classification_results
  returning id
)
update classification_results
   set transaction_id = inserted.id
  from inserted;

insert into public.review_items (
  household_id,
  transaction_id,
  reason
)
select household_id, transaction_id, 'uncategorized'
  from classification_results;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000001',
  true
);
with current_values as (
  select
    household_id,
    transaction_id,
    category_id,
    owner_person_id
  from classification_results
),
updated as (
  select result.*
  from current_values values_to_save
  cross join lateral public.update_transaction_classification(
    values_to_save.household_id,
    values_to_save.transaction_id,
    values_to_save.category_id,
    'household',
    values_to_save.owner_person_id,
    true
  ) result
)
update classification_results r
   set returned_category_name = updated.category_name,
       returned_rule_saved = updated.rule_saved
  from updated;
reset role;

select extensions.is(
  (
    select
      tx.category_id::text || ':' ||
      tx.context::text || ':' ||
      tx.needs_review::text || ':' ||
      coalesce(tx.review_reason::text, '')
    from public.transactions tx
    where tx.id = (select transaction_id from classification_results)
  ),
  (
    select category_id::text || ':household:false:'
      from classification_results
  ),
  'the ledger row receives the saved category and leaves the review state'
);

select extensions.is(
  (
    select ri.status::text || ':' || (ri.resolved_at is not null)::text
      from public.review_items ri
     where ri.transaction_id = (
       select transaction_id from classification_results
     )
  ),
  'resolved:true',
  'an open review item is resolved atomically'
);

select extensions.is(
  (
    select
      mr.merchant_pattern || ':' ||
      mr.category_id::text || ':' ||
      mr.mark_as_transfer::text
      from public.merchant_rules mr
     where mr.household_id = (
       select household_id from classification_results
     )
       and mr.context = 'household'
  ),
  (
    select 'wolt ישראל:' || category_id::text || ':false'
      from classification_results
  ),
  'remembering the choice creates a normalized future-import rule'
);

select extensions.is(
  (
    select returned_category_name || ':' || returned_rule_saved::text
      from classification_results
  ),
  'סופר וקניות:true',
  'the RPC returns the presentation data required by the client'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000001',
  true
);
select extensions.is(
  (
    select result.is_recurring::text
      from classification_results values_to_save
      cross join lateral public.update_transaction_classification_with_recurring(
        values_to_save.household_id,
        values_to_save.transaction_id,
        values_to_save.category_id,
        'household',
        values_to_save.owner_person_id,
        false,
        true
      ) result
  ),
  'true',
  'the recurring wrapper returns the saved recurring state'
);
reset role;

select extensions.is(
  (
    select
      rt.amount::text || ':' ||
      rt.category_id::text || ':' ||
      rt.account_id::text || ':' ||
      rt.day_of_month::text || ':' ||
      rt.cadence::text || ':' ||
      rt.context::text || ':' ||
      rt.active::text
      from public.recurring_transactions rt
     where rt.household_id = (
       select household_id from classification_results
     )
       and app.normalize_merchant_pattern(rt.name) = 'wolt ישראל'
  ),
  (
    select
      '4290:' ||
      category_id::text || ':' ||
      account_id::text ||
      ':29:monthly:household:true'
      from classification_results
  ),
  'marking an expense recurring creates its private monthly template'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000001',
  true
);
select extensions.is(
  (
    select result.is_recurring::text
      from classification_results values_to_save
      cross join lateral public.update_transaction_classification_with_recurring(
        values_to_save.household_id,
        values_to_save.transaction_id,
        values_to_save.category_id,
        'household',
        values_to_save.owner_person_id,
        false,
        false
      ) result
  ),
  'false',
  'the recurring wrapper returns the cleared recurring state'
);
reset role;

select extensions.is(
  (
    select rt.active::text
      from public.recurring_transactions rt
     where rt.household_id = (
       select household_id from classification_results
     )
       and app.normalize_merchant_pattern(rt.name) = 'wolt ישראל'
  ),
  'false',
  'clearing recurring keeps history and deactivates the monthly template'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000001',
  true
);
select extensions.throws_ok(
  format(
    'select public.update_transaction_classification_with_recurring(%L, %L, %L, %L, %L, false, false)',
    (select household_id from classification_results),
    (select transaction_id from classification_results),
    (select category_id from classification_results),
    'business',
    (select owner_person_id from classification_results)
  ),
  'P0001',
  'transaction category context mismatch',
  'a category from another context is rejected'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000002',
  true
);
select extensions.throws_ok(
  format(
    'select public.update_transaction_classification_with_recurring(%L, %L, %L, %L, %L, false, false)',
    (select household_id from classification_results),
    (select transaction_id from classification_results),
    (select category_id from classification_results),
    'household',
    (select owner_person_id from classification_results)
  ),
  'P0001',
  'not authorized to classify transactions in this household',
  'a non-member cannot classify a household transaction'
);
reset role;

select extensions.finish();

rollback;
