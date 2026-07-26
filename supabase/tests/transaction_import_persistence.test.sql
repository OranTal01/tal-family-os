begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(40);

-- Five Auth users exercise owner/member/viewer/outsider boundaries.
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
    '20000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'import-owner@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"בעלים"}'::jsonb,
    now(),
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'import-member@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"חבר"}'::jsonb,
    now(),
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'import-viewer@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"צופה"}'::jsonb,
    now(),
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'import-outsider@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"מחוץ לבית"}'::jsonb,
    now(),
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    'authenticated',
    'authenticated',
    'import-danielle@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"דניאל"}'::jsonb,
    now(),
    now()
  );

insert into public.households (id, name, created_by)
values
  (
    '20000000-0000-0000-0000-000000000010',
    'בית בדיקת ייבוא',
    '20000000-0000-0000-0000-000000000001'
  ),
  (
    '20000000-0000-0000-0000-000000000020',
    'בית אחר',
    '20000000-0000-0000-0000-000000000004'
  );

insert into public.household_members (household_id, profile_id, role)
values
  (
    '20000000-0000-0000-0000-000000000010',
    '20000000-0000-0000-0000-000000000001',
    'owner'
  ),
  (
    '20000000-0000-0000-0000-000000000010',
    '20000000-0000-0000-0000-000000000002',
    'member'
  ),
  (
    '20000000-0000-0000-0000-000000000010',
    '20000000-0000-0000-0000-000000000003',
    'viewer'
  ),
  (
    '20000000-0000-0000-0000-000000000020',
    '20000000-0000-0000-0000-000000000004',
    'owner'
  );

insert into public.people (
  id,
  household_id,
  profile_id,
  name,
  kind
)
values
  (
    '20000000-0000-0000-0000-000000000101',
    '20000000-0000-0000-0000-000000000010',
    '20000000-0000-0000-0000-000000000001',
    'אורן',
    'adult'
  ),
  (
    '20000000-0000-0000-0000-000000000102',
    '20000000-0000-0000-0000-000000000010',
    '20000000-0000-0000-0000-000000000005',
    'דניאל',
    'adult'
  ),
  (
    '20000000-0000-0000-0000-000000000103',
    '20000000-0000-0000-0000-000000000020',
    '20000000-0000-0000-0000-000000000004',
    'אדם אחר',
    'adult'
  );

insert into public.financial_accounts (
  id,
  household_id,
  name,
  type,
  owner_person_id,
  institution,
  last4,
  is_asset,
  context
)
values
  (
    '20000000-0000-0000-0000-000000000201',
    '20000000-0000-0000-0000-000000000010',
    'הבינלאומי משותף',
    'bank',
    null,
    'הבנק הבינלאומי',
    '3456',
    true,
    'household'
  ),
  (
    '20000000-0000-0000-0000-000000000202',
    '20000000-0000-0000-0000-000000000010',
    'כאל דניאל',
    'credit_card',
    '20000000-0000-0000-0000-000000000102',
    'כאל',
    '1639',
    false,
    'household'
  ),
  (
    '20000000-0000-0000-0000-000000000203',
    '20000000-0000-0000-0000-000000000020',
    'חשבון בבית אחר',
    'bank',
    '20000000-0000-0000-0000-000000000103',
    'בנק אחר',
    '9999',
    true,
    'household'
  );

insert into public.categories (
  id,
  household_id,
  name,
  short_name,
  icon,
  context
)
values
  (
    '20000000-0000-0000-0000-000000000301',
    '20000000-0000-0000-0000-000000000010',
    'ציוד לבית',
    'ציוד',
    'home',
    'household'
  ),
  (
    '20000000-0000-0000-0000-000000000302',
    '20000000-0000-0000-0000-000000000010',
    'ציוד לעסק',
    'עסק',
    'storefront',
    'business'
  );

create temp table import_test_payloads (
  name text primary key,
  rows jsonb not null
);

create temp table import_test_results (
  initial_batch uuid,
  duplicate_batch uuid,
  allowed_batch uuid,
  reimport_batch uuid,
  inserted_count integer,
  duplicate_count integer,
  archived_count integer,
  conflict_count integer
);

grant select on table import_test_payloads to authenticated;
grant select, insert, update on table import_test_results to authenticated;

insert into import_test_payloads (name, rows)
values
  (
    'initial',
    jsonb_build_array(
      jsonb_build_object(
        'source_row', 8,
        'fingerprint', repeat('a', 64),
        'account_type', 'bank',
        'masked_last4', '3456',
        'account_id', '20000000-0000-0000-0000-000000000201',
        'date', '2026-07-01',
        'amount', '50000',
        'currency', 'ILS',
        'merchant', 'תשלום מלקוחה בביט',
        'reference', '1001',
        'context', 'business',
        'owner_person_id', '20000000-0000-0000-0000-000000000102',
        'kind', 'income',
        'income_class', 'business',
        'status', 'cleared'
      ),
      jsonb_build_object(
        'source_row', 9,
        'fingerprint', repeat('b', 64),
        'account_type', 'bank',
        'masked_last4', '3456',
        'account_id', '20000000-0000-0000-0000-000000000201',
        'date', '2026-07-02',
        'amount', '-12345',
        'currency', 'ILS',
        'merchant', 'ציוד לבית',
        'reference', '1002',
        'category_id', '20000000-0000-0000-0000-000000000301',
        'context', 'household',
        'owner_person_id', '20000000-0000-0000-0000-000000000102',
        'kind', 'expense',
        'status', 'cleared'
      )
    )
  ),
  (
    'duplicate',
    jsonb_build_array(
      jsonb_build_object(
        'source_row', 8,
        'fingerprint', repeat('a', 64),
        'account_type', 'bank',
        'masked_last4', '3456',
        'account_id', '20000000-0000-0000-0000-000000000201',
        'date', '2026-07-01',
        'amount', '50000',
        'currency', 'ILS',
        'merchant', 'תשלום מלקוחה בביט',
        'reference', '1001',
        'context', 'business',
        'owner_person_id', '20000000-0000-0000-0000-000000000102',
        'kind', 'income',
        'income_class', 'business',
        'status', 'cleared'
      )
    )
  ),
  (
    'allowed_duplicate',
    jsonb_build_array(
      jsonb_build_object(
        'source_row', 8,
        'fingerprint', repeat('a', 64),
        'account_type', 'bank',
        'masked_last4', '3456',
        'account_id', '20000000-0000-0000-0000-000000000201',
        'date', '2026-07-01',
        'amount', '50000',
        'currency', 'ILS',
        'merchant', 'תשלום מלקוחה בביט',
        'reference', '1001',
        'context', 'business',
        'owner_person_id', '20000000-0000-0000-0000-000000000102',
        'kind', 'income',
        'income_class', 'business',
        'status', 'cleared',
        'allow_duplicate', true
      )
    )
  ),
  (
    'cross_household',
    jsonb_build_array(
      jsonb_build_object(
        'source_row', 10,
        'fingerprint', repeat('c', 64),
        'account_type', 'bank',
        'masked_last4', '9999',
        'account_id', '20000000-0000-0000-0000-000000000203',
        'date', '2026-07-03',
        'amount', '-1000',
        'currency', 'ILS',
        'merchant', 'אסור',
        'context', 'household',
        'kind', 'expense',
        'status', 'cleared'
      )
    )
  ),
  (
    'pending',
    jsonb_build_array(
      jsonb_build_object(
        'source_row', 11,
        'fingerprint', repeat('d', 64),
        'account_type', 'bank',
        'masked_last4', '3456',
        'account_id', '20000000-0000-0000-0000-000000000201',
        'date', '2026-07-04',
        'amount', '-1000',
        'currency', 'ILS',
        'merchant', 'ממתינה',
        'context', 'household',
        'kind', 'expense',
        'status', 'pending'
      )
    )
  ),
  (
    'transfer',
    jsonb_build_array(
      jsonb_build_object(
        'source_row', 12,
        'fingerprint', repeat('e', 64),
        'account_type', 'bank',
        'masked_last4', '3456',
        'account_id', '20000000-0000-0000-0000-000000000201',
        'date', '2026-07-05',
        'amount', '-1000',
        'currency', 'ILS',
        'merchant', 'העברה',
        'context', 'household',
        'kind', 'transfer',
        'status', 'cleared'
      )
    )
  ),
  (
    'automatic_account',
    jsonb_build_array(
      jsonb_build_object(
        'source_row', 13,
        'fingerprint', repeat('9', 64),
        'account_type', 'credit_card',
        'masked_last4', '8888',
        'date', '2026-07-06',
        'amount', '-2500',
        'currency', 'ILS',
        'merchant', 'חשבון חדש אוטומטי',
        'context', 'household',
        'owner_person_id', '20000000-0000-0000-0000-000000000103',
        'kind', 'expense',
        'status', 'cleared'
      )
    )
  );

set local role authenticated;
select extensions.throws_ok(
  format(
    'select * from public.commit_transaction_import(%L, %L, %L, %L, %L, %L::jsonb, 0)',
    '20000000-0000-0000-0000-000000000010',
    'fibi',
    'initial.xlsx',
    repeat('f', 64),
    'fibi-v1',
    (select rows::text from import_test_payloads where name = 'initial')
  ),
  'P0001',
  'must be signed in to import transactions',
  'a role without an authenticated user cannot import'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000003',
  true
);
select extensions.throws_ok(
  format(
    'select * from public.commit_transaction_import(%L, %L, %L, %L, %L, %L::jsonb, 0)',
    '20000000-0000-0000-0000-000000000010',
    'fibi',
    'viewer.xlsx',
    repeat('1', 64),
    'fibi-v1',
    (select rows::text from import_test_payloads where name = 'initial')
  ),
  'P0001',
  'not authorized to import transactions in this household',
  'a viewer cannot import'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000004',
  true
);
select extensions.throws_ok(
  format(
    'select * from public.commit_transaction_import(%L, %L, %L, %L, %L, %L::jsonb, 0)',
    '20000000-0000-0000-0000-000000000010',
    'fibi',
    'outsider.xlsx',
    repeat('2', 64),
    'fibi-v1',
    (select rows::text from import_test_payloads where name = 'initial')
  ),
  'P0001',
  'not authorized to import transactions in this household',
  'a different household cannot import'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000002',
  true
);

insert into import_test_results (
  initial_batch,
  inserted_count,
  duplicate_count
)
select batch_id, inserted_count, duplicate_count
  from public.commit_transaction_import(
    '20000000-0000-0000-0000-000000000010',
    'fibi',
    'initial.xlsx',
    repeat('f', 64),
    'fibi-v1',
    (select rows from import_test_payloads where name = 'initial'),
    0
  );
reset role;

select extensions.ok(
  (select initial_batch is not null from import_test_results),
  'a member receives an import batch id'
);

select extensions.is(
  (select inserted_count from import_test_results),
  2,
  'the initial import inserts both classified rows'
);

select extensions.is(
  (select duplicate_count from import_test_results),
  0,
  'the initial import has no duplicates'
);

select extensions.is(
  (
    select count(*)
      from public.transactions tx
     where tx.household_id = '20000000-0000-0000-0000-000000000010'
       and tx.archived_at is null
  ),
  2::bigint,
  'the import created two active ledger transactions'
);

select extensions.is(
  (
    select tx.context::text || ':' || tx.kind::text || ':' || tx.income_class::text
      from public.transactions tx
     where tx.merchant_name = 'תשלום מלקוחה בביט'
  ),
  'business:income:business',
  'a Bit receipt can retain business-income classification in the shared account'
);

select extensions.is(
  (
    select tx.amount::text || ':' || tx.context::text || ':' || tx.category_id::text
      from public.transactions tx
     where tx.merchant_name = 'ציוד לבית'
  ),
  '-12345:household:20000000-0000-0000-0000-000000000301',
  'the household expense retains signed agorot, context, and category'
);

select extensions.is(
  (
    select count(*)
      from public.import_account_mappings iam
     where iam.household_id = '20000000-0000-0000-0000-000000000010'
       and iam.provider = 'fibi'
       and iam.masked_last4 = '3456'
  ),
  1::bigint,
  'the shared FIBI source is mapped once'
);

select extensions.is(
  (
    select ib.created_by
      from public.import_batches ib
     where ib.id = (
       select initial_batch
         from import_test_results
        where initial_batch is not null
     )
  ),
  '20000000-0000-0000-0000-000000000002'::uuid,
  'the batch records the trusted authenticated creator'
);

select extensions.is(
  (
    select count(*)
      from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name = 'import_batches'
       and c.column_name in ('raw_file', 'raw_rows', 'file_contents')
  ),
  0::bigint,
  'the schema stores no raw source file or raw-row column'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000003',
  true
);
select extensions.is(
  (select count(*) from public.import_batches),
  1::bigint,
  'a household viewer can read the household import receipt'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000004',
  true
);
select extensions.is(
  (select count(*) from public.import_batches),
  0::bigint,
  'an outsider cannot read another household import receipt'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000002',
  true
);
select extensions.throws_ok(
  $$ insert into public.import_batches (
       household_id, provider, display_file_name, file_sha256, parser_version,
       detected_count, created_by
     )
     values (
       '20000000-0000-0000-0000-000000000010', 'fibi', 'direct.xlsx',
       repeat('3', 64), 'fibi-v1', 1,
       '20000000-0000-0000-0000-000000000002'
     ) $$,
  '42501',
  'permission denied for table import_batches',
  'clients cannot insert import receipts directly'
);

select extensions.throws_ok(
  $$ insert into public.import_account_mappings (
       household_id, provider, account_type, masked_last4,
       financial_account_id, created_by
     )
     values (
       '20000000-0000-0000-0000-000000000010', 'cal', 'credit_card', '1639',
       '20000000-0000-0000-0000-000000000202',
       '20000000-0000-0000-0000-000000000002'
     ) $$,
  '42501',
  'permission denied for table import_account_mappings',
  'clients cannot alter account mappings outside the trusted RPC'
);

insert into import_test_results (duplicate_batch, inserted_count, duplicate_count)
select batch_id, inserted_count, duplicate_count
  from public.commit_transaction_import(
    '20000000-0000-0000-0000-000000000010',
    'fibi',
    'duplicate.xlsx',
    repeat('4', 64),
    'fibi-v1',
    (select rows from import_test_payloads where name = 'duplicate'),
    0
  );
reset role;

select extensions.is(
  (
    select duplicate_count
      from import_test_results
     where duplicate_batch is not null
  ),
  1,
  'a matching fingerprint is recorded as a duplicate'
);

select extensions.is(
  (
    select count(*)
      from public.transactions tx
     where tx.household_id = '20000000-0000-0000-0000-000000000010'
       and tx.archived_at is null
  ),
  2::bigint,
  'a duplicate warning does not create another transaction'
);

select extensions.is(
  (
    select ir.status || ':' || (ir.duplicate_of_transaction_id is not null)::text
      from public.import_rows ir
     where ir.batch_id = (
       select duplicate_batch
         from import_test_results
        where duplicate_batch is not null
     )
  ),
  'duplicate:true',
  'duplicate provenance links to the existing transaction'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000002',
  true
);
select extensions.throws_ok(
  format(
    'select * from public.commit_transaction_import(%L, %L, %L, %L, %L, %L::jsonb, 0)',
    '20000000-0000-0000-0000-000000000010',
    'fibi',
    'same-file-again.xlsx',
    repeat('f', 64),
    'fibi-v1',
    (select rows::text from import_test_payloads where name = 'initial')
  ),
  'P0001',
  'this source file already has an active import',
  'the same active source file cannot be imported twice'
);

insert into import_test_results (allowed_batch, inserted_count, duplicate_count)
select batch_id, inserted_count, duplicate_count
  from public.commit_transaction_import(
    '20000000-0000-0000-0000-000000000010',
    'fibi',
    'allowed-duplicate.xlsx',
    repeat('5', 64),
    'fibi-v1',
    (select rows from import_test_payloads where name = 'allowed_duplicate'),
    0
  );
reset role;

select extensions.is(
  (
    select inserted_count
      from import_test_results
     where allowed_batch is not null
  ),
  1,
  'an explicit duplicate override can preserve a legitimate repeated transaction'
);

select extensions.is(
  (
    select count(*)
      from public.transactions tx
     where tx.household_id = '20000000-0000-0000-0000-000000000010'
       and tx.archived_at is null
  ),
  3::bigint,
  'the explicit override creates exactly one additional transaction'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000002',
  true
);
select extensions.throws_ok(
  format(
    'select * from public.commit_transaction_import(%L, %L, %L, %L, %L, %L::jsonb, 0)',
    '20000000-0000-0000-0000-000000000010',
    'fibi',
    'cross-household.xlsx',
    repeat('6', 64),
    'fibi-v1',
    (select rows::text from import_test_payloads where name = 'cross_household')
  ),
  'P0001',
  'mapped financial account not found at source row 10',
  'an import cannot map to another household account'
);

select extensions.throws_ok(
  format(
    'select * from public.commit_transaction_import(%L, %L, %L, %L, %L, %L::jsonb, 0)',
    '20000000-0000-0000-0000-000000000010',
    'fibi',
    'pending.xlsx',
    repeat('7', 64),
    'fibi-v1',
    (select rows::text from import_test_payloads where name = 'pending')
  ),
  'P0001',
  'pending rows cannot be committed at source row 11',
  'pending provider rows are rejected'
);

select extensions.throws_ok(
  format(
    'select * from public.commit_transaction_import(%L, %L, %L, %L, %L, %L::jsonb, 0)',
    '20000000-0000-0000-0000-000000000010',
    'fibi',
    'transfer.xlsx',
    repeat('8', 64),
    'fibi-v1',
    (select rows::text from import_test_payloads where name = 'transfer')
  ),
  'P0001',
  'transfers must use the paired transfer flow at source row 12',
  'a lone transfer leg cannot be imported'
);
reset role;

select extensions.is(
  (
    select count(*)
      from public.import_batches ib
     where ib.file_sha256 in (repeat('6', 64), repeat('7', 64), repeat('8', 64))
  ),
  0::bigint,
  'failed imports leave no partial batch'
);

update public.transactions
   set merchant_name = 'ציוד לבית נערך'
 where merchant_name = 'ציוד לבית';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000002',
  true
);
update import_test_results
   set archived_count = rollback.archived_count,
       conflict_count = rollback.conflict_count
  from public.rollback_transaction_import(
    (select initial_batch from import_test_results where initial_batch is not null)
  ) rollback
 where initial_batch is not null;
reset role;

select extensions.is(
  (select archived_count from import_test_results where initial_batch is not null),
  1,
  'rollback archives an unchanged imported transaction'
);

select extensions.is(
  (select conflict_count from import_test_results where initial_batch is not null),
  1,
  'rollback preserves a transaction edited after import'
);

select extensions.is(
  (
    select ib.status
      from public.import_batches ib
     where ib.id = (
       select initial_batch
         from import_test_results
        where initial_batch is not null
     )
  ),
  'partially_rolled_back',
  'a preserved edit leaves the batch partially rolled back'
);

select extensions.is(
  (
    select count(*)
      from public.transactions tx
     where tx.merchant_name = 'תשלום מלקוחה בביט'
       and tx.archived_at is not null
  ),
  1::bigint,
  'the unchanged imported income is archived'
);

select extensions.is(
  (
    select tx.archived_at is null
      from public.transactions tx
     where tx.merchant_name = 'ציוד לבית נערך'
  ),
  true,
  'the edited imported expense remains active'
);

update public.transactions
   set merchant_name = 'ציוד לבית'
 where merchant_name = 'ציוד לבית נערך';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000002',
  true
);
update import_test_results
   set archived_count = rollback.archived_count,
       conflict_count = rollback.conflict_count
  from public.rollback_transaction_import(
    (select initial_batch from import_test_results where initial_batch is not null)
  ) rollback
 where initial_batch is not null;
reset role;

select extensions.is(
  (select archived_count from import_test_results where initial_batch is not null),
  1,
  'a retry archives the transaction after its imported values are restored'
);

select extensions.is(
  (select conflict_count from import_test_results where initial_batch is not null),
  0,
  'the completed rollback has no remaining edit conflict'
);

select extensions.is(
  (
    select ib.status
      from public.import_batches ib
     where ib.id = (
       select initial_batch
         from import_test_results
        where initial_batch is not null
     )
  ),
  'rolled_back',
  'the batch becomes fully rolled back'
);

select extensions.is(
  (
    select count(*)
      from public.import_rows ir
     where ir.batch_id = (
       select initial_batch
         from import_test_results
        where initial_batch is not null
     )
       and ir.status = 'rolled_back'
  ),
  2::bigint,
  'both original import rows retain rolled-back audit provenance'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000002',
  true
);
update import_test_results
   set reimport_batch = committed.batch_id
  from public.commit_transaction_import(
    '20000000-0000-0000-0000-000000000010',
    'fibi',
    'initial-reimport.xlsx',
    repeat('f', 64),
    'fibi-v1',
    (select rows from import_test_payloads where name = 'initial'),
    0
  ) committed
 where initial_batch is not null;
reset role;

select extensions.ok(
  (select reimport_batch is not null from import_test_results where initial_batch is not null),
  'a fully rolled-back source file may be imported again'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000004',
  true
);
select extensions.throws_ok(
  format(
    'select * from public.rollback_transaction_import(%L)',
    (select reimport_batch from import_test_results where reimport_batch is not null)
  ),
  'P0001',
  'not authorized to roll back this import',
  'another household cannot roll back the import'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000004',
  true
);
select *
  from public.commit_transaction_import(
    '20000000-0000-0000-0000-000000000020',
    'cal',
    'automatic-account.xlsx',
    repeat('a', 64),
    'xlsx-v1',
    (select rows from import_test_payloads where name = 'automatic_account'),
    0
  );
reset role;

select extensions.is(
  (
    select fa.name || ':' || fa.type::text || ':' || fa.last4
      from public.financial_accounts fa
     where fa.household_id = '20000000-0000-0000-0000-000000000020'
       and fa.last4 = '8888'
  ),
  'כאל ••8888:credit_card:8888',
  'an unmapped import source creates its financial account atomically'
);

select extensions.is(
  (
    select count(*)
      from public.import_account_mappings iam
     where iam.household_id = '20000000-0000-0000-0000-000000000020'
       and iam.provider = 'cal'
       and iam.masked_last4 = '8888'
  ),
  1::bigint,
  'the automatically created account receives a reusable source mapping'
);

select extensions.is(
  (
    select tx.needs_review::text || ':' || tx.review_reason::text
      from public.transactions tx
     where tx.household_id = '20000000-0000-0000-0000-000000000020'
       and tx.merchant_name = 'חשבון חדש אוטומטי'
  ),
  'true:uncategorized',
  'an uncategorized imported transaction is visible in the review queue'
);

select * from extensions.finish();

rollback;
