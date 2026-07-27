-- Let users classify and save card transactions that the provider still marks
-- as pending. The lower-level import RPC keeps its conservative default for
-- other callers; this reviewed/categorized flow temporarily validates the rows
-- as cleared and atomically restores their provider status after insertion.

create or replace function public.commit_categorized_transaction_import(
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
  v_uid             uuid := (select auth.uid());
  v_batch_id        uuid;
  v_inserted_count  integer;
  v_duplicate_count integer;
  v_review_count    integer;
  v_commit_rows     jsonb;
  v_row             jsonb;
  v_remember_rule   boolean;
  v_merchant        text;
  v_category_id     uuid;
  v_context         public.finance_context;
  v_owner_person_id uuid;
  v_kind            public.transaction_kind;
begin
  if v_uid is null then
    raise exception 'must be signed in to import transactions';
  end if;

  if p_rows is null
     or jsonb_typeof(p_rows) <> 'array'
     or jsonb_array_length(p_rows) not between 1 and 5000 then
    raise exception 'import rows must be a non-empty bounded array';
  end if;

  select jsonb_agg(
           case
             when source_row.value ->> 'status' = 'pending'
               then jsonb_set(
                 source_row.value,
                 '{status}',
                 '"cleared"'::jsonb
               )
             else source_row.value
           end
           order by source_row.ordinality
         )
    into v_commit_rows
    from jsonb_array_elements(p_rows)
         with ordinality as source_row(value, ordinality);

  select committed.batch_id,
         committed.inserted_count,
         committed.duplicate_count,
         committed.review_count
    into v_batch_id,
         v_inserted_count,
         v_duplicate_count,
         v_review_count
    from public.commit_transaction_import(
      p_household_id,
      p_provider,
      p_display_file_name,
      p_file_sha256,
      p_parser_version,
      v_commit_rows,
      p_skipped_count
    ) committed;

  update public.transactions tx
     set status = 'pending',
         updated_at = now()
    from public.import_rows ir
   where ir.batch_id = v_batch_id
     and ir.transaction_id = tx.id
     and exists (
       select 1
         from jsonb_array_elements(p_rows) as pending_row(value)
        where (pending_row.value ->> 'source_row')::integer = ir.source_row
          and pending_row.value ->> 'status' = 'pending'
     );

  -- Income is intentionally uncategorized. It has its own income classification,
  -- so it must not enter the expense-category review queue.
  update public.transactions tx
     set needs_review = false,
         review_reason = null,
         updated_at = now()
    from public.import_rows ir
   where ir.batch_id = v_batch_id
     and ir.transaction_id = tx.id
     and tx.kind = 'income'
     and tx.category_id is null
     and tx.needs_review;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_remember_rule :=
      coalesce((v_row ->> 'remember_rule')::boolean, false);
    if not v_remember_rule then
      continue;
    end if;

    v_merchant := nullif(trim(v_row ->> 'merchant'), '');
    v_category_id := nullif(v_row ->> 'category_id', '')::uuid;
    v_context := (v_row ->> 'context')::public.finance_context;
    v_owner_person_id := nullif(v_row ->> 'owner_person_id', '')::uuid;
    v_kind := (v_row ->> 'kind')::public.transaction_kind;

    if v_category_id is null or v_kind not in ('expense', 'refund') then
      raise exception 'remembered import rules require an expense/refund category';
    end if;

    insert into public.merchant_rules (
      household_id,
      merchant_pattern,
      category_id,
      context,
      owner_person_id,
      mark_as_transfer,
      created_by
    )
    values (
      p_household_id,
      app.normalize_merchant_pattern(v_merchant),
      v_category_id,
      v_context,
      v_owner_person_id,
      false,
      v_uid
    )
    on conflict (household_id, merchant_pattern, context)
      where archived_at is null
    do update
      set category_id = excluded.category_id,
          owner_person_id = excluded.owner_person_id,
          mark_as_transfer = false,
          created_by = excluded.created_by,
          updated_at = now();
  end loop;

  update public.import_rows ir
     set committed_snapshot = app.transaction_import_snapshot(tx)
    from public.transactions tx
   where ir.batch_id = v_batch_id
     and ir.transaction_id = tx.id;

  select count(*)::integer
    into v_review_count
    from public.import_rows ir
    join public.transactions tx on tx.id = ir.transaction_id
   where ir.batch_id = v_batch_id
     and tx.needs_review;

  update public.import_batches ib
     set review_count = v_review_count
   where ib.id = v_batch_id;

  return query
  select v_batch_id, v_inserted_count, v_duplicate_count, v_review_count;
end
$$;

revoke all on function public.commit_categorized_transaction_import(
  uuid, text, text, text, text, jsonb, integer
) from public;

grant execute on function public.commit_categorized_transaction_import(
  uuid, text, text, text, text, jsonb, integer
) to authenticated;
