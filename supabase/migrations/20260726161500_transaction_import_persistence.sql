-- Tal Family OS — provider-neutral transaction import persistence.
--
-- This migration stores only normalized import provenance. Raw XLSX files and raw
-- worksheet rows are deliberately not retained.

-- ---------------------------------------------------------------- transactions

alter table public.transactions
  add column archived_at timestamptz;

create index txn_hh_active_date_idx
  on public.transactions (household_id, date desc)
  where archived_at is null;

-- ---------------------------------------------------------------- account mappings

create table public.import_account_mappings (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households (id) on delete restrict,
  provider             text not null
                       constraint import_account_mappings_provider
                       check (provider in ('fibi', 'cal', 'isracard')),
  account_type         public.account_type not null
                       constraint import_account_mappings_account_type
                       check (account_type in ('bank', 'credit_card')),
  masked_last4         text not null
                       constraint import_account_mappings_last4
                       check (masked_last4 ~ '^[0-9]{4}$'),
  financial_account_id uuid not null,
  created_by           uuid not null references public.profiles (id) on delete restrict,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (id, household_id),
  unique (household_id, provider, account_type, masked_last4),
  foreign key (financial_account_id, household_id)
    references public.financial_accounts (id, household_id) on delete restrict
);

create trigger set_updated_at
  before update on public.import_account_mappings
  for each row execute function app.set_updated_at();

create index import_account_mappings_account_idx
  on public.import_account_mappings (financial_account_id);

-- ---------------------------------------------------------------- batches

create table public.import_batches (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households (id) on delete restrict,
  provider          text not null
                    constraint import_batches_provider
                    check (provider in ('fibi', 'cal', 'isracard')),
  display_file_name text not null
                    constraint import_batches_file_name_length
                    check (
                      length(display_file_name) between 1 and 160
                      and display_file_name !~ '[/\\]'
                    ),
  file_sha256       text not null
                    constraint import_batches_file_sha256
                    check (file_sha256 ~ '^[0-9a-f]{64}$'),
  parser_version    text not null
                    constraint import_batches_parser_version
                    check (length(parser_version) between 1 and 64),
  status            text not null default 'committed'
                    constraint import_batches_status
                    check (status in (
                      'committed',
                      'partially_rolled_back',
                      'rolled_back'
                    )),
  detected_count    integer not null
                    constraint import_batches_detected_count
                    check (detected_count between 0 and 5000),
  inserted_count    integer not null default 0
                    constraint import_batches_inserted_count
                    check (inserted_count between 0 and 5000),
  duplicate_count   integer not null default 0
                    constraint import_batches_duplicate_count
                    check (duplicate_count between 0 and 5000),
  skipped_count     integer not null default 0
                    constraint import_batches_skipped_count
                    check (skipped_count between 0 and 5000),
  review_count      integer not null default 0
                    constraint import_batches_review_count
                    check (review_count between 0 and 5000),
  created_by        uuid not null references public.profiles (id) on delete restrict,
  created_at        timestamptz not null default now(),
  rolled_back_by    uuid references public.profiles (id) on delete restrict,
  rolled_back_at    timestamptz,
  unique (id, household_id),
  constraint import_batches_rollback_metadata check (
    (
      status = 'committed'
      and rolled_back_by is null
      and rolled_back_at is null
    )
    or (
      status in ('partially_rolled_back', 'rolled_back')
      and rolled_back_by is not null
      and rolled_back_at is not null
    )
  ),
  constraint import_batches_count_total check (
    inserted_count + duplicate_count <= detected_count
  )
);

create unique index import_batches_active_file_unique
  on public.import_batches (household_id, provider, file_sha256)
  where status in ('committed', 'partially_rolled_back');

create index import_batches_household_created_idx
  on public.import_batches (household_id, created_at desc);

-- ---------------------------------------------------------------- row provenance

create table public.import_rows (
  id                           uuid primary key default gen_random_uuid(),
  household_id                 uuid not null,
  batch_id                     uuid not null,
  source_row                   integer not null
                               constraint import_rows_source_row
                               check (source_row > 0),
  fingerprint                  text not null
                               constraint import_rows_fingerprint
                               check (fingerprint ~ '^[0-9a-f]{64}$'),
  provider_reference           text
                               constraint import_rows_provider_reference_length
                               check (
                                 provider_reference is null
                                 or length(provider_reference) between 1 and 200
                               ),
  transaction_id               uuid,
  duplicate_of_transaction_id  uuid,
  status                       text not null
                               constraint import_rows_status
                               check (status in ('inserted', 'duplicate', 'rolled_back')),
  committed_snapshot           jsonb,
  created_at                   timestamptz not null default now(),
  rolled_back_at               timestamptz,
  unique (id, household_id),
  unique (batch_id, source_row),
  foreign key (batch_id, household_id)
    references public.import_batches (id, household_id) on delete restrict,
  foreign key (transaction_id, household_id)
    references public.transactions (id, household_id) on delete restrict,
  foreign key (duplicate_of_transaction_id, household_id)
    references public.transactions (id, household_id) on delete restrict,
  constraint import_rows_shape check (
    (
      status = 'inserted'
      and transaction_id is not null
      and duplicate_of_transaction_id is null
      and committed_snapshot is not null
      and jsonb_typeof(committed_snapshot) = 'object'
      and rolled_back_at is null
    )
    or (
      status = 'duplicate'
      and transaction_id is null
      and duplicate_of_transaction_id is not null
      and committed_snapshot is null
      and rolled_back_at is null
    )
    or (
      status = 'rolled_back'
      and transaction_id is not null
      and duplicate_of_transaction_id is null
      and committed_snapshot is not null
      and jsonb_typeof(committed_snapshot) = 'object'
      and rolled_back_at is not null
    )
  )
);

create index import_rows_batch_idx
  on public.import_rows (batch_id, source_row);

create index import_rows_household_fingerprint_idx
  on public.import_rows (household_id, fingerprint);

create index import_rows_transaction_idx
  on public.import_rows (transaction_id)
  where transaction_id is not null;

-- ---------------------------------------------------------------- normalized snapshot

create or replace function app.transaction_import_snapshot(
  p_transaction public.transactions
)
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'account_id', p_transaction.account_id::text,
    'date', p_transaction.date::text,
    'amount', p_transaction.amount::text,
    'currency', trim(p_transaction.currency),
    'merchant_name', p_transaction.merchant_name,
    'description', p_transaction.description,
    'category_id', p_transaction.category_id::text,
    'context', p_transaction.context::text,
    'owner_person_id', p_transaction.owner_person_id::text,
    'kind', p_transaction.kind::text,
    'income_class', p_transaction.income_class::text,
    'status', p_transaction.status::text,
    'needs_review', p_transaction.needs_review,
    'review_reason', p_transaction.review_reason::text
  )
$$;

revoke all on function app.transaction_import_snapshot(public.transactions)
  from public;

-- ---------------------------------------------------------------- atomic commit RPC

create or replace function public.commit_transaction_import(
  p_household_id      uuid,
  p_provider          text,
  p_display_file_name text,
  p_file_sha256       text,
  p_parser_version    text,
  p_rows              jsonb,
  p_skipped_count     integer default 0
)
returns table (
  batch_id       uuid,
  inserted_count integer,
  duplicate_count integer,
  review_count integer
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid                     uuid := (select auth.uid());
  v_role                    public.member_role;
  v_batch_id                uuid;
  v_inserted_count          integer := 0;
  v_duplicate_count         integer := 0;
  v_review_count            integer := 0;
  v_row                     jsonb;
  v_source_row              integer;
  v_fingerprint             text;
  v_account_type            public.account_type;
  v_masked_last4            text;
  v_account_id              uuid;
  v_account                 public.financial_accounts%rowtype;
  v_date                    date;
  v_amount                  bigint;
  v_currency                text;
  v_merchant                text;
  v_description             text;
  v_reference               text;
  v_category_id             uuid;
  v_context                 public.finance_context;
  v_owner_person_id         uuid;
  v_kind                    public.transaction_kind;
  v_income_class            public.income_class;
  v_status                  public.transaction_status;
  v_allow_duplicate         boolean;
  v_existing_transaction_id uuid;
  v_transaction             public.transactions%rowtype;
  v_category_context        public.finance_context;
begin
  if v_uid is null then
    raise exception 'must be signed in to import transactions';
  end if;

  v_role := app.household_role(p_household_id);
  if v_role is null or v_role not in ('owner', 'member') then
    raise exception 'not authorized to import transactions in this household';
  end if;

  if p_provider is null or p_provider not in ('fibi', 'cal', 'isracard') then
    raise exception 'unsupported import provider';
  end if;

  if p_display_file_name is null
     or length(p_display_file_name) not between 1 and 160
     or p_display_file_name ~ '[/\\]' then
    raise exception 'invalid import display file name';
  end if;

  if p_file_sha256 is null or lower(p_file_sha256) !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid import file fingerprint';
  end if;

  if p_parser_version is null
     or length(p_parser_version) not between 1 and 64 then
    raise exception 'invalid import parser version';
  end if;

  if p_rows is null
     or jsonb_typeof(p_rows) <> 'array'
     or jsonb_array_length(p_rows) not between 1 and 5000 then
    raise exception 'import rows must be a non-empty bounded array';
  end if;

  if p_skipped_count is null or p_skipped_count not between 0 and 5000 then
    raise exception 'invalid skipped row count';
  end if;

  if exists (
    select 1
      from public.import_batches ib
     where ib.household_id = p_household_id
       and ib.provider = p_provider
       and ib.file_sha256 = lower(p_file_sha256)
       and ib.status in ('committed', 'partially_rolled_back')
  ) then
    raise exception 'this source file already has an active import';
  end if;

  insert into public.import_batches (
    household_id,
    provider,
    display_file_name,
    file_sha256,
    parser_version,
    detected_count,
    skipped_count,
    created_by
  )
  values (
    p_household_id,
    p_provider,
    p_display_file_name,
    lower(p_file_sha256),
    p_parser_version,
    jsonb_array_length(p_rows),
    p_skipped_count,
    v_uid
  )
  returning id into v_batch_id;

  for v_row in
    select value from jsonb_array_elements(p_rows)
  loop
    if jsonb_typeof(v_row) <> 'object' then
      raise exception 'each import row must be an object';
    end if;

    v_source_row := (v_row ->> 'source_row')::integer;
    v_fingerprint := lower(v_row ->> 'fingerprint');
    v_account_type := (v_row ->> 'account_type')::public.account_type;
    v_masked_last4 := v_row ->> 'masked_last4';
    v_account_id := nullif(v_row ->> 'account_id', '')::uuid;
    v_date := (v_row ->> 'date')::date;
    v_amount := (v_row ->> 'amount')::bigint;
    v_currency := upper(v_row ->> 'currency');
    v_merchant := nullif(trim(v_row ->> 'merchant'), '');
    v_description := nullif(trim(v_row ->> 'description'), '');
    v_reference := nullif(trim(v_row ->> 'reference'), '');
    v_category_id := nullif(v_row ->> 'category_id', '')::uuid;
    v_context := (v_row ->> 'context')::public.finance_context;
    v_owner_person_id := nullif(v_row ->> 'owner_person_id', '')::uuid;
    v_kind := (v_row ->> 'kind')::public.transaction_kind;
    v_income_class :=
      nullif(v_row ->> 'income_class', '')::public.income_class;
    v_status := (v_row ->> 'status')::public.transaction_status;
    v_allow_duplicate :=
      coalesce((v_row ->> 'allow_duplicate')::boolean, false);
    v_existing_transaction_id := null;
    v_category_context := null;

    if v_source_row is null or v_source_row <= 0 then
      raise exception 'invalid source row';
    end if;

    if v_fingerprint is null or v_fingerprint !~ '^[0-9a-f]{64}$' then
      raise exception 'invalid row fingerprint at source row %', v_source_row;
    end if;

    if v_account_type not in ('bank', 'credit_card') then
      raise exception 'invalid account type at source row %', v_source_row;
    end if;

    if v_masked_last4 is null or v_masked_last4 !~ '^[0-9]{4}$' then
      raise exception 'invalid masked account at source row %', v_source_row;
    end if;

    if v_amount is null or v_amount = 0 then
      raise exception 'invalid amount at source row %', v_source_row;
    end if;

    if v_currency is null or v_currency !~ '^[A-Z]{3}$' then
      raise exception 'invalid currency at source row %', v_source_row;
    end if;

    if v_merchant is null or length(v_merchant) > 200 then
      raise exception 'invalid merchant at source row %', v_source_row;
    end if;

    if v_description is not null and length(v_description) > 1000 then
      raise exception 'description too long at source row %', v_source_row;
    end if;

    if v_reference is not null and length(v_reference) > 200 then
      raise exception 'reference too long at source row %', v_source_row;
    end if;

    if v_status <> 'cleared' then
      raise exception 'pending rows cannot be committed at source row %', v_source_row;
    end if;

    if v_kind = 'transfer' then
      raise exception 'transfers must use the paired transfer flow at source row %',
        v_source_row;
    end if;

    if (v_kind = 'expense' and v_amount >= 0)
       or (v_kind in ('income', 'refund') and v_amount <= 0) then
      raise exception 'amount sign does not match kind at source row %', v_source_row;
    end if;

    if (v_kind = 'income' and v_income_class is null)
       or (v_kind <> 'income' and v_income_class is not null) then
      raise exception 'income class does not match kind at source row %', v_source_row;
    end if;

    if v_owner_person_id is not null and not exists (
      select 1
        from public.people p
       where p.id = v_owner_person_id
         and p.household_id = p_household_id
         and p.archived_at is null
    ) then
      raise exception 'transaction owner not found at source row %', v_source_row;
    end if;

    if v_account_id is null then
      select fa.id
        into v_account_id
        from public.import_account_mappings iam
        join public.financial_accounts fa
          on fa.id = iam.financial_account_id
         and fa.household_id = iam.household_id
         and fa.archived_at is null
       where iam.household_id = p_household_id
         and iam.provider = p_provider
         and iam.account_type = v_account_type
         and iam.masked_last4 = v_masked_last4;
    end if;

    if v_account_id is null then
      select fa.id
        into v_account_id
        from public.financial_accounts fa
       where fa.household_id = p_household_id
         and fa.type = v_account_type
         and fa.last4 = v_masked_last4
         and fa.owner_person_id is not distinct from v_owner_person_id
         and fa.archived_at is null
       order by fa.created_at
       limit 1;
    end if;

    if v_account_id is null then
      insert into public.financial_accounts (
        household_id,
        name,
        type,
        owner_person_id,
        institution,
        last4,
        icon,
        is_asset,
        context
      )
      values (
        p_household_id,
        case p_provider
          when 'fibi' then 'הבנק הבינלאומי משותף ••' || v_masked_last4
          when 'cal' then 'כאל ••' || v_masked_last4
          else 'ישראכרט ••' || v_masked_last4
        end,
        v_account_type,
        v_owner_person_id,
        case p_provider
          when 'fibi' then 'הבנק הבינלאומי'
          when 'cal' then 'כאל'
          else 'ישראכרט'
        end,
        v_masked_last4,
        case
          when v_account_type = 'credit_card' then 'credit_card'
          else 'account_balance'
        end,
        v_account_type <> 'credit_card',
        'household'
      )
      returning id into v_account_id;
    end if;

    select *
      into v_account
      from public.financial_accounts fa
     where fa.id = v_account_id
       and fa.household_id = p_household_id
       and fa.archived_at is null;

    if not found then
      raise exception 'mapped financial account not found at source row %', v_source_row;
    end if;

    if v_account.type <> v_account_type then
      raise exception 'mapped account type mismatch at source row %', v_source_row;
    end if;

    if v_account.last4 is not null and v_account.last4 <> v_masked_last4 then
      raise exception 'mapped account last four mismatch at source row %', v_source_row;
    end if;

    if v_category_id is not null then
      select c.context
        into v_category_context
        from public.categories c
       where c.id = v_category_id
         and c.household_id = p_household_id
         and c.archived_at is null;

      if not found then
        raise exception 'transaction category not found at source row %', v_source_row;
      end if;

      if v_category_context <> v_context then
        raise exception 'transaction category context mismatch at source row %',
          v_source_row;
      end if;
    end if;

    insert into public.import_account_mappings (
      household_id,
      provider,
      account_type,
      masked_last4,
      financial_account_id,
      created_by
    )
    values (
      p_household_id,
      p_provider,
      v_account_type,
      v_masked_last4,
      v_account_id,
      v_uid
    )
    on conflict (household_id, provider, account_type, masked_last4)
    do update
      set financial_account_id = excluded.financial_account_id,
          updated_at = now();

    select coalesce(ir.transaction_id, ir.duplicate_of_transaction_id)
      into v_existing_transaction_id
      from public.import_rows ir
      join public.transactions tx
        on tx.id = coalesce(ir.transaction_id, ir.duplicate_of_transaction_id)
       and tx.household_id = ir.household_id
     where ir.household_id = p_household_id
       and ir.fingerprint = v_fingerprint
       and tx.archived_at is null
     order by ir.created_at
     limit 1;

    if v_existing_transaction_id is not null and not v_allow_duplicate then
      insert into public.import_rows (
        household_id,
        batch_id,
        source_row,
        fingerprint,
        provider_reference,
        duplicate_of_transaction_id,
        status
      )
      values (
        p_household_id,
        v_batch_id,
        v_source_row,
        v_fingerprint,
        v_reference,
        v_existing_transaction_id,
        'duplicate'
      );

      v_duplicate_count := v_duplicate_count + 1;
      continue;
    end if;

    insert into public.transactions (
      household_id,
      account_id,
      date,
      amount,
      currency,
      merchant_name,
      description,
      category_id,
      context,
      owner_person_id,
      kind,
      income_class,
      status,
      needs_review,
      review_reason,
      created_by
    )
    values (
      p_household_id,
      v_account_id,
      v_date,
      v_amount,
      v_currency,
      v_merchant,
      v_description,
      v_category_id,
      v_context,
      v_owner_person_id,
      v_kind,
      v_income_class,
      'cleared',
      v_category_id is null,
      case
        when v_category_id is null then 'uncategorized'::public.review_reason
        else null
      end,
      v_uid
    )
    returning * into v_transaction;

    insert into public.import_rows (
      household_id,
      batch_id,
      source_row,
      fingerprint,
      provider_reference,
      transaction_id,
      status,
      committed_snapshot
    )
    values (
      p_household_id,
      v_batch_id,
      v_source_row,
      v_fingerprint,
      v_reference,
      v_transaction.id,
      'inserted',
      app.transaction_import_snapshot(v_transaction)
    );

    v_inserted_count := v_inserted_count + 1;
    if v_category_id is null then
      v_review_count := v_review_count + 1;
    end if;
  end loop;

  update public.import_batches ib
     set inserted_count = v_inserted_count,
         duplicate_count = v_duplicate_count,
         review_count = v_review_count
   where ib.id = v_batch_id;

  return query
  select v_batch_id, v_inserted_count, v_duplicate_count, v_review_count;
exception
  when unique_violation then
    if exists (
      select 1
        from public.import_batches ib
       where ib.household_id = p_household_id
         and ib.provider = p_provider
         and ib.file_sha256 = lower(p_file_sha256)
         and ib.status in ('committed', 'partially_rolled_back')
    ) then
      raise exception 'this source file already has an active import';
    end if;
    raise;
end
$$;

-- ---------------------------------------------------------------- safe rollback RPC

create or replace function public.rollback_transaction_import(p_batch_id uuid)
returns table (
  archived_count integer,
  conflict_count integer
)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid             uuid := (select auth.uid());
  v_batch           public.import_batches%rowtype;
  v_role            public.member_role;
  v_row              public.import_rows%rowtype;
  v_transaction      public.transactions%rowtype;
  v_archived_count  integer := 0;
  v_conflict_count  integer := 0;
begin
  if v_uid is null then
    raise exception 'must be signed in to roll back an import';
  end if;

  select *
    into v_batch
    from public.import_batches ib
   where ib.id = p_batch_id
   for update;

  if not found then
    raise exception 'import batch not found';
  end if;

  v_role := app.household_role(v_batch.household_id);
  if v_role is null or v_role not in ('owner', 'member') then
    raise exception 'not authorized to roll back this import';
  end if;

  if v_batch.status = 'rolled_back' then
    return query select 0, 0;
    return;
  end if;

  for v_row in
    select *
      from public.import_rows ir
     where ir.batch_id = p_batch_id
       and ir.status = 'inserted'
     order by ir.source_row
     for update
  loop
    select *
      into v_transaction
      from public.transactions tx
     where tx.id = v_row.transaction_id
       and tx.household_id = v_row.household_id
     for update;

    if not found
       or app.transaction_import_snapshot(v_transaction)
          <> v_row.committed_snapshot then
      v_conflict_count := v_conflict_count + 1;
      continue;
    end if;

    if v_transaction.archived_at is null then
      update public.transactions tx
         set archived_at = now()
       where tx.id = v_transaction.id;
      v_archived_count := v_archived_count + 1;
    end if;

    update public.import_rows ir
       set status = 'rolled_back',
           rolled_back_at = now()
     where ir.id = v_row.id;
  end loop;

  update public.import_batches ib
     set status = case
           when exists (
             select 1
               from public.import_rows ir
              where ir.batch_id = p_batch_id
                and ir.status = 'inserted'
           )
             then 'partially_rolled_back'
           else 'rolled_back'
         end,
         rolled_back_by = v_uid,
         rolled_back_at = now()
   where ib.id = p_batch_id;

  return query select v_archived_count, v_conflict_count;
end
$$;

-- ---------------------------------------------------------------- RLS and grants

alter table public.import_account_mappings enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;

create policy import_account_mappings_select
  on public.import_account_mappings
  for select to authenticated
  using (household_id in (select app.member_households()));

create policy import_batches_select
  on public.import_batches
  for select to authenticated
  using (household_id in (select app.member_households()));

create policy import_rows_select
  on public.import_rows
  for select to authenticated
  using (household_id in (select app.member_households()));

grant select on public.import_account_mappings to authenticated;
grant select on public.import_batches to authenticated;
grant select on public.import_rows to authenticated;

revoke all on function public.commit_transaction_import(
  uuid, text, text, text, text, jsonb, integer
) from public;
revoke all on function public.rollback_transaction_import(uuid) from public;

grant execute on function public.commit_transaction_import(
  uuid, text, text, text, text, jsonb, integer
) to authenticated;
grant execute on function public.rollback_transaction_import(uuid)
  to authenticated;

revoke all on public.import_account_mappings from anon;
revoke all on public.import_batches from anon;
revoke all on public.import_rows from anon;
revoke all on function public.commit_transaction_import(
  uuid, text, text, text, text, jsonb, integer
) from anon;
revoke all on function public.rollback_transaction_import(uuid) from anon;

comment on table public.import_batches is
  'Minimal import receipts. Raw financial source files and raw worksheet rows are not stored.';

comment on table public.import_rows is
  'Normalized provenance and duplicate/rollback state for source rows. The snapshot excludes raw provider data.';

comment on column public.transactions.archived_at is
  'Archived transactions are excluded from active ledger reads. Import rollback archives instead of deleting.';
