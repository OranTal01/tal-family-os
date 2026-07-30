-- Let an already-committed FIBI file backfill the balance snapshot introduced
-- after its original import, without duplicating any transaction.

drop function public.commit_categorized_transaction_import_with_balances(
  uuid,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  integer
);

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
  batch_id              uuid,
  inserted_count        integer,
  duplicate_count       integer,
  review_count          integer,
  balance_snapshot_count integer,
  reused_batch          boolean
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid                    uuid := (select auth.uid());
  v_batch_id               uuid;
  v_inserted_count         integer;
  v_duplicate_count        integer;
  v_review_count           integer;
  v_balance_snapshot_count integer := 0;
  v_reused_batch           boolean := false;
  v_snapshot               jsonb;
  v_account_type           public.account_type;
  v_masked_last4           text;
  v_balance                bigint;
  v_snapshot_date          date;
  v_financial_account_id   uuid;
  v_rows_affected          integer;
begin
  if v_uid is null then
    raise exception 'must be signed in to import account balances';
  end if;

  if p_balance_snapshots is null
     or jsonb_typeof(p_balance_snapshots) <> 'array'
     or jsonb_array_length(p_balance_snapshots) > 50 then
    raise exception 'balance snapshots must be a bounded array';
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
         or jsonb_array_length(p_balance_snapshots) = 0 then
        raise;
      end if;

      select
        ib.id,
        0,
        jsonb_array_length(p_rows),
        ib.review_count,
        true
        into
          v_batch_id,
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
    )
    on conflict (import_batch_id, financial_account_id) do nothing;

    get diagnostics v_rows_affected = row_count;
    v_balance_snapshot_count :=
      v_balance_snapshot_count + v_rows_affected;
  end loop;

  return query
  select
    v_batch_id,
    v_inserted_count,
    v_duplicate_count,
    v_review_count,
    v_balance_snapshot_count,
    v_reused_batch;
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
