begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(28);

-- Four real Auth rows exercise the same profile trigger used in production.
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
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'owner-invite-test@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"אורן"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'member-invite-test@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"חבר"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'danielle-invite-test@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"דניאל"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'outsider-invite-test@example.com',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"אורח"}'::jsonb,
    now(),
    now()
  );

insert into public.households (id, name, created_by)
values (
  '10000000-0000-0000-0000-000000000010',
  'כספי הבית',
  '10000000-0000-0000-0000-000000000001'
);

insert into public.household_members (household_id, profile_id, role)
values
  (
    '10000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000001',
    'owner'
  ),
  (
    '10000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000002',
    'member'
  );

create temp table invitation_results (
  first_id uuid,
  retry_id uuid,
  accepted_household_id uuid,
  second_id uuid,
  expired_id uuid
);
grant select, insert, update on table invitation_results to authenticated;

set local role authenticated;
select extensions.throws_ok(
  $$ select public.create_household_invitation('danielle-invite-test@example.com') $$,
  'P0001',
  'must be signed in to invite a household member',
  'an authenticated role without a user claim cannot create an invitation'
);
reset role;

select extensions.is(
  (
    select count(*)
      from public.profiles p
     where p.id in (
       '10000000-0000-0000-0000-000000000001',
       '10000000-0000-0000-0000-000000000002',
       '10000000-0000-0000-0000-000000000003',
       '10000000-0000-0000-0000-000000000004'
     )
  ),
  4::bigint,
  'Auth signup created all four profiles'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
select extensions.throws_ok(
  $$ select public.create_household_invitation('danielle-invite-test@example.com') $$,
  'P0001',
  'only a household owner can create invitations',
  'a non-owner household member cannot create an invitation'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
insert into invitation_results (first_id)
select public.create_household_invitation(
  '  DANIELLE-INVITE-TEST@EXAMPLE.COM  ',
  'owner'
);
reset role;

select extensions.ok(
  (select first_id is not null from invitation_results),
  'an owner can create an invitation'
);

select extensions.is(
  (
    select hi.email
      from public.household_invitations hi
     where hi.id = (select first_id from invitation_results)
  ),
  'danielle-invite-test@example.com',
  'the invitation email is normalized'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
update invitation_results
   set retry_id = public.create_household_invitation(
     'danielle-invite-test@example.com',
     'owner'
   );
reset role;

select extensions.is(
  (select retry_id from invitation_results),
  (select first_id from invitation_results),
  're-sending a pending invitation renews the same row'
);

select extensions.is(
  (
    select count(*)
      from public.household_invitations hi
     where hi.household_id = '10000000-0000-0000-0000-000000000010'
       and hi.email = 'danielle-invite-test@example.com'
       and hi.accepted_at is null
       and hi.revoked_at is null
  ),
  1::bigint,
  'renewal does not create duplicate pending invitations'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
select extensions.is(
  (select count(*) from public.household_invitations),
  1::bigint,
  'the owner can directly list household invitations'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
select extensions.is(
  (select count(*) from public.household_invitations),
  0::bigint,
  'a non-owner cannot directly list household invitations'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
select extensions.is(
  (
    select phi.household_name
      from public.get_pending_household_invitation() phi
  ),
  'כספי הבית',
  'the exact invited account can inspect safe invitation details'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000004',
  true
);
select extensions.is(
  (select count(*) from public.get_pending_household_invitation()),
  0::bigint,
  'a different signed-in email cannot see the invitation'
);
select extensions.throws_ok(
  format(
    'select public.accept_household_invitation(%L)',
    (select first_id from invitation_results)
  ),
  'P0001',
  'household invitation does not match this account',
  'a different signed-in email cannot accept the invitation'
);
select extensions.throws_ok(
  format(
    'select public.revoke_household_invitation(%L)',
    (select first_id from invitation_results)
  ),
  'P0001',
  'only a household owner can revoke invitations',
  'a signed-in account without membership cannot revoke an invitation'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
select extensions.throws_ok(
  format(
    'select public.revoke_household_invitation(%L)',
    (select first_id from invitation_results)
  ),
  'P0001',
  'only a household owner can revoke invitations',
  'a non-owner cannot revoke an invitation'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
select extensions.is(
  public.revoke_household_invitation(
    (select first_id from invitation_results)
  ),
  (select first_id from invitation_results),
  'the owner can revoke a pending invitation'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
select extensions.throws_ok(
  format(
    'select public.accept_household_invitation(%L)',
    (select first_id from invitation_results)
  ),
  'P0001',
  'household invitation has been revoked',
  'a revoked invitation cannot be accepted'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
update invitation_results
   set second_id = public.create_household_invitation(
     'danielle-invite-test@example.com',
     'owner'
   );
reset role;

select extensions.isnt(
  (select second_id from invitation_results),
  (select first_id from invitation_results),
  're-inviting after revocation creates a new invitation'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
update invitation_results
   set accepted_household_id = public.accept_household_invitation(second_id);
reset role;

select extensions.is(
  (select accepted_household_id from invitation_results),
  '10000000-0000-0000-0000-000000000010'::uuid,
  'the invited account joins the intended household'
);

select extensions.is(
  (
    select hm.role::text
      from public.household_members hm
     where hm.household_id = '10000000-0000-0000-0000-000000000010'
       and hm.profile_id = '10000000-0000-0000-0000-000000000003'
  ),
  'owner',
  'acceptance grants the owner-selected role'
);

select extensions.is(
  (
    select count(*)
      from public.people p
     where p.household_id = '10000000-0000-0000-0000-000000000010'
       and p.profile_id = '10000000-0000-0000-0000-000000000003'
       and p.name = 'דניאל'
       and p.kind = 'adult'
  ),
  1::bigint,
  'acceptance creates one linked adult person from the trusted profile'
);

select extensions.ok(
  (
    select hi.accepted_at is not null
           and hi.accepted_by = '10000000-0000-0000-0000-000000000003'
      from public.household_invitations hi
     where hi.id = (select second_id from invitation_results)
  ),
  'acceptance records who accepted and when'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
select extensions.is(
  public.accept_household_invitation(
    (select second_id from invitation_results)
  ),
  '10000000-0000-0000-0000-000000000010'::uuid,
  'acceptance is safe to retry'
);
reset role;

select extensions.is(
  (
    select count(*)
      from public.household_members hm
     where hm.profile_id = '10000000-0000-0000-0000-000000000003'
  ),
  1::bigint,
  'an acceptance retry does not duplicate membership'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
select extensions.throws_ok(
  $$ select public.create_household_invitation('danielle-invite-test@example.com') $$,
  'P0001',
  'the invited account already belongs to a household',
  'an account that already joined cannot be invited again'
);
reset role;

select extensions.lives_ok(
  $$ delete from auth.users
      where id = '10000000-0000-0000-0000-000000000003' $$,
  'deleting an accepted Auth account does not break invitation audit history'
);

select extensions.ok(
  (
    select hi.accepted_at is not null and hi.accepted_by is null
      from public.household_invitations hi
     where hi.id = (select second_id from invitation_results)
  ),
  'accepted_at remains after the deleted acceptor foreign key is cleared'
);

insert into invitation_results (expired_id)
values ('10000000-0000-0000-0000-000000000099');

insert into public.household_invitations (
  id,
  household_id,
  email,
  role,
  invited_by,
  expires_at
)
values (
  '10000000-0000-0000-0000-000000000099',
  '10000000-0000-0000-0000-000000000010',
  'outsider-invite-test@example.com',
  'member',
  '10000000-0000-0000-0000-000000000001',
  now() - interval '1 minute'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000004',
  true
);
select extensions.throws_ok(
  $$ select public.accept_household_invitation(
       '10000000-0000-0000-0000-000000000099'
     ) $$,
  'P0001',
  'household invitation has expired',
  'an expired invitation cannot be accepted'
);
reset role;

select extensions.is(
  has_table_privilege(
    'authenticated',
    'public.household_invitations',
    'INSERT'
  ),
  false,
  'the browser role has no direct invitation write privilege'
);

select * from extensions.finish();

rollback;
