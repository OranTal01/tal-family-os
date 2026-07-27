begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(15);

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
values (
  '30000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'category-owner@example.com',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"אורן"}'::jsonb,
  now(),
  now()
);

create temp table categorization_results (
  household_id uuid,
  household_batch uuid,
  business_batch uuid,
  pending_batch uuid
);

grant select, insert, update on table categorization_results to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);
insert into categorization_results (household_id)
values (public.create_household('בית קטגוריות'));
reset role;

select extensions.is(
  (
    select count(*)
      from public.categories c
     where c.household_id = (
       select household_id from categorization_results
     )
       and c.archived_at is null
  ),
  23::bigint,
  'household creation seeds the complete real category catalog'
);

select extensions.is(
  (
    select count(*)
      from public.categories c
     where c.household_id = (
       select household_id from categorization_results
     )
       and c.context = 'household'
       and c.archived_at is null
  ),
  17::bigint,
  'the catalog includes seventeen household categories'
);

select extensions.is(
  (
    select count(*)
      from public.categories c
     where c.household_id = (
       select household_id from categorization_results
     )
       and c.context = 'business'
       and c.archived_at is null
  ),
  6::bigint,
  'the catalog includes six Danielle-business categories'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);
select public.create_household('שם שלא יחליף');
reset role;

select extensions.is(
  (
    select count(*)
      from public.categories c
     where c.household_id = (
       select household_id from categorization_results
     )
       and c.archived_at is null
  ),
  23::bigint,
  'retrying household bootstrap does not duplicate categories'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);
update categorization_results
   set household_batch = committed.batch_id
  from public.commit_categorized_transaction_import(
    (select household_id from categorization_results),
    'cal',
    'household-category.xlsx',
    repeat('a', 64),
    'xlsx-v1',
    jsonb_build_array(
      jsonb_build_object(
        'source_row', 5,
        'fingerprint', repeat('1', 64),
        'account_type', 'credit_card',
        'masked_last4', '1234',
        'date', '2026-07-20',
        'amount', '-12500',
        'currency', 'ILS',
        'merchant', '  WOLT   ישראל ',
        'category_id', (
          select c.id
            from public.categories c
           where c.household_id = (
             select household_id from categorization_results
           )
             and c.name = 'מסעדות ומשלוחים'
        ),
        'context', 'household',
        'owner_person_id', (
          select p.id
            from public.people p
           where p.household_id = (
             select household_id from categorization_results
           )
             and p.profile_id = '30000000-0000-0000-0000-000000000001'
        ),
        'kind', 'expense',
        'status', 'cleared',
        'remember_rule', true
      )
    ),
    0
  ) committed;
reset role;

select extensions.ok(
  (select household_batch is not null from categorization_results),
  'categorized import returns a batch id'
);

select extensions.is(
  (
    select tx.needs_review::text || ':' || coalesce(tx.review_reason::text, '')
      from public.transactions tx
     where tx.household_id = (
       select household_id from categorization_results
     )
       and tx.merchant_name = 'WOLT   ישראל'
  ),
  'false:',
  'a categorized imported transaction does not enter the review queue'
);

select extensions.is(
  (
    select mr.merchant_pattern || ':' || c.name
      from public.merchant_rules mr
      join public.categories c on c.id = mr.category_id
     where mr.household_id = (
       select household_id from categorization_results
     )
       and mr.context = 'household'
  ),
  'wolt ישראל:מסעדות ומשלוחים',
  'remember rule stores a normalized private merchant pattern'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);
update categorization_results
   set business_batch = committed.batch_id
  from public.commit_categorized_transaction_import(
    (select household_id from categorization_results),
    'fibi',
    'business-category.xlsx',
    repeat('b', 64),
    'xlsx-v1',
    jsonb_build_array(
      jsonb_build_object(
        'source_row', 6,
        'fingerprint', repeat('2', 64),
        'account_type', 'bank',
        'masked_last4', '5678',
        'date', '2026-07-21',
        'amount', '-25000',
        'currency', 'ILS',
        'merchant', 'WOLT ישראל',
        'category_id', (
          select c.id
            from public.categories c
           where c.household_id = (
             select household_id from categorization_results
           )
             and c.name = 'נסיעות ופגישות'
        ),
        'context', 'business',
        'owner_person_id', (
          select p.id
            from public.people p
           where p.household_id = (
             select household_id from categorization_results
           )
             and p.profile_id = '30000000-0000-0000-0000-000000000001'
        ),
        'kind', 'expense',
        'status', 'cleared',
        'remember_rule', true
      ),
      jsonb_build_object(
        'source_row', 7,
        'fingerprint', repeat('4', 64),
        'account_type', 'bank',
        'masked_last4', '5678',
        'date', '2026-07-21',
        'amount', '50000',
        'currency', 'ILS',
        'merchant', 'תשלום מלקוחה בביט',
        'context', 'business',
        'owner_person_id', (
          select p.id
            from public.people p
           where p.household_id = (
             select household_id from categorization_results
           )
             and p.profile_id = '30000000-0000-0000-0000-000000000001'
        ),
        'kind', 'income',
        'income_class', 'business',
        'status', 'cleared',
        'remember_rule', false
      )
    ),
    0
  ) committed;
reset role;

select extensions.ok(
  (select business_batch is not null from categorization_results),
  'the same merchant can also be categorized in business context'
);

select extensions.is(
  (
    select count(*)
      from public.merchant_rules mr
     where mr.household_id = (
       select household_id from categorization_results
     )
       and mr.merchant_pattern = 'wolt ישראל'
  ),
  2::bigint,
  'one merchant can retain separate household and business rules'
);

select extensions.is(
  (
    select tx.needs_review::text || ':' ||
           coalesce(tx.review_reason::text, '')
      from public.transactions tx
     where tx.household_id = (
       select household_id from categorization_results
     )
       and tx.merchant_name = 'תשלום מלקוחה בביט'
  ),
  'false:',
  'income uses income classification and does not require an expense category'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);
update categorization_results
   set pending_batch = committed.batch_id
  from public.commit_categorized_transaction_import(
    (select household_id from categorization_results),
    'isracard',
    'pending-category.xlsx',
    repeat('d', 64),
    'xlsx-v1',
    jsonb_build_array(
      jsonb_build_object(
        'source_row', 14,
        'fingerprint', repeat('5', 64),
        'account_type', 'credit_card',
        'masked_last4', '9485',
        'date', '2026-07-24',
        'amount', '-22020',
        'currency', 'ILS',
        'merchant', 'MYST',
        'category_id', (
          select c.id
            from public.categories c
           where c.household_id = (
             select household_id from categorization_results
           )
             and c.name = 'אחר לבית'
        ),
        'context', 'household',
        'owner_person_id', (
          select p.id
            from public.people p
           where p.household_id = (
             select household_id from categorization_results
           )
             and p.profile_id = '30000000-0000-0000-0000-000000000001'
        ),
        'kind', 'expense',
        'status', 'pending',
        'remember_rule', false
      )
    ),
    0
  ) committed;
reset role;

select extensions.is(
  (
    select tx.status::text
      from public.transactions tx
     where tx.household_id = (
       select household_id from categorization_results
     )
       and tx.merchant_name = 'MYST'
  ),
  'pending',
  'a reviewed pending card transaction keeps its provider status'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);
select extensions.is(
  (
    select rolled_back.archived_count::text || ':' ||
           rolled_back.conflict_count::text
      from public.rollback_transaction_import(
        (select business_batch from categorization_results)
      ) rolled_back
  ),
  '2:0',
  'categorized expenses and income remain safely reversible as one import'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);
select extensions.throws_ok(
  format(
    'select * from public.commit_categorized_transaction_import(%L, %L, %L, %L, %L, %L::jsonb, 0)',
    (select household_id from categorization_results),
    'fibi',
    'invalid-remember-rule.xlsx',
    repeat('c', 64),
    'xlsx-v1',
    jsonb_build_array(
      jsonb_build_object(
        'source_row', 7,
        'fingerprint', repeat('3', 64),
        'account_type', 'bank',
        'masked_last4', '5678',
        'date', '2026-07-22',
        'amount', '50000',
        'currency', 'ILS',
        'merchant', 'הכנסה ללא קטגוריה',
        'context', 'business',
        'kind', 'income',
        'income_class', 'business',
        'status', 'cleared',
        'remember_rule', true
      )
    )::text
  ),
  'P0001',
  'remembered import rules require an expense/refund category',
  'invalid remembered rules reject the whole categorized import'
);
reset role;

select extensions.is(
  (
    select count(*)
      from public.import_batches ib
     where ib.file_sha256 = repeat('c', 64)
  ),
  0::bigint,
  'a failed learned rule leaves no partial import batch'
);

select extensions.is(
  (
    select count(*)
      from public.transactions tx
     where tx.merchant_name = 'הכנסה ללא קטגוריה'
  ),
  0::bigint,
  'a failed learned rule leaves no partial transaction'
);

select * from extensions.finish();

rollback;
