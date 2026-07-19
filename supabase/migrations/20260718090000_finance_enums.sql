-- Tal Family OS — Finance MVP schema, part 1/5: enum types.
-- Contract: docs/DATA_MODEL.md (revised MVP scope — sync/document/notification/audit
-- vocabularies are deferred with their tables).

create type public.member_role             as enum ('owner', 'member', 'viewer');
create type public.person_kind             as enum ('adult', 'child');
create type public.legal_form              as enum ('osek_patur', 'osek_murshe', 'company');
create type public.vat_reporting_frequency as enum ('monthly', 'bimonthly');
create type public.account_type            as enum ('bank', 'credit_card', 'wallet', 'cash',
                                                    'investment', 'savings', 'pension',
                                                    'education_fund', 'other');
create type public.finance_context         as enum ('household', 'business');
create type public.category_priority       as enum ('essential', 'important', 'flexible',
                                                    'discretionary');
create type public.adjustment_kind         as enum ('reallocation', 'increase', 'decrease',
                                                    'exceptional');
create type public.adjustment_scope        as enum ('one_time', 'permanent');
create type public.transaction_kind        as enum ('expense', 'income', 'refund', 'transfer');
create type public.income_class            as enum ('salary', 'business', 'other');
create type public.transaction_status      as enum ('cleared', 'pending');
create type public.review_reason           as enum ('uncategorized', 'unrecognized_merchant',
                                                    'possible_duplicate', 'possible_transfer',
                                                    'low_confidence');
create type public.review_status           as enum ('open', 'resolved', 'dismissed');
create type public.recurring_cadence       as enum ('monthly', 'bimonthly', 'weekly', 'yearly');
create type public.expected_group          as enum ('fixed', 'variable_estimate', 'one_time');
create type public.flow_direction          as enum ('inflow', 'outflow');
create type public.income_certainty        as enum ('guaranteed', 'uncertain');
create type public.asset_type              as enum ('real_estate', 'pension', 'education_fund',
                                                    'provident_fund', 'investment', 'savings',
                                                    'child_savings', 'deposit', 'other');
create type public.liability_type          as enum ('mortgage', 'loan', 'other');
create type public.policy_type             as enum ('life', 'health', 'car', 'home', 'mortgage',
                                                    'disability', 'other');
create type public.policy_status           as enum ('active', 'renewal_due', 'lapsed');
create type public.goal_status             as enum ('active', 'paused', 'done');
