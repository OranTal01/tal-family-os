-- Preserve bank movements that affect the checking-account balance but must
-- not enter income/expense totals: monthly card settlements, pension/savings
-- contributions, and cash/internal movements awaiting a full account link.

create table public.observed_financial_movements (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null,
  financial_account_id uuid not null,
  import_batch_id      uuid not null,
  source_row           integer not null
                       constraint observed_financial_movements_source_row_positive
                       check (source_row > 0),
  fingerprint          char(64) not null
                       constraint observed_financial_movements_fingerprint_hex
                       check (fingerprint ~ '^[0-9a-f]{64}$'),
  movement_date        date not null,
  amount               bigint not null
                       constraint observed_financial_movements_amount_nonzero
                       check (amount <> 0),
  merchant_name        text not null
                       constraint observed_financial_movements_merchant_nonempty
                       check (trim(merchant_name) <> ''),
  movement_type        text not null
                       constraint observed_financial_movements_type
                       check (movement_type in (
                         'credit_card_settlement',
                         'savings_contribution',
                         'cash_movement',
                         'unclassified_transfer'
                       )),
  created_at           timestamptz not null default now(),
  unique (id, household_id),
  unique (import_batch_id, fingerprint),
  foreign key (financial_account_id, household_id)
    references public.financial_accounts (id, household_id) on delete restrict,
  foreign key (import_batch_id, household_id)
    references public.import_batches (id, household_id) on delete restrict
);

comment on table public.observed_financial_movements is
  'Imported balance-affecting bank movements excluded from spending and income. '
  'A savings contribution records cash flow only; it is not a pension valuation.';

create index observed_financial_movements_household_date_idx
  on public.observed_financial_movements (
    household_id,
    movement_date desc,
    created_at desc
  );

alter table public.observed_financial_movements enable row level security;

create policy observed_financial_movements_select
  on public.observed_financial_movements
  for select to authenticated
  using (household_id in (select app.member_households()));

grant select on public.observed_financial_movements to authenticated;
revoke all on public.observed_financial_movements from anon;

drop function public.commit_categorized_transaction_import_with_balances(
  uuid, text, text, text, text, jsonb, jsonb, integer
);

create or replace function public.commit_categorized_transaction_import_with_balances(
  p_household_id       uuid,
  p_provider           text,
  p_display_file_name  text,
  p_file_sha256        text,
  p_parser_version     text,
  p_rows               jsonb,
  p_balance_snapshots  jsonb,
  p_skipped_count      integer default 0,
  p_observed_movements jsonb default '[]'::jsonb
)
returns table (
  batch_id                 uuid,
  inserted_count           integer,
  duplicate_count          integer,
  review_count             integer,
  balance_snapshot_count   integer,
  observed_movement_count  integer,
  reused_batch             boolean
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid                     uuid := (select auth.uid());
  v_batch_id                uuid;
  v_inserted_count          integer;
  v_duplicate_count         integer;
  v_review_count            integer;
  v_balance_snapshot_count  integer := 0;
  v_observed_movement_count integer := 0;
  v_reused_batch            boolean := false;
  v_item                    jsonb;
  v_account_type            public.account_type;
  v_masked_last4            text;
  v_financial_account_id    uuid;
  v_rows_affected           integer;
  v_balance                 bigint;
  v_snapshot_date           date;
  v_source_row              integer;
  v_fingerprint             text;
  v_movement_date           date;
  v_amount                  bigint;
  v_merchant                text;
  v_movement_type           text;
begin
  if v_uid is null then
    raise exception 'must be signed in to import account balances';
  end if;

  if p_balance_snapshots is null
     or jsonb_typeof(p_balance_snapshots) <> 'array'
     or jsonb_array_length(p_balance_snapshots) > 50 then
    raise exception 'balance snapshots must be a bounded array';
  end if;

  if p_observed_movements is null
     or jsonb_typeof(p_observed_movements) <> 'array'
     or jsonb_array_length(p_observed_movements) > 5000 then
    raise exception 'observed movements must be a bounded array';
  end if;

  begin
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
  exception
    when raise_exception then
      if sqlerrm <> 'this source file already has an active import'
         or (
           jsonb_array_length(p_balance_snapshots) = 0
           and jsonb_array_length(p_observed_movements) = 0
         ) then
        raise;
      end if;

      select ib.id,
             0,
             jsonb_array_length(p_rows),
             ib.review_count,
             true
        into v_batch_id,
             v_inserted_count,
             v_duplicate_count,
             v_review_count,
             v_reused_batch
        from public.import_batches ib
       where ib.household_id = p_household_id
         and ib.provider = p_provider
         and ib.file_sha256 = lower(p_file_sha256)
         and ib.status in ('committed', 'partially_rolled_back')
       order by ib.created_at desc
       limit 1;

      if not found then
        raise;
      end if;
  end;

  for v_item in
    select value from jsonb_array_elements(p_balance_snapshots)
  loop
    if v_item ->> 'account_type' <> 'bank' then
      raise exception 'only bank balance snapshots are supported';
    end if;

    v_account_type := (v_item ->> 'account_type')::public.account_type;
    v_masked_last4 := nullif(trim(v_item ->> 'masked_last4'), '');
    v_balance := (v_item ->> 'balance')::bigint;
    v_snapshot_date := (v_item ->> 'snapshot_date')::date;

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
    )
    on conflict (import_batch_id, financial_account_id) do nothing;

    get diagnostics v_rows_affected = row_count;
    v_balance_snapshot_count :=
      v_balance_snapshot_count + v_rows_affected;
  end loop;

  for v_item in
    select value from jsonb_array_elements(p_observed_movements)
  loop
    v_account_type := (v_item ->> 'account_type')::public.account_type;
    v_masked_last4 := nullif(trim(v_item ->> 'masked_last4'), '');
    v_source_row := (v_item ->> 'source_row')::integer;
    v_fingerprint := lower(nullif(trim(v_item ->> 'fingerprint'), ''));
    v_movement_date := (v_item ->> 'date')::date;
    v_amount := (v_item ->> 'amount')::bigint;
    v_merchant := nullif(trim(v_item ->> 'merchant'), '');
    v_movement_type := nullif(trim(v_item ->> 'movement_type'), '');

    if v_account_type <> 'bank'
       or v_masked_last4 is null
       or v_masked_last4 !~ '^[0-9]{4}$'
       or v_source_row is null
       or v_source_row <= 0
       or v_fingerprint is null
       or v_fingerprint !~ '^[0-9a-f]{64}$'
       or v_movement_date is null
       or v_amount is null
       or v_amount = 0
       or v_merchant is null
       or v_movement_type not in (
         'credit_card_settlement',
         'savings_contribution',
         'cash_movement',
         'unclassified_transfer'
       ) then
      raise exception 'invalid observed financial movement';
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
      raise exception 'observed movement account mapping not found';
    end if;

    insert into public.observed_financial_movements (
      household_id,
      financial_account_id,
      import_batch_id,
      source_row,
      fingerprint,
      movement_date,
      amount,
      merchant_name,
      movement_type
    )
    values (
      p_household_id,
      v_financial_account_id,
      v_batch_id,
      v_source_row,
      v_fingerprint,
      v_movement_date,
      v_amount,
      v_merchant,
      v_movement_type
    )
    on conflict (import_batch_id, fingerprint) do nothing;

    get diagnostics v_rows_affected = row_count;
    v_observed_movement_count :=
      v_observed_movement_count + v_rows_affected;
  end loop;

  return query
  select v_batch_id,
         v_inserted_count,
         v_duplicate_count,
         v_review_count,
         v_balance_snapshot_count,
         v_observed_movement_count,
         v_reused_batch;
end
$$;

revoke all on function public.commit_categorized_transaction_import_with_balances(
  uuid, text, text, text, text, jsonb, jsonb, integer, jsonb
) from public;

grant execute on function public.commit_categorized_transaction_import_with_balances(
  uuid, text, text, text, text, jsonb, jsonb, integer, jsonb
) to authenticated;
