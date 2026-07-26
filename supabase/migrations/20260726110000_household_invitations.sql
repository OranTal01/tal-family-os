-- Private household invitations.
--
-- Invitations are deliberately not public signup links. An existing household
-- owner creates an invitation for one normalized email address; only a signed-in,
-- email-confirmed user with that exact Auth email can inspect and accept it.
-- All mutations are security-definer RPCs that derive user and household scope
-- from auth.uid() instead of trusting browser-provided identity values.

create table public.household_invitations (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete restrict,
  email        text not null,
  role         public.member_role not null default 'owner',
  invited_by   uuid not null references public.profiles (id) on delete restrict,
  expires_at   timestamptz not null default (now() + interval '14 days'),
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles (id) on delete set null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint household_invitations_email_normalized
    check (
      email = lower(btrim(email))
      and length(email) between 3 and 320
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  -- accepted_by may later become null through its ON DELETE SET NULL FK, while
  -- accepted_at preserves the terminal audit event.
  constraint household_invitations_acceptor_requires_acceptance
    check (accepted_by is null or accepted_at is not null),
  constraint household_invitations_single_terminal_state
    check (accepted_at is null or revoked_at is null)
);

create unique index household_invitations_pending_email_key
  on public.household_invitations (household_id, email)
  where accepted_at is null and revoked_at is null;

create index household_invitations_pending_email_idx
  on public.household_invitations (email, created_at desc)
  where accepted_at is null and revoked_at is null;

create index household_invitations_household_idx
  on public.household_invitations (household_id, created_at desc);

create trigger set_updated_at
  before update on public.household_invitations
  for each row execute function app.set_updated_at();

alter table public.household_invitations enable row level security;

-- Owners can list invitations for their household. Invitees intentionally do not
-- receive direct table access; the narrow read RPC below exposes only safe fields.
create policy household_invitations_select on public.household_invitations
  for select to authenticated
  using (app.household_role(household_id) = 'owner');

grant select on public.household_invitations to authenticated;
revoke all on public.household_invitations from anon;

create or replace function public.create_household_invitation(
  p_email text,
  p_role public.member_role default 'owner'
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_household_id uuid;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_inviter_email text;
  v_target_profile_id uuid;
  v_invitation_id uuid;
begin
  if v_uid is null then
    raise exception 'must be signed in to invite a household member';
  end if;

  if length(v_email) not between 3 and 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invitation email is invalid';
  end if;

  select hm.household_id
    into v_household_id
    from public.household_members hm
   where hm.profile_id = v_uid
     and hm.role = 'owner'
   order by hm.created_at, hm.id
   limit 1;

  if v_household_id is null then
    raise exception 'only a household owner can create invitations';
  end if;

  select lower(u.email)
    into v_inviter_email
    from auth.users u
   where u.id = v_uid;

  if v_email = v_inviter_email then
    raise exception 'cannot invite your own email address';
  end if;

  select u.id
    into v_target_profile_id
    from auth.users u
   where lower(u.email) = v_email
   order by u.created_at, u.id
   limit 1;

  if v_target_profile_id is not null
     and exists (
       select 1
         from public.household_members hm
        where hm.profile_id = v_target_profile_id
     ) then
    raise exception 'the invited account already belongs to a household';
  end if;

  insert into public.household_invitations (
    household_id,
    email,
    role,
    invited_by,
    expires_at
  )
  values (
    v_household_id,
    v_email,
    p_role,
    v_uid,
    now() + interval '14 days'
  )
  on conflict (household_id, email)
    where accepted_at is null and revoked_at is null
  do update
        set role = excluded.role,
            invited_by = excluded.invited_by,
            expires_at = excluded.expires_at,
            updated_at = now()
  returning id into v_invitation_id;

  return v_invitation_id;
end
$$;

create or replace function public.get_pending_household_invitation()
returns table (
  invitation_id uuid,
  household_name text,
  invited_role public.member_role,
  inviter_name text,
  expires_at timestamptz,
  is_expired boolean
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
begin
  if v_uid is null then
    raise exception 'must be signed in to inspect invitations';
  end if;

  select lower(u.email)
    into v_email
    from auth.users u
   where u.id = v_uid
     and u.email_confirmed_at is not null;

  if v_email is null then
    raise exception 'a confirmed email address is required';
  end if;

  return query
    select hi.id,
           h.name,
           hi.role,
           p.display_name,
           hi.expires_at,
           hi.expires_at <= now()
      from public.household_invitations hi
      join public.households h on h.id = hi.household_id
      join public.profiles p on p.id = hi.invited_by
     where hi.email = v_email
       and hi.accepted_at is null
       and hi.revoked_at is null
     order by hi.created_at desc, hi.id
     limit 1;
end
$$;

create or replace function public.accept_household_invitation(p_invitation_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_display_name text;
  v_existing_household_id uuid;
  v_invitation public.household_invitations%rowtype;
begin
  if v_uid is null then
    raise exception 'must be signed in to accept an invitation';
  end if;

  select p.display_name
    into v_display_name
    from public.profiles p
   where p.id = v_uid
   for update;

  if not found then
    raise exception 'profile not found for authenticated user';
  end if;

  select lower(u.email)
    into v_email
    from auth.users u
   where u.id = v_uid
     and u.email_confirmed_at is not null;

  if v_email is null then
    raise exception 'a confirmed email address is required';
  end if;

  select hi.*
    into v_invitation
    from public.household_invitations hi
   where hi.id = p_invitation_id
   for update;

  if not found then
    raise exception 'household invitation not found';
  end if;

  if v_invitation.accepted_at is not null then
    if v_invitation.accepted_by = v_uid then
      return v_invitation.household_id;
    end if;
    raise exception 'household invitation has already been accepted';
  end if;

  if v_invitation.revoked_at is not null then
    raise exception 'household invitation has been revoked';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'household invitation has expired';
  end if;

  if v_invitation.email <> v_email then
    raise exception 'household invitation does not match this account';
  end if;

  select hm.household_id
    into v_existing_household_id
    from public.household_members hm
   where hm.profile_id = v_uid
   order by hm.created_at, hm.id
   limit 1;

  if v_existing_household_id is not null
     and v_existing_household_id <> v_invitation.household_id then
    raise exception 'the authenticated account already belongs to another household';
  end if;

  insert into public.household_members (household_id, profile_id, role)
  values (v_invitation.household_id, v_uid, v_invitation.role)
  on conflict (household_id, profile_id) do nothing;

  insert into public.people (household_id, profile_id, name, kind)
  select v_invitation.household_id, v_uid, v_display_name, 'adult'
  where not exists (
    select 1
      from public.people p
     where p.household_id = v_invitation.household_id
       and p.profile_id = v_uid
  );

  update public.household_invitations
     set accepted_at = now(),
         accepted_by = v_uid
   where id = v_invitation.id;

  return v_invitation.household_id;
end
$$;

create or replace function public.revoke_household_invitation(p_invitation_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invitation public.household_invitations%rowtype;
begin
  if v_uid is null then
    raise exception 'must be signed in to revoke an invitation';
  end if;

  select hi.*
    into v_invitation
    from public.household_invitations hi
   where hi.id = p_invitation_id
   for update;

  if not found then
    raise exception 'household invitation not found';
  end if;

  if (select app.household_role(v_invitation.household_id))
     is distinct from 'owner' then
    raise exception 'only a household owner can revoke invitations';
  end if;

  if v_invitation.accepted_at is not null then
    raise exception 'an accepted invitation cannot be revoked';
  end if;

  update public.household_invitations
     set revoked_at = coalesce(revoked_at, now())
   where id = v_invitation.id;

  return v_invitation.id;
end
$$;

revoke all on function public.create_household_invitation(text, public.member_role)
  from public;
revoke all on function public.get_pending_household_invitation()
  from public;
revoke all on function public.accept_household_invitation(uuid)
  from public;
revoke all on function public.revoke_household_invitation(uuid)
  from public;

grant execute on function public.create_household_invitation(text, public.member_role)
  to authenticated;
grant execute on function public.get_pending_household_invitation()
  to authenticated;
grant execute on function public.accept_household_invitation(uuid)
  to authenticated;
grant execute on function public.revoke_household_invitation(uuid)
  to authenticated;
