begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(16);

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
    '60000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'balance-owner@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"אורן"}'::jsonb,
    now(),
    now()
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'balance-outsider@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"אחר"}'::jsonb,
    now(),
    now()
  );

create temp table balance_test_result (
  household_id uuid,
  batch_id uuid
);

grant select, insert, update on table balance_test_result to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '60000000-0000-0000-0000-000000000001',
  true
);

insert into balance_test_result (household_id)
values (public.create_household('בית בדיקת יתרות'));

select extensions.lives_ok(
  format(
    $call$
      insert into balance_test_result (household_id, batch_id)
      select %1$L::uuid, imported.batch_id
        from public.commit_categorized_transaction_import_with_balances(
          %1$L::uuid,
          'fibi',
          'bank.xlsx',
          %2$L,
          'xlsx-v1',
          jsonb_build_array(
            jsonb_build_object(
              'source_row', 7,
              'fingerprint', %3$L,
              'account_type', 'bank',
              'masked_last4', '3270',
              'date', '2026-07-25',
              'amount', '300000',
              'currency', 'ILS',
              'merchant', 'זיכוי מיידי',
              'context', 'household',
              'kind', 'income',
              'income_class', 'other',
              'status', 'cleared',
              'remember_rule', false,
              'allow_duplicate', false
            )
          ),
          jsonb_build_array(
            jsonb_build_object(
              'account_type', 'bank',
              'masked_last4', '3270',
              'balance', '10201465',
              'snapshot_date', '2026-07-25'
            )
          ),
          4
        ) imported
    $call$,
    (select household_id::text from balance_test_result limit 1),
    repeat('a', 64),
    repeat('b', 64)
  ),
  'a reviewed bank import stores its reported balance atomically'
);

select extensions.is(
  (
    select count(*)::integer
      from public.account_balance_snapshots abs
     where abs.household_id = (
       select household_id from balance_test_result limit 1
     )
  ),
  1,
  'one balance snapshot is stored'
);

select extensions.is(
  (
    select abs.balance
      from public.account_balance_snapshots abs
     where abs.household_id = (
       select household_id from balance_test_result limit 1
     )
  ),
  10201465::bigint,
  'the provider balance remains integer agorot'
);

select extensions.is(
  (
    select abs.snapshot_date
      from public.account_balance_snapshots abs
     where abs.household_id = (
       select household_id from balance_test_result limit 1
     )
  ),
  '2026-07-25'::date,
  'the provider balance date is preserved'
);

select extensions.ok(
  exists (
    select 1
      from public.account_balance_snapshots abs
      join public.import_account_mappings iam
        on iam.financial_account_id = abs.financial_account_id
       and iam.household_id = abs.household_id
     where iam.provider = 'fibi'
       and iam.account_type = 'bank'
       and iam.masked_last4 = '3270'
  ),
  'the snapshot is linked to the imported bank account'
);

select extensions.lives_ok(
  format(
    $call$
      select *
        from public.commit_categorized_transaction_import_with_balances(
          %1$L::uuid,
          'fibi',
          'bank.xlsx',
          %2$L,
          'xlsx-v1',
          jsonb_build_array(
            jsonb_build_object(
              'source_row', 7,
              'fingerprint', %3$L,
              'account_type', 'bank',
              'masked_last4', '3270',
              'date', '2026-07-25',
              'amount', '300000',
              'currency', 'ILS',
              'merchant', 'זיכוי מיידי',
              'context', 'household',
              'kind', 'income',
              'income_class', 'other',
              'status', 'cleared'
            )
          ),
          jsonb_build_array(
            jsonb_build_object(
              'account_type', 'bank',
              'masked_last4', '3270',
              'balance', '10201465',
              'snapshot_date', '2026-07-25'
            )
          ),
          5,
          jsonb_build_array(
            jsonb_build_object(
              'source_row', 13,
              'fingerprint', %4$L,
              'account_type', 'bank',
              'masked_last4', '3270',
              'date', '2026-07-13',
              'amount', '-50000',
              'merchant', 'הראל פנסיה וגמל',
              'movement_type', 'savings_contribution'
            )
          )
        )
    $call$,
    (select household_id::text from balance_test_result limit 1),
    repeat('a', 64),
    repeat('b', 64),
    repeat('e', 64)
  ),
  'an already-imported bank file can backfill a savings contribution'
);

select extensions.is(
  (
    select count(*)::integer
      from public.observed_financial_movements movement
     where movement.household_id = (
       select household_id from balance_test_result limit 1
     )
  ),
  1,
  'one non-spending movement is stored'
);

select extensions.is(
  (
    select movement.movement_type
      from public.observed_financial_movements movement
     where movement.household_id = (
       select household_id from balance_test_result limit 1
     )
  ),
  'savings_contribution',
  'the movement remains explicitly identified as savings'
);

select extensions.is(
  (
    select movement.amount
      from public.observed_financial_movements movement
     where movement.household_id = (
       select household_id from balance_test_result limit 1
     )
  ),
  (-50000)::bigint,
  'the contribution preserves its signed bank amount'
);

select extensions.throws_ok(
  format(
    $call$
      select *
        from public.commit_categorized_transaction_import_with_balances(
          %1$L::uuid,
          'fibi',
          'invalid-card-snapshot.xlsx',
          %2$L,
          'xlsx-v1',
          jsonb_build_array(
            jsonb_build_object(
              'source_row', 8,
              'fingerprint', %3$L,
              'account_type', 'bank',
              'masked_last4', '3270',
              'date', '2026-07-26',
              'amount', '10000',
              'currency', 'ILS',
              'merchant', 'הכנסה',
              'context', 'household',
              'kind', 'income',
              'income_class', 'other',
              'status', 'cleared'
            )
          ),
          jsonb_build_array(
            jsonb_build_object(
              'account_type', 'credit_card',
              'masked_last4', '3270',
              'balance', '1000',
              'snapshot_date', '2026-07-26'
            )
          ),
          0
        )
    $call$,
    (select household_id::text from balance_test_result limit 1),
    repeat('c', 64),
    repeat('d', 64)
  ),
  'P0001',
  'only bank balance snapshots are supported',
  'invalid snapshot metadata rolls back the entire import'
);

select extensions.is(
  (
    select count(*)::integer
      from public.import_batches ib
     where ib.household_id = (
       select household_id from balance_test_result limit 1
     )
  ),
  1,
  'a failed snapshot write leaves no partial import batch'
);

select extensions.lives_ok(
  format(
    $call$
      select *
        from public.commit_categorized_transaction_import_with_balances(
          %1$L::uuid,
          'fibi',
          'bank.xlsx',
          %2$L,
          'xlsx-v1',
          jsonb_build_array(
            jsonb_build_object(
              'source_row', 7,
              'fingerprint', %3$L,
              'account_type', 'bank',
              'masked_last4', '3270',
              'date', '2026-07-25',
              'amount', '300000',
              'currency', 'ILS',
              'merchant', 'זיכוי מיידי',
              'context', 'household',
              'kind', 'income',
              'income_class', 'other',
              'status', 'cleared'
            )
          ),
          jsonb_build_array(
            jsonb_build_object(
              'account_type', 'bank',
              'masked_last4', '3270',
              'balance', '10201465',
              'snapshot_date', '2026-07-25'
            )
          ),
          4
        )
    $call$,
    (select household_id::text from balance_test_result limit 1),
    repeat('a', 64),
    repeat('b', 64)
  ),
  'an already-imported bank file can safely backfill or confirm its balance'
);

select extensions.is(
  (
    select count(*)::integer
      from public.account_balance_snapshots abs
     where abs.household_id = (
       select household_id from balance_test_result limit 1
     )
  ),
  1,
  'reusing an import never duplicates its account balance snapshot'
);

update balance_test_result r
   set batch_id = (
     select ib.id
       from public.import_batches ib
      where ib.household_id = r.household_id
      order by ib.created_at
      limit 1
   )
 where r.batch_id is null;

select extensions.lives_ok(
  format(
    'select * from public.rollback_transaction_import(%L::uuid)',
    (select batch_id::text from balance_test_result where batch_id is not null limit 1)
  ),
  'the source import can still be rolled back safely'
);

select extensions.is(
  (
    select count(*)::integer
      from public.account_balance_snapshots abs
     where abs.household_id = (
       select household_id from balance_test_result limit 1
     )
  ),
  1,
  'the immutable snapshot remains available for import audit'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '60000000-0000-0000-0000-000000000002',
  true
);

select extensions.is(
  (
    select count(*)::integer
      from public.account_balance_snapshots
  ),
  0,
  'RLS hides another household balance snapshots'
);

reset role;

select * from extensions.finish();
rollback;
