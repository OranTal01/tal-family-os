import 'server-only';

import { formatRelativeDay } from '@/lib/format/date';
import { normalizeMerchant } from '@/lib/imports/categorization';
import { getCurrentHouseholdMembership } from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';
import type {
  CategoryOption,
  TransactionItem,
  TransactionsScreen,
} from '@/server/data/views';
import { agorot } from '@/types/money';

/** Reads the real household ledger for the transactions screen. */
export async function getPersistedTransactionsScreen(): Promise<TransactionsScreen> {
  const membership = await getCurrentHouseholdMembership();
  if (!membership) {
    return { items: [], categories: [], reviewCount: 0 };
  }

  const supabase = await createClient();
  const [
    transactionsResult,
    accountsResult,
    categoriesResult,
    peopleResult,
    recurringResult,
  ] =
    await Promise.all([
      supabase
        .from('transactions')
        .select(
          'id, account_id, date, amount, merchant_name, category_id, context, owner_person_id, kind, needs_review',
        )
        .eq('household_id', membership.householdId)
        .is('archived_at', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('financial_accounts')
        .select('id, name')
        .eq('household_id', membership.householdId)
        .is('archived_at', null),
      supabase
        .from('categories')
        .select('id, name, icon, context')
        .eq('household_id', membership.householdId)
        .is('archived_at', null)
        .order('sort_order', { ascending: true }),
      supabase
        .from('people')
        .select('id, name')
        .eq('household_id', membership.householdId)
        .is('archived_at', null),
      supabase
        .from('recurring_transactions')
        .select('account_id, name')
        .eq('household_id', membership.householdId)
        .eq('active', true),
    ]);

  const error =
    transactionsResult.error ??
    accountsResult.error ??
    categoriesResult.error ??
    peopleResult.error ??
    recurringResult.error;
  if (error) {
    throw new Error('Unable to load persisted transactions', { cause: error });
  }

  const transactionRows = transactionsResult.data ?? [];
  const accountRows = accountsResult.data ?? [];
  const categoryRows = categoriesResult.data ?? [];
  const peopleRows = peopleResult.data ?? [];
  const recurringRows = recurringResult.data ?? [];
  const accounts = new Map(
    accountRows.map((account) => [account.id, account.name]),
  );
  const categories = new Map(
    categoryRows.map((category) => [category.id, category]),
  );
  const owners = new Map(
    peopleRows.map((person) => [
      person.id,
      person.name.replaceAll(/\s+/g, '').toLocaleLowerCase('he') === 'דניאל'
        ? 'danielle'
        : 'oran',
    ]),
  );
  const recurringKeys = new Set(
    recurringRows.map(
      (recurring) =>
        `${recurring.account_id ?? ''}:${normalizeMerchant(recurring.name)}`,
    ),
  );

  const items: TransactionItem[] = transactionRows.map(
    (transaction) => {
      const category = transaction.category_id
        ? categories.get(transaction.category_id)
        : undefined;
      const meta =
        transaction.kind === 'income'
          ? 'הכנסה'
          : transaction.kind === 'refund'
            ? 'החזר'
            : category?.name ?? 'ללא קטגוריה';
      const isRecurring = recurringKeys.has(
        `${transaction.account_id}:${normalizeMerchant(transaction.merchant_name)}`,
      );
      const tag: TransactionItem['tag'] = transaction.needs_review
        ? { label: 'לבדיקה', tone: 'warn', icon: 'error' }
        : transaction.context === 'business'
          ? { label: 'עסק', tone: 'future', icon: 'storefront' }
          : isRecurring
            ? { label: 'קבועה', tone: 'sync', icon: 'event_repeat' }
            : undefined;

      return {
        id: transaction.id,
        merchant: transaction.merchant_name,
        icon:
          category?.icon ??
          (transaction.kind === 'income' ? 'payments' : 'receipt_long'),
        meta,
        dateLabel: formatRelativeDay(transaction.date),
        amount: agorot(transaction.amount),
        kind: transaction.kind,
        tag,
        dateISO: transaction.date,
        categoryId: transaction.category_id ?? undefined,
        categoryName: category?.name,
        accountName: accounts.get(transaction.account_id) ?? 'חשבון מיובא',
        context: transaction.context,
        ownerId: transaction.owner_person_id
          ? owners.get(transaction.owner_person_id)
          : undefined,
        needsReview: transaction.needs_review,
        isRecurring,
      };
    },
  );
  const categoryOptions: CategoryOption[] = categoryRows.map(
    (category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      context: category.context,
    }),
  );

  return {
    items,
    categories: categoryOptions,
    reviewCount: items.filter((item) => item.needsReview).length,
  };
}
