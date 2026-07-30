-- Remove only records created by the retired local demo seed. Production
-- households use generated UUIDs, so this migration is a no-op there.
--
-- Categories, people, and the Danielle business are intentionally retained:
-- they are legitimate editable setup records. We remove the fabricated monthly
-- amounts and archive fabricated accounts only when no real row references them.

do $$
declare
  v_demo_household constant uuid :=
    'a0000000-0000-4000-8000-000000000001';
begin
  delete from public.monthly_budget_items item
   using public.monthly_budgets budget
   where budget.id = item.monthly_budget_id
     and budget.household_id = v_demo_household
     and item.household_id = v_demo_household
     and (item.category_id, item.amount) in (
       values
         ('e0000000-0000-4000-8000-000000000001'::uuid, 800000::bigint),
         ('e0000000-0000-4000-8000-000000000002'::uuid, 350000::bigint),
         ('e0000000-0000-4000-8000-000000000003'::uuid, 200000::bigint),
         ('e0000000-0000-4000-8000-000000000004'::uuid, 300000::bigint),
         ('e0000000-0000-4000-8000-000000000005'::uuid, 330000::bigint),
         ('e0000000-0000-4000-8000-000000000006'::uuid, 100000::bigint),
         ('e0000000-0000-4000-8000-000000000007'::uuid,  70000::bigint),
         ('e0000000-0000-4000-8000-000000000008'::uuid,  45000::bigint),
         ('e0000000-0000-4000-8000-000000000009'::uuid,  80000::bigint),
         ('e0000000-0000-4000-8000-000000000010'::uuid, 140000::bigint),
         ('e0000000-0000-4000-8000-000000000011'::uuid, 105000::bigint),
         ('e0000000-0000-4000-8000-000000000012'::uuid, 100000::bigint),
         ('e0000000-0000-4000-8000-000000000013'::uuid,  75000::bigint),
         ('e0000000-0000-4000-8000-000000000014'::uuid,  70000::bigint),
         ('e0000000-0000-4000-8000-000000000015'::uuid, 150000::bigint),
         ('e0000000-0000-4000-8000-000000000017'::uuid, 120000::bigint),
         ('e0000000-0000-4000-8000-000000000018'::uuid, 250000::bigint),
         ('e0000000-0000-4000-8000-000000000019'::uuid, 200000::bigint)
     );

  delete from public.monthly_budgets budget
   where budget.household_id = v_demo_household
     and not exists (
       select 1
         from public.monthly_budget_items item
        where item.monthly_budget_id = budget.id
     );

  update public.financial_accounts account
     set opening_balance = 0,
         opening_balance_date = null,
         archived_at = coalesce(account.archived_at, now()),
         updated_at = now()
   where account.household_id = v_demo_household
     and account.id in (
       'd0000000-0000-4000-8000-000000000001',
       'd0000000-0000-4000-8000-000000000002',
       'd0000000-0000-4000-8000-000000000003',
       'd0000000-0000-4000-8000-000000000004',
       'd0000000-0000-4000-8000-000000000005',
       'd0000000-0000-4000-8000-000000000006',
       'd0000000-0000-4000-8000-000000000007',
       'd0000000-0000-4000-8000-000000000008'
     )
     and not exists (
       select 1 from public.transactions tx
        where tx.account_id = account.id
     )
     and not exists (
       select 1 from public.installment_plans plan
        where plan.account_id = account.id
     )
     and not exists (
       select 1 from public.internal_transfers transfer
        where transfer.from_account_id = account.id
           or transfer.to_account_id = account.id
     )
     and not exists (
       select 1 from public.recurring_transactions recurring
        where recurring.account_id = account.id
     )
     and not exists (
       select 1 from public.import_account_mappings mapping
        where mapping.financial_account_id = account.id
     )
     and not exists (
       select 1 from public.account_balance_snapshots snapshot
        where snapshot.financial_account_id = account.id
     )
     and not exists (
       select 1 from public.goal_contributions contribution
        where contribution.source_account_id = account.id
     );
end
$$;
