import 'server-only';

import { normalizeMerchant } from '@/lib/imports/categorization';
import { getCurrentHouseholdMembership } from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';
import { getPersistedTransactionsScreen } from '@/server/data/persisted-transactions';
import type {
  CategoryOption,
  ReviewCardView,
} from '@/server/data/views';

const reasonLabels = {
  uncategorized: 'לא נבחרה קטגוריה',
  unrecognized_merchant: 'בית העסק עדיין לא מוכר',
  possible_duplicate: 'ייתכן שזו תנועה כפולה',
  possible_transfer: 'ייתכן שזו העברה בין חשבונות',
  low_confidence: 'הסיווג האוטומטי אינו ודאי',
} as const;

const actionLabels = {
  uncategorized: 'בחירת קטגוריה',
  unrecognized_merchant: 'סיווג התנועה',
  possible_duplicate: 'בדיקת כפילות',
  possible_transfer: 'בדיקת ההעברה',
  low_confidence: 'אישור הסיווג',
} as const;

export async function getPersistedReviewScreen(): Promise<{
  items: ReviewCardView[];
  categories: CategoryOption[];
}> {
  const membership = await getCurrentHouseholdMembership();
  if (!membership) return { items: [], categories: [] };

  const supabase = await createClient();
  const [transactionScreen, reviewsResult, rulesResult] = await Promise.all([
    getPersistedTransactionsScreen(),
    supabase
      .from('review_items')
      .select('id, transaction_id, reason')
      .eq('household_id', membership.householdId)
      .eq('status', 'open')
      .order('created_at', { ascending: true }),
    supabase
      .from('merchant_rules')
      .select('merchant_pattern, category_id, context')
      .eq('household_id', membership.householdId)
      .is('archived_at', null),
  ]);

  const error = reviewsResult.error ?? rulesResult.error;
  if (error) {
    throw new Error('Unable to load persisted review queue', { cause: error });
  }

  const transactions = new Map(
    transactionScreen.items.map((transaction) => [
      transaction.id,
      transaction,
    ]),
  );
  const rules = rulesResult.data ?? [];

  return {
    items: (reviewsResult.data ?? []).flatMap((review) => {
      const transaction = transactions.get(review.transaction_id);
      if (!transaction) return [];
      const merchant = normalizeMerchant(transaction.merchant);
      const matchingRule = rules.find(
        (rule) =>
          rule.context === transaction.context &&
          merchant.includes(normalizeMerchant(rule.merchant_pattern)),
      );

      return [
        {
          id: review.id,
          transactionId: transaction.id,
          icon: transaction.icon,
          name: transaction.merchant,
          note: `${transaction.accountName} · ${transaction.dateLabel}`,
          reasonLabel: reasonLabels[review.reason],
          actionLabel: actionLabels[review.reason],
          amount: transaction.amount,
          suggestedCategoryId: matchingRule?.category_id ?? undefined,
          isIncome: transaction.amount > 0,
        },
      ];
    }),
    categories: transactionScreen.categories,
  };
}
