import 'server-only';

import { cache } from 'react';
import { formatDayMonth, formatMonth } from '@/lib/format/date';
import { getCurrentHouseholdMembership } from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';
import { getPersistedAccountsScreen } from '@/server/data/persisted-accounts';
import type {
  AssetsScreen,
  GoalView,
} from '@/server/data/views';
import { agorot } from '@/types/money';

function assetTypeLabel(type: string): string {
  switch (type) {
    case 'real_estate':
      return 'נדל״ן';
    case 'pension':
      return 'פנסיה';
    case 'education_fund':
      return 'קרן השתלמות';
    case 'provident_fund':
      return 'קופת גמל';
    case 'investment':
      return 'השקעה';
    case 'savings':
      return 'חיסכון';
    case 'child_savings':
      return 'חיסכון לילדים';
    case 'deposit':
      return 'פיקדון';
    default:
      return 'נכס';
  }
}

function accountTypeLabel(type: string): string {
  switch (type) {
    case 'bank':
      return 'עו״ש';
    case 'wallet':
      return 'ארנק דיגיטלי';
    case 'cash':
      return 'מזומן';
    case 'investment':
      return 'השקעה';
    case 'savings':
      return 'חיסכון';
    case 'pension':
      return 'פנסיה';
    case 'education_fund':
      return 'קרן השתלמות';
    default:
      return 'חשבון';
  }
}

export const getPersistedAssetsScreen = cache(
  async (): Promise<AssetsScreen> => {
    const membership = await getCurrentHouseholdMembership();
    const empty: AssetsScreen = {
      netWorth: agorot(0),
      totalAssets: agorot(0),
      totalLiabilities: agorot(0),
      rows: [],
      savingsMovements: [],
    };
    if (!membership) return empty;

    const supabase = await createClient();
    const [
      accounts,
      assetsResult,
      liabilitiesResult,
      movementsResult,
      batchesResult,
    ] = await Promise.all([
      getPersistedAccountsScreen(),
      supabase
        .from('assets')
        .select('id, name, subtitle, icon, type, current_value, valued_at')
        .eq('household_id', membership.householdId)
        .is('archived_at', null)
        .order('valued_at', { ascending: false }),
      supabase
        .from('liabilities')
        .select('id, name, type, balance, institution, end_date')
        .eq('household_id', membership.householdId)
        .is('archived_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('observed_financial_movements')
        .select('id, import_batch_id, movement_date, amount, merchant_name')
        .eq('household_id', membership.householdId)
        .eq('movement_type', 'savings_contribution')
        .order('movement_date', { ascending: false })
        .limit(20),
      supabase
        .from('import_batches')
        .select('id, status')
        .eq('household_id', membership.householdId),
    ]);

    const error =
      assetsResult.error ??
      liabilitiesResult.error ??
      movementsResult.error ??
      batchesResult.error;
    if (error) {
      throw new Error('Unable to load persisted assets', { cause: error });
    }

    const liquidAccountTypes = new Set([
      'bank',
      'wallet',
      'cash',
      'investment',
      'savings',
      'pension',
      'education_fund',
    ]);
    const assetAccounts = accounts.filter(
      (account) =>
        liquidAccountTypes.has(account.type) && account.balance >= 0,
    );
    const overdrawnAccounts = accounts.filter(
      (account) =>
        liquidAccountTypes.has(account.type) && account.balance < 0,
    );
    const storedAssets = assetsResult.data ?? [];
    const storedLiabilities = liabilitiesResult.data ?? [];
    const activeBatchIds = new Set(
      (batchesResult.data ?? [])
        .filter((batch) => batch.status !== 'rolled_back')
        .map((batch) => batch.id),
    );
    const totalAssets = agorot(
      assetAccounts.reduce((total, account) => total + account.balance, 0) +
        storedAssets.reduce(
          (total, asset) => total + asset.current_value,
          0,
        ),
    );
    const totalLiabilities = agorot(
      overdrawnAccounts.reduce(
        (total, account) => total + Math.abs(account.balance),
        0,
      ) +
        storedLiabilities.reduce(
          (total, liability) => total + liability.balance,
          0,
        ),
    );

    return {
      netWorth: agorot(totalAssets - totalLiabilities),
      totalAssets,
      totalLiabilities,
      rows: [
        ...assetAccounts.map((account) => ({
          id: `account-${account.id}`,
          name: account.name,
          subtitle:
            account.asOfLabel ??
            (account.source === 'imported'
              ? 'עודכן מקובץ'
              : 'יתרה שהוזנה ידנית'),
          icon: account.icon,
          chip: accountTypeLabel(account.type),
          value: account.balance,
          liability: false,
        })),
        ...storedAssets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          subtitle:
            asset.subtitle ??
            `נכון ל־${formatDayMonth(asset.valued_at.slice(0, 10))}`,
          icon: asset.icon ?? 'savings',
          chip: assetTypeLabel(asset.type),
          value: agorot(asset.current_value),
          liability: false,
        })),
        ...overdrawnAccounts.map((account) => ({
          id: `overdraft-${account.id}`,
          name: account.name,
          subtitle: account.asOfLabel ?? 'יתרת חובה',
          icon: account.icon,
          chip: 'יתרת חובה',
          value: agorot(Math.abs(account.balance)),
          liability: true,
        })),
        ...storedLiabilities.map((liability) => ({
          id: liability.id,
          name: liability.name,
          subtitle:
            liability.institution ??
            (liability.end_date
              ? `עד ${formatDayMonth(liability.end_date)}`
              : 'התחייבות'),
          icon: liability.type === 'mortgage' ? 'home' : 'payments',
          chip: 'התחייבות',
          value: agorot(liability.balance),
          liability: true,
        })),
      ],
      savingsMovements: (movementsResult.data ?? [])
        .filter((movement) =>
          activeBatchIds.has(movement.import_batch_id),
        )
        .map((movement) => ({
          id: movement.id,
          name: movement.merchant_name,
          dateLabel: formatDayMonth(movement.movement_date),
          amount: agorot(Math.abs(movement.amount)),
        })),
    };
  },
);

export const getPersistedInsuranceScreen = cache(async () => {
  const membership = await getCurrentHouseholdMembership();
  if (!membership) {
    return { totalPremium: agorot(0), policies: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('insurance_policies')
    .select(
      'id, name, provider, policy_type, premium_monthly, coverage_summary, renewal_date, status, insured_person_id',
    )
    .eq('household_id', membership.householdId)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Unable to load persisted insurance policies', {
      cause: error,
    });
  }

  const policies = (data ?? []).map((policy) => ({
    id: policy.id,
    name: policy.name,
    provider: policy.provider,
    icon:
      policy.policy_type === 'car'
        ? 'directions_car'
        : policy.policy_type === 'home' ||
            policy.policy_type === 'mortgage'
          ? 'home'
          : policy.policy_type === 'health'
            ? 'health_and_safety'
            : 'shield',
    premiumMonthly: agorot(policy.premium_monthly),
    coverage: policy.coverage_summary,
    status:
      policy.status === 'renewal_due'
        ? ('renewal_due' as const)
        : ('active' as const),
    statusLabel:
      policy.status === 'renewal_due' && policy.renewal_date
        ? `חידוש ${formatDayMonth(policy.renewal_date)}`
        : policy.status === 'lapsed'
          ? 'הפוליסה אינה פעילה'
          : 'פעיל',
    insuredId: policy.insured_person_id ?? undefined,
  }));

  return {
    totalPremium: agorot(
      policies.reduce(
        (total, policy) => total + policy.premiumMonthly,
        0,
      ),
    ),
    policies,
  };
});

export const getPersistedGoalsScreen = cache(
  async (): Promise<GoalView[]> => {
    const membership = await getCurrentHouseholdMembership();
    if (!membership) return [];

    const supabase = await createClient();
    const [goalsResult, contributionsResult] = await Promise.all([
      supabase
        .from('financial_goals')
        .select(
          'id, name, icon, target_amount, current_amount, monthly_deposit, target_date, beneficiary_person_id',
        )
        .eq('household_id', membership.householdId)
        .eq('status', 'active')
        .is('archived_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('goal_contributions')
        .select('id, goal_id, amount, date, note')
        .eq('household_id', membership.householdId)
        .order('date', { ascending: false }),
    ]);

    const error = goalsResult.error ?? contributionsResult.error;
    if (error) {
      throw new Error('Unable to load persisted goals', { cause: error });
    }

    const contributions = contributionsResult.data ?? [];
    return (goalsResult.data ?? []).map((goal) => ({
      id: goal.id,
      name: goal.name,
      icon: goal.icon ?? 'savings',
      target: agorot(goal.target_amount),
      current: agorot(goal.current_amount),
      monthlyDeposit: agorot(goal.monthly_deposit),
      forecastLabel: goal.target_date
        ? `יעד: ${formatMonth(goal.target_date.slice(0, 7) as `${number}-${string}`)}`
        : undefined,
      utilization:
        goal.target_amount > 0
          ? (goal.current_amount / goal.target_amount) * 100
          : 0,
      contributions: contributions
        .filter((contribution) => contribution.goal_id === goal.id)
        .map((contribution) => ({
          id: contribution.id,
          label: contribution.note ?? 'הפקדה',
          dateLabel: formatDayMonth(contribution.date),
          amount: agorot(contribution.amount),
        })),
      beneficiaryId: goal.beneficiary_person_id ?? undefined,
    }));
  },
);

export const getPersistedKidsScreen = cache(async () => {
  const membership = await getCurrentHouseholdMembership();
  if (!membership) return [];

  const supabase = await createClient();
  const [goals, peopleResult] = await Promise.all([
    getPersistedGoalsScreen(),
    supabase
      .from('people')
      .select('id, name')
      .eq('household_id', membership.householdId)
      .eq('kind', 'child')
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
  ]);

  if (peopleResult.error) {
    throw new Error('Unable to load persisted children', {
      cause: peopleResult.error,
    });
  }

  return (peopleResult.data ?? []).map((kid) => ({
    kid,
    goal:
      goals.find((goal) => goal.beneficiaryId === kid.id) ?? null,
  }));
});
