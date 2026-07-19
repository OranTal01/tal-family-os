-- Tal Family OS — local/dev seed. Mirrors src/mocks/core.ts.
-- Runs as the migration owner (bypasses RLS). Fixed UUIDs so repeated resets and
-- follow-up seeds can reference rows deterministically.
--
-- ID scheme: a…=household · b…=people · c…=business · d…=accounts · e…=categories.

-- ---------------------------------------------------------------- household & people

insert into public.households (id, name, currency, carry_over_enabled, timezone)
values ('a0000000-0000-4000-8000-000000000001', 'כספי הבית', 'ILS', false, 'Asia/Jerusalem')
on conflict (id) do nothing;

insert into public.people (id, household_id, name, kind) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'אורן טל',  'adult'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'דניאל טל', 'adult'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'אריאה',    'child'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'אלי',      'child')
on conflict (id) do nothing;

-- Children's savings settings (kids screen)
insert into public.children_profiles (household_id, person_id) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004')
on conflict (person_id) do nothing;

-- ---------------------------------------------------------------- business

-- VAT rate is data, not schema: the current Israeli standard rate is seeded here
-- explicitly and can be updated in Settings when it changes.
insert into public.businesses
  (id, household_id, owner_person_id, name, legal_form, vat_rate, vat_reporting_frequency)
values
  ('c0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000002',
   'העסק של דניאל', 'osek_murshe', 0.1800, 'bimonthly')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- accounts

-- opening_balance in agorot (₪ × 100), signed. Credit cards carry no opening balance —
-- their "חיוב צפוי" is derived from transactions. opening_balance_date = seed day for
-- accounts seeded with a balance: only transactions dated after it count.
insert into public.financial_accounts
  (id, household_id, name, type, owner_person_id, last4, icon, is_asset, context,
   opening_balance, opening_balance_date, sort_order)
values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'בנק הפועלים', 'bank', null, '4821', 'account_balance', true, 'household',
   2345000, current_date, 1),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'בנק לאומי', 'bank', 'b0000000-0000-4000-8000-000000000002', '7710',
   'account_balance', true, 'business', 1890000, current_date, 2),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'ויזה כאל', 'credit_card', 'b0000000-0000-4000-8000-000000000001', '2145',
   'credit_card', false, 'household', 0, null, 3),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'מקס (מאסטרקארד)', 'credit_card', 'b0000000-0000-4000-8000-000000000002', '8890',
   'credit_card', false, 'household', 0, null, 4),
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'אמריקן אקספרס', 'credit_card', 'b0000000-0000-4000-8000-000000000001', '0032',
   'credit_card', false, 'household', 0, null, 5),
  ('d0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001',
   'Bit', 'wallet', 'b0000000-0000-4000-8000-000000000002', null,
   'account_balance_wallet', true, 'household', 60000, current_date, 6),
  ('d0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001',
   'PayBox', 'wallet', 'b0000000-0000-4000-8000-000000000002', null,
   'account_balance_wallet', true, 'household', 90000, current_date, 7),
  ('d0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001',
   'מזומן', 'cash', null, null, 'payments', true, 'household', 55000, current_date, 8)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- categories

insert into public.categories
  (id, household_id, name, short_name, icon, context, priority, sort_order, archived_at)
values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'דיור ומשכנתא', 'דיור', 'home', 'household', 'essential', 1, null),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'סופר וקניות', 'סופר', 'shopping_cart', 'household', 'essential', 2, null),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'מסעדות ומשלוחים', 'מסעדות', 'restaurant', 'household', 'flexible', 3, null),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'ילדים', 'ילדים', 'child_care', 'household', 'important', 4, null),
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'חינוך וצהרון', 'חינוך', 'school', 'household', 'essential', 5, null),
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001',
   'מנקה', 'מנקה', 'cleaning_services', 'household', 'important', 6, null),
  ('e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001',
   'חשמל', 'חשמל', 'bolt', 'household', 'essential', 7, null),
  ('e0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001',
   'אינטרנט וסלולר', 'תקשורת', 'wifi', 'household', 'essential', 8, null),
  ('e0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001',
   'ביגוד', 'ביגוד', 'checkroom', 'household', 'flexible', 9, null),
  ('e0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001',
   'תחבורה וחניה', 'תחבורה', 'directions_car', 'household', 'important', 10, null),
  ('e0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001',
   'ביטוחים', 'ביטוחים', 'shield', 'household', 'essential', 11, null),
  ('e0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001',
   'בריאות ופארם', 'בריאות', 'medication', 'household', 'important', 12, null),
  ('e0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001',
   'בילויים', 'בילויים', 'celebration', 'household', 'discretionary', 13, null),
  ('e0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001',
   'מתנות ואירועים', 'מתנות', 'redeem', 'household', 'discretionary', 14, null),
  ('e0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000001',
   'חופשות ופנאי', 'חופשות', 'travel', 'household', 'discretionary', 15, null),
  -- archived category with history — never hard-deleted (core rule)
  ('e0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000001',
   'חיות מחמד', 'חיות', 'pets', 'household', 'flexible', 90, now()),
  -- business categories
  ('e0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000001',
   'פרסום ושיווק', 'שיווק', 'campaign', 'business', 'important', 1, null),
  ('e0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000001',
   'ציוד וטכנולוגיה', 'ציוד', 'devices', 'business', 'important', 2, null),
  ('e0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000001',
   'שירותים מקצועיים', 'שירותים', 'work', 'business', 'essential', 3, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- budgets (months −2..+1)

with months as (
  select (date_trunc('month', current_date) + make_interval(months => d))::date as month
  from generate_series(-2, 1) as d
),
headers as (
  insert into public.monthly_budgets (household_id, month, context)
  select 'a0000000-0000-4000-8000-000000000001', m.month, c.ctx
  from months m
  cross join (values ('household'::public.finance_context),
                     ('business'::public.finance_context)) as c(ctx)
  on conflict (household_id, month, context) do nothing
  returning id, context
)
insert into public.monthly_budget_items (household_id, monthly_budget_id, category_id, amount)
select 'a0000000-0000-4000-8000-000000000001', h.id, i.category_id, i.amount
from headers h
join (values
  -- household items (agorot = ₪ × 100)
  ('household', 'e0000000-0000-4000-8000-000000000001'::uuid, 800000),
  ('household', 'e0000000-0000-4000-8000-000000000002'::uuid, 350000),
  ('household', 'e0000000-0000-4000-8000-000000000003'::uuid, 200000),
  ('household', 'e0000000-0000-4000-8000-000000000004'::uuid, 300000),
  ('household', 'e0000000-0000-4000-8000-000000000005'::uuid, 330000),
  ('household', 'e0000000-0000-4000-8000-000000000006'::uuid, 100000),
  ('household', 'e0000000-0000-4000-8000-000000000007'::uuid,  70000),
  ('household', 'e0000000-0000-4000-8000-000000000008'::uuid,  45000),
  ('household', 'e0000000-0000-4000-8000-000000000009'::uuid,  80000),
  ('household', 'e0000000-0000-4000-8000-000000000010'::uuid, 140000),
  ('household', 'e0000000-0000-4000-8000-000000000011'::uuid, 105000),
  ('household', 'e0000000-0000-4000-8000-000000000012'::uuid, 100000),
  ('household', 'e0000000-0000-4000-8000-000000000013'::uuid,  75000),
  ('household', 'e0000000-0000-4000-8000-000000000014'::uuid,  70000),
  ('household', 'e0000000-0000-4000-8000-000000000015'::uuid, 150000),
  -- business items
  ('business',  'e0000000-0000-4000-8000-000000000017'::uuid, 120000),
  ('business',  'e0000000-0000-4000-8000-000000000018'::uuid, 250000),
  ('business',  'e0000000-0000-4000-8000-000000000019'::uuid, 200000)
) as i(ctx, category_id, amount) on i.ctx = h.context::text
on conflict (monthly_budget_id, category_id) do nothing;

-- ---------------------------------------------------------------- after first sign-up
--
-- Auth users cannot be seeded here. After אורן/דניאל sign up once, link them
-- (run in the SQL editor, adjusting emails):
--
--   insert into public.household_members (household_id, profile_id, role)
--   select 'a0000000-0000-4000-8000-000000000001', u.id, 'owner'
--   from auth.users u where u.email in ('orantal01@gmail.com')
--   on conflict (household_id, profile_id) do nothing;
--
--   update public.people p
--      set profile_id = u.id
--   from auth.users u
--   where u.email = 'orantal01@gmail.com'
--     and p.id = 'b0000000-0000-4000-8000-000000000001';
