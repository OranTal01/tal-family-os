-- Preserve provider-reported account balances independently from spending.
-- Credit-card settlements can therefore stay excluded from expense aggregates
-- while the checking-account balance remains exact.

create table public.account_balance_snapshots (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null,
  financial_account_id uuid not null,
  import_batch_id      uuid not null,
  balance              bigint not null,
  snapshot_date        date not null,
  created_at           timestamptz not null default now(),
  unique (id, household_id),
  unique (import_batch_id, financial_account_id),
  foreign key (financial_account_id, household_id)
    references public.financial_accounts (id, household_id) on delete restrict,
  foreign key (import_batch_id, household_id)
    references public.import_batches (id, household_id) on delete restrict
);

comment on table public.account_balance_snapshots is
  'Provider-reported account balances captured during an import. Readers use '
  'the newest snapshot whose import batch is not fully rolled back, then add '
  'later ledger movements. Raw source files are not retained.';

create index account_balance_snapshots_latest_idx
  on public.account_balance_snapshots (
    household_id,
    financial_account_id,
    snapshot_date desc,
    created_at desc
  );

alter table public.account_balance_snapshots enable row level security;

create policy account_balance_snapshots_select
  on public.account_balance_snapshots
  for select to authenticated
  using (household_id in (select app.member_households()));

grant select on public.account_balance_snapshots to authenticated;
revoke all on public.account_balance_snapshots from anon;

create or replace function public.commit_categorized_transaction_import_with_balances(
  p_household_id      uuid,
  p_provider          text,
  p_display_file_name text,
  p_file_sha256       text,
  p_parser_version    text,
  p_rows              jsonb,
  p_balance_snapshots jsonb,
  p_skipped_count     integer default 0
)
returns table (
  batch_id         uuid,
  inserted_count   integer,
  duplicate_count  integer,
  review_count      integer
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid                  uuid := (select auth.uid());
  v_batch_id             uuid;
  v_inserted_count       integer;
  v_duplicate_count      integer;
  v_review_count         integer;
  v_snapshot             jsonb;
  v_account_type         public.account_type;
  v_masked_last4         text;
  v_balance              bigint;
  v_snapshot_date        date;
  v_financial_account_id uuid;
begin
  if v_uid is null then
    raise exception 'must be signed in to import account balances';
  end if;

  if p_balance_snapshots is null
     or jsonb_typeof(p_balance_snapshots) <> 'array'
     or jsonb_array_length(p_balance_snapshots) > 50 then
    raise exception 'balance snapshots must be a bounded array';
  end if;

  select committed.batch_id,
         committed.inserted_count,
         committed.duplicate_count,
         committed.review_count
    into v_batch_id,
         v_inserted_count,
         v_duplicate_count,
         v_review_count
    from public.commit_categorized_transaction_import(
      p_household_id,
      p_provider,
      p_display_file_name,
      p_file_sha256,
      p_parser_version,
      p_rows,
      p_skipped_count
    ) committed;

  for v_snapshot in
    select value from jsonb_array_elements(p_balance_snapshots)
  loop
    if v_snapshot ->> 'account_type' <> 'bank' then
      raise exception 'only bank balance snapshots are supported';
    end if;

    v_account_type := (v_snapshot ->> 'account_type')::public.account_type;
    v_masked_last4 := nullif(trim(v_snapshot ->> 'masked_last4'), '');
    v_balance := (v_snapshot ->> 'balance')::bigint;
    v_snapshot_date := (v_snapshot ->> 'snapshot_date')::date;

    if v_masked_last4 is null or v_masked_last4 !~ '^[0-9]{4}$' then
      raise exception 'invalid masked account for balance snapshot';
    end if;
    if v_balance is null or v_snapshot_date is null then
      raise exception 'invalid account balance snapshot';
    end if;

    select iam.financial_account_id
      into v_financial_account_id
      from public.import_account_mappings iam
      join public.financial_accounts fa
        on fa.id = iam.financial_account_id
       and fa.household_id = iam.household_id
       and fa.archived_at is null
     where iam.household_id = p_household_id
       and iam.provider = p_provider
       and iam.account_type = v_account_type
       and iam.masked_last4 = v_masked_last4;

    if not found then
      raise exception 'balance snapshot account mapping not found';
    end if;

    insert into public.account_balance_snapshots (
      household_id,
      financial_account_id,
      import_batch_id,
      balance,
      snapshot_date
    )
    values (
      p_household_id,
      v_financial_account_id,
      v_batch_id,
      v_balance,
      v_snapshot_date
    );
  end loop;

  return query
  select
    v_batch_id,
    v_inserted_count,
    v_duplicate_count,
    v_review_count;
end
$$;

revoke all on function public.commit_categorized_transaction_import_with_balances(
  uuid,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  integer
) from public;

grant execute on function public.commit_categorized_transaction_import_with_balances(
  uuid,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  integer
) to authenticated;
