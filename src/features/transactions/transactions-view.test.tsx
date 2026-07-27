import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TransactionItem } from '@/server/data/views';
import { agorot } from '@/types/money';
import { TransactionsView } from './transactions-view';

function transaction(
  id: string,
  merchant: string,
): TransactionItem {
  return {
    id,
    merchant,
    icon: 'receipt_long',
    meta: 'ילדים',
    dateLabel: 'היום',
    amount: agorot(-22_020),
    kind: 'expense',
    dateISO: '2026-07-24',
    categoryId: '10000000-0000-4000-8000-000000000001',
    categoryName: 'ילדים',
    accountName: 'ישראכרט ••9485',
    context: 'household',
    needsReview: false,
  };
}

describe('TransactionsView', () => {
  it('shows fresh server items after a route refresh without remounting', () => {
    const existing = transaction('existing', 'עסקה קיימת');
    const imported = transaction('imported', 'MYST');
    const { rerender } = render(
      <TransactionsView
        items={[existing]}
        categories={[]}
      />,
    );

    expect(screen.queryByText('MYST')).not.toBeInTheDocument();

    rerender(
      <TransactionsView
        items={[imported, existing]}
        categories={[]}
      />,
    );

    expect(screen.getByText('MYST')).toBeInTheDocument();
    expect(screen.getByText('עסקה קיימת')).toBeInTheDocument();
  });
});
