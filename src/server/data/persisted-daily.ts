import 'server-only';

import { currentMonthKey, toISODate } from '@/lib/format/date';
import { getPersistedMonthOverview } from '@/server/data/persisted-overview';
import { getPersistedTransactionsScreen } from '@/server/data/persisted-transactions';
import { agorot } from '@/types/money';

export async function getPersistedDailyScreen() {
  const today = toISODate(new Date());
  const month = currentMonthKey();
  const [overview, transactionScreen] = await Promise.all([
    getPersistedMonthOverview(month),
    getPersistedTransactionsScreen(),
  ]);
  const todayTransactions = transactionScreen.items.filter(
    (transaction) =>
      transaction.dateISO === today && transaction.kind !== 'transfer',
  );
  const spentToday = agorot(
    -todayTransactions
      .filter(
        (transaction) =>
          transaction.context === 'household' &&
          (transaction.kind === 'expense' || transaction.kind === 'refund'),
      )
      .reduce((total, transaction) => total + transaction.amount, 0),
  );
  const incomeToday = agorot(
    todayTransactions
      .filter(
        (transaction) =>
          transaction.context === 'household' &&
          transaction.kind === 'income',
      )
      .reduce((total, transaction) => total + transaction.amount, 0),
  );
  const ownerLabels = {
    oran: 'אורן',
    danielle: 'דניאל',
  } as const;

  return {
    summary: {
      spentToday,
      incomeToday,
      monthSpent: overview.actualSpending,
      monthBudget: overview.totalBudget,
      byOwner: (['oran', 'danielle'] as const).map((ownerId) => ({
        ownerId,
        name: ownerLabels[ownerId],
        amount: agorot(
          -todayTransactions
            .filter(
              (transaction) =>
                transaction.ownerId === ownerId &&
                transaction.context === 'household' &&
                (transaction.kind === 'expense' ||
                  transaction.kind === 'refund'),
            )
            .reduce(
              (total, transaction) => total + transaction.amount,
              0,
            ),
        ),
      })),
      attention: overview.categories
        .filter(
          (category) =>
            category.allocated > 0 && category.status !== 'healthy',
        )
        .map((category) => ({
          name: category.name,
          status: category.status as 'near' | 'over',
          detail:
            category.status === 'over'
              ? `חריגה של ₪${Math.round(category.overspend / 100).toLocaleString('he-IL')}`
              : `נוצל ${Math.round(category.utilization)}%`,
        })),
      upcomingLarge: [...overview.upcoming]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3),
      openReviewCount: overview.reviewCount,
      projectedEndOfMonth: overview.projectedEom,
    },
    txnItems: todayTransactions,
  };
}
