import 'server-only';

import { formatDayMonth } from '@/lib/format/date';
import { getCurrentHouseholdMembership } from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';
import { agorot, type Agorot } from '@/types/money';

type AccountRow = {
  id: string;
  name: string;
  type:
    | 'bank'
    | 'credit_card'
    | 'wallet'
    | 'cash'
    | 'investment'
    | 'savings'
    | 'pension'
    | 'education_fund'
    | 'other';
  institution: string | null;
  last4: string | null;
  icon: string;
  context: 'household' | 'business';
  opening_balance: number;
  opening_balance_date: string | null;
  sort_order: number;
};

type TransactionRow = {
  account_id: string;
  date: string;
  amount: number;
};

type BalanceSnapshotRow = {
  financial_account_id: string;
  import_batch_id: string;
  balance: number;
  snapshot_date: string;
  created_at: string;
};

type ImportBatchRow = {
  id: string;
  status: 'committed' | 'partially_rolled_back' | 'rolled_back';
};

export type PersistedAccountItem = {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  type: AccountRow['type'];
  source: 'imported' | 'manual';
  balance: Agorot;
  balanceLabel: 'יתרה' | 'חיוב מיובא';
  context: 'household' | 'business';
  asOfLabel?: string;
};

function accountTypeLabel(type: AccountRow['type']): string {
  switch (type) {
    case 'bank':
      return 'חשבון בנק';
    case 'credit_card':
      return 'כרטיס אשראי';
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

export function buildPersistedAccountItems({
  accounts,
  transactions,
  snapshots,
  batches,
}: {
  accounts: AccountRow[];
  transactions: TransactionRow[];
  snapshots: BalanceSnapshotRow[];
  batches: ImportBatchRow[];
}): PersistedAccountItem[] {
  const activeBatchIds = new Set(
    batches
      .filter((batch) => batch.status !== 'rolled_back')
      .map((batch) => batch.id),
  );
  const newestSnapshot = new Map<string, BalanceSnapshotRow>();

  for (const snapshot of snapshots) {
    if (!activeBatchIds.has(snapshot.import_batch_id)) continue;
    const current = newestSnapshot.get(snapshot.financial_account_id);
    if (
      !current ||
      snapshot.snapshot_date > current.snapshot_date ||
      (snapshot.snapshot_date === current.snapshot_date &&
        snapshot.created_at > current.created_at)
    ) {
      newestSnapshot.set(snapshot.financial_account_id, snapshot);
    }
  }

  const transactionsByAccount = new Map<string, TransactionRow[]>();
  for (const transaction of transactions) {
    const rows = transactionsByAccount.get(transaction.account_id) ?? [];
    rows.push(transaction);
    transactionsByAccount.set(transaction.account_id, rows);
  }

  return [...accounts]
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'he'))
    .map((account) => {
      const snapshot = newestSnapshot.get(account.id);
      const baseBalance = snapshot?.balance ?? account.opening_balance;
      const baseDate = snapshot?.snapshot_date ?? account.opening_balance_date;
      const ledgerAfterBase = (transactionsByAccount.get(account.id) ?? [])
        .filter((transaction) => !baseDate || transaction.date > baseDate)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const signedBalance = baseBalance + ledgerAfterBase;
      const displayedBalance =
        account.type === 'credit_card'
          ? Math.max(0, -signedBalance)
          : signedBalance;
      const descriptor =
        account.institution && account.institution !== account.name
          ? account.institution
          : accountTypeLabel(account.type);
      const subtitle = account.last4
        ? `${descriptor} · ••${account.last4}`
        : descriptor;

      return {
        id: account.id,
        name: account.name,
        subtitle,
        icon: account.icon,
        type: account.type,
        source: snapshot ? 'imported' : 'manual',
        balance: agorot(displayedBalance),
        balanceLabel:
          account.type === 'credit_card' ? 'חיוב מיובא' : 'יתרה',
        context: account.context,
        asOfLabel: snapshot
          ? `נכון ל־${formatDayMonth(snapshot.snapshot_date)}`
          : undefined,
      };
    });
}

export async function getPersistedAccountsScreen(): Promise<
  PersistedAccountItem[]
> {
  const membership = await getCurrentHouseholdMembership();
  if (!membership) return [];

  const supabase = await createClient();
  const [
    accountsResult,
    transactionsResult,
    snapshotsResult,
    batchesResult,
  ] = await Promise.all([
    supabase
      .from('financial_accounts')
      .select(
        'id, name, type, institution, last4, icon, context, opening_balance, opening_balance_date, sort_order',
      )
      .eq('household_id', membership.householdId)
      .is('archived_at', null),
    supabase
      .from('transactions')
      .select('account_id, date, amount')
      .eq('household_id', membership.householdId)
      .is('archived_at', null),
    supabase
      .from('account_balance_snapshots')
      .select(
        'financial_account_id, import_batch_id, balance, snapshot_date, created_at',
      )
      .eq('household_id', membership.householdId),
    supabase
      .from('import_batches')
      .select('id, status')
      .eq('household_id', membership.householdId),
  ]);

  const error =
    accountsResult.error ??
    transactionsResult.error ??
    snapshotsResult.error ??
    batchesResult.error;
  if (error) {
    throw new Error('Unable to load persisted accounts', { cause: error });
  }

  return buildPersistedAccountItems({
    accounts: (accountsResult.data ?? []) as AccountRow[],
    transactions: (transactionsResult.data ?? []) as TransactionRow[],
    snapshots: (snapshotsResult.data ?? []) as BalanceSnapshotRow[],
    batches: (batchesResult.data ?? []) as ImportBatchRow[],
  });
}
