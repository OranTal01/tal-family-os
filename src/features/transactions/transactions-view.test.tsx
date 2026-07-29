import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransactionItem } from '@/server/data/views';
import { agorot } from '@/types/money';
import { TransactionsView } from './transactions-view';

const mocks = vi.hoisted(() => ({
  updateTransactionClassificationAction: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('@/app/(finance)/transactions/actions', () => ({
  updateTransactionClassificationAction:
    mocks.updateTransactionClassificationAction,
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateTransactionClassificationAction.mockResolvedValue({
      status: 'success',
      message: 'התנועה נשמרה בהצלחה.',
      transaction: {
        id: 'existing',
        categoryId: '10000000-0000-4000-8000-000000000001',
        categoryName: 'ילדים',
        categoryIcon: 'child_care',
        context: 'household',
        ownerId: 'shared',
        needsReview: false,
      },
      ruleSaved: false,
    });
  });

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

  it('persists an existing transaction from its detail sheet', async () => {
    const user = userEvent.setup();
    const existing = transaction('existing', 'עסקה קיימת');

    render(
      <TransactionsView
        items={[existing]}
        categories={[
          {
            id: '10000000-0000-4000-8000-000000000001',
            name: 'ילדים',
            icon: 'child_care',
            context: 'household',
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /עסקה קיימת/ }),
    );
    await user.click(screen.getByRole('button', { name: 'שמירה' }));

    await waitFor(() => {
      expect(
        mocks.updateTransactionClassificationAction,
      ).toHaveBeenCalledWith({
        transactionId: 'existing',
        categoryId: '10000000-0000-4000-8000-000000000001',
        context: 'household',
        ownerId: 'shared',
        rememberRule: false,
      });
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('keeps the detail sheet open and explains a save failure', async () => {
    const user = userEvent.setup();
    mocks.updateTransactionClassificationAction.mockResolvedValueOnce({
      status: 'error',
      message: 'הקטגוריה שנבחרה אינה מתאימה למשק הבית או לעסק.',
    });

    render(
      <TransactionsView
        items={[transaction('existing', 'עסקה קיימת')]}
        categories={[
          {
            id: '10000000-0000-4000-8000-000000000001',
            name: 'ילדים',
            icon: 'child_care',
            context: 'household',
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /עסקה קיימת/ }),
    );
    await user.click(screen.getByRole('button', { name: 'שמירה' }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'הקטגוריה שנבחרה אינה מתאימה למשק הבית או לעסק.',
    );
    expect(screen.getByRole('button', { name: 'שמירה' })).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
