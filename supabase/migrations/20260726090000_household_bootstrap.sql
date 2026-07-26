-- Make first-owner household bootstrap retry-safe and complete.
--
-- The authenticated profile row is locked for the transaction so concurrent
-- bootstrap attempts for the same caller serialize. A retry returns the
-- caller's existing household and repairs a missing linked adult `people` row
-- left by the older RPC implementation.

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

  -- The profile trigger normally guarantees this row. Besides validating the
  -- invariant, the row lock serializes retries/concurrent calls per profile.
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

  -- A previous version of this RPC created the household and membership but
  -- not the linked adult person. Keep retries self-healing for that state.
  insert into public.people (household_id, profile_id, name, kind)
  select v_household_id, v_uid, v_display_name, 'adult'
  where not exists (
    select 1
      from public.people p
     where p.household_id = v_household_id
       and p.profile_id = v_uid
  );

  return v_household_id;
end
$$;

revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;
