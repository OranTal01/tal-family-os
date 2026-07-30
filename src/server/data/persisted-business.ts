import 'server-only';

import { cache } from 'react';
import type { MonthKey } from '@/lib/format/date';
import { getCurrentHouseholdMembership } from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';
import { getPersistedMonthOverview } from '@/server/data/persisted-overview';
import { getPersistedTransactionsScreen } from '@/server/data/persisted-transactions';
import type {
  BusinessScreen,
  SplitScreen,
  TransactionItem,
} from '@/server/data/views';
import { agorot } from '@/types/money';

function nextMonth(month: MonthKey): MonthKey {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber, 1);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}` as MonthKey;
}

function businessTotals(transactions: TransactionItem[]) {
  const revenue = agorot(
    transactions
      .filter((transaction) => transaction.kind === 'income')
      .reduce((total, transaction) => total + transaction.amount, 0),
  );
  const expenses = agorot(
    -transactions
      .filter(
        (transaction) =>
          transaction.kind === 'expense' || transaction.kind === 'refund',
      )
      .reduce((total, transaction) => total + transaction.amount, 0),
  );
  return {
    revenue,
    expenses,
    profit: agorot(revenue - expenses),
  };
}

export const getPersistedBusinessScreen = cache(
  async (month: MonthKey): Promise<BusinessScreen> => {
    const membership = await getCurrentHouseholdMembership();
    const empty: BusinessScreen = {
      revenue: agorot(0),
      expenses: agorot(0),
      profit: agorot(0),
      vatDue: agorot(0),
      nextReportLabel: 'המועד טרם הוגדר',
      uncertainIncome: agorot(0),
      transactions: [],
    };
    if (!membership) return empty;

    const monthStart = `${month}-01`;
    const followingMonthStart = `${nextMonth(month)}-01`;
    const supabase = await createClient();
    const [transactionScreen, businessResult, expectedResult] =
      await Promise.all([
        getPersistedTransactionsScreen(),
        supabase
          .from('businesses')
          .select('vat_rate, vat_reporting_frequency')
          .eq('household_id', membership.householdId)
          .is('archived_at', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('expected_transactions')
          .select('amount')
          .eq('household_id', membership.householdId)
          .eq('month', monthStart)
          .eq('context', 'business')
          .eq('direction', 'inflow')
          .eq('certainty', 'uncertain')
          .is('fulfilled_txn_id', null),
      ]);

    const error = businessResult.error ?? expectedResult.error;
    if (error) {
      throw new Error('Unable to load persisted business screen', {
        cause: error,
      });
    }

    const monthTransactions = transactionScreen.items.filter(
      (transaction) =>
        transaction.context === 'business' &&
        transaction.dateISO >= monthStart &&
        transaction.dateISO < followingMonthStart,
    );
    const totals = businessTotals(monthTransactions);
    const vatRate = Number(businessResult.data?.vat_rate ?? 0);
    const outputVat = Math.round(
      (totals.revenue * vatRate) / (1 + vatRate),
    );
    const inputVat = Math.round(
      (totals.expenses * vatRate) / (1 + vatRate),
    );

    return {
      ...totals,
      vatDue: agorot(Math.max(outputVat - inputVat, 0)),
      nextReportLabel: businessResult.data
        ? businessResult.data.vat_reporting_frequency === 'bimonthly'
          ? 'דיווח דו־חודשי — יש לאשר מועד עם רואה החשבון'
          : 'דיווח חודשי — יש לאשר מועד עם רואה החשבון'
        : 'המועד טרם הוגדר',
      uncertainIncome: agorot(
        (expectedResult.data ?? []).reduce(
          (total, expected) => total + expected.amount,
          0,
        ),
      ),
      transactions: monthTransactions.slice(0, 20),
    };
  },
);

export const getPersistedSplitScreen = cache(
  async (month: MonthKey): Promise<SplitScreen> => {
    const [overview, business] = await Promise.all([
      getPersistedMonthOverview(month),
      getPersistedBusinessScreen(month),
    ]);

    return {
      household: {
        income: overview.expectedIncome,
        expenses: agorot(
          overview.actualSpending + overview.remainingExpected,
        ),
        balance: overview.balance,
      },
      business: {
        revenue: business.revenue,
        expenses: business.expenses,
        profit: business.profit,
        vatDue: business.vatDue,
        nextReportLabel: business.nextReportLabel,
      },
    };
  },
);
