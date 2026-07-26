begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(17);

-- The RPC is private to an authenticated profile.
set local role authenticated;
select extensions.throws_ok(
  $$ select public.create_household('כספי הבית') $$,
  'P0001',
  'must be signed in to create a household',
  'anonymous bootstrap is rejected'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000099',
  true
);
select extensions.throws_ok(
  $$ select public.create_household('כספי הבית') $$,
  'P0001',
  'profile not found for authenticated user',
  'an authenticated claim without a profile is rejected'
);
reset role;

-- Inserting an Auth user exercises the production profile bootstrap trigger.
insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'oran-bootstrap-test@example.com',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"אורן"}'::jsonb,
  now(),
  now()
);

select extensions.is(
  (
    select p.display_name
      from public.profiles p
     where p.id = '00000000-0000-0000-0000-000000000001'
  ),
  'אורן',
  'the Auth trigger created the expected profile'
);

create temp table bootstrap_results (
  first_id uuid,
  retry_id uuid
);
grant select, insert, update on table bootstrap_results to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  true
);

insert into bootstrap_results (first_id)
select public.create_household('כספי הבית');

update bootstrap_results
   set retry_id = public.create_household('שם שלא אמור להחליף את הבית');
reset role;

select extensions.ok(
  (select first_id is not null from bootstrap_results),
  'first-owner bootstrap returns a household id'
);

select extensions.is(
  (select retry_id from bootstrap_results),
  (select first_id from bootstrap_results),
  'a retry returns the existing household id'
);

select extensions.is(
  (
    select count(*)
      from public.households h
     where h.created_by = '00000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'a retry does not create another household'
);

select extensions.is(
  (
    select h.name
      from public.households h
     where h.id = (select first_id from bootstrap_results)
  ),
  'כספי הבית',
  'a retry does not rename the existing household'
);

select extensions.is(
  (
    select count(*)
      from public.household_members hm
     where hm.household_id = (select first_id from bootstrap_results)
       and hm.profile_id = '00000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'bootstrap creates exactly one membership'
);

select extensions.is(
  (
    select hm.role::text
      from public.household_members hm
     where hm.household_id = (select first_id from bootstrap_results)
       and hm.profile_id = '00000000-0000-0000-0000-000000000001'
  ),
  'owner',
  'the first member is an owner'
);

select extensions.is(
  (
    select count(*)
      from public.people p
     where p.household_id = (select first_id from bootstrap_results)
       and p.profile_id = '00000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'bootstrap creates exactly one linked person'
);

select extensions.is(
  (
    select p.name
      from public.people p
     where p.household_id = (select first_id from bootstrap_results)
       and p.profile_id = '00000000-0000-0000-0000-000000000001'
  ),
  'אורן',
  'the linked person uses the trusted profile display name'
);

select extensions.is(
  (
    select p.kind::text
      from public.people p
     where p.household_id = (select first_id from bootstrap_results)
       and p.profile_id = '00000000-0000-0000-0000-000000000001'
  ),
  'adult',
  'the linked person is an adult'
);

select extensions.is(
  (
    (select count(*)
       from public.financial_accounts fa
      where fa.household_id = (select first_id from bootstrap_results))
    +
    (select count(*)
       from public.transactions t
      where t.household_id = (select first_id from bootstrap_results))
    +
    (select count(*)
       from public.monthly_budgets mb
      where mb.household_id = (select first_id from bootstrap_results))
    +
    (select count(*)
       from public.monthly_budget_items mbi
      where mbi.household_id = (select first_id from bootstrap_results))
  ),
  0::bigint,
  'bootstrap seeds category names but no accounts, transactions, budgets, or amounts'
);

-- A household created by the old RPC had no linked `people` row. A retry
-- should repair that state without creating a second household.
insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'legacy-bootstrap-test@example.com',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"משתמש ותיק"}'::jsonb,
  now(),
  now()
);

insert into public.households (id, name, created_by)
values (
  '00000000-0000-0000-0000-000000000012',
  'בית קיים',
  '00000000-0000-0000-0000-000000000002'
);

insert into public.household_members (household_id, profile_id, role)
values (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000002',
  'owner'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000002',
  true
);

insert into bootstrap_results (retry_id)
select public.create_household('בית חדש');
reset role;

select extensions.is(
  (
    select br.retry_id
      from bootstrap_results br
     where br.first_id is null
  ),
  '00000000-0000-0000-0000-000000000012'::uuid,
  'legacy retry returns the existing household'
);

select extensions.is(
  (
    select count(*)
      from public.households h
     where h.created_by = '00000000-0000-0000-0000-000000000002'
  ),
  1::bigint,
  'legacy retry does not create another household'
);

select extensions.is(
  (
    select count(*)
      from public.people p
     where p.household_id = '00000000-0000-0000-0000-000000000012'
       and p.profile_id = '00000000-0000-0000-0000-000000000002'
       and p.kind = 'adult'
  ),
  1::bigint,
  'legacy retry repairs the missing linked adult person'
);

select extensions.is(
  (
    select p.name
      from public.people p
     where p.household_id = '00000000-0000-0000-0000-000000000012'
       and p.profile_id = '00000000-0000-0000-0000-000000000002'
  ),
  'משתמש ותיק',
  'legacy repair uses the profile display name'
);

select * from extensions.finish();

rollback;
