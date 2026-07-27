import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportCandidate } from '@/lib/imports/types';
import { agorot } from '@/types/money';
import { ImportReviewList } from './import-review-list';

const categories = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'סופר וקניות',
    icon: 'shopping_cart',
    context: 'household' as const,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'ציוד וטכנולוגיה',
    icon: 'devices',
    context: 'business' as const,
  },
];

const candidates: ImportCandidate[] = [
  {
    id: 'danielle-expense',
    fingerprint: 'expense-fingerprint',
    sourceRow: 10,
    account: {
      provider: 'cal',
      accountType: 'credit_card',
      ownerHint: 'danielle',
      last4: '1639',
    },
    dateISO: '2026-07-02',
    amount: agorot(-12_345),
    currency: 'ILS',
    merchant: 'צילום לעסק',
    status: 'cleared',
    suggestedKind: 'expense',
    reviewReasons: ['confirm_context'],
    eligible: false,
  },
  {
    id: 'business-payment',
    fingerprint: 'income-fingerprint',
    sourceRow: 11,
    account: {
      provider: 'fibi',
      accountType: 'bank',
      ownerHint: 'shared',
      last4: '3456',
    },
    dateISO: '2026-07-03',
    amount: agorot(50_000),
    currency: 'ILS',
    merchant: 'תשלום מלקוחה בביט',
    transactionType: 'העברה',
    status: 'cleared',
    suggestedKind: 'income',
    reviewReasons: ['confirm_context'],
    eligible: false,
  },
];

describe('ImportReviewList', () => {
  it('requires per-row context and an income class before classification is complete', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ImportReviewList
        candidates={candidates}
        categories={categories}
        skipped={0}
        onSave={onSave}
      />,
    );

    expect(screen.getByText('0 תנועות מוכנות לשמירה')).toBeInTheDocument();

    const expenseRow = screen.getByText('צילום לעסק').closest('li');
    expect(expenseRow).not.toBeNull();
    expect(within(expenseRow!).getByLabelText('סוג תנועה')).toHaveTextContent(
      'הוצאה',
    );
    expect(
      within(expenseRow!).getByLabelText('סוג תנועה'),
    ).not.toHaveTextContent('expense');
    await user.click(
      within(expenseRow!).getByRole('radio', { name: 'עסק' }),
    );
    expect(screen.getByText('0 תנועות מוכנות לשמירה')).toBeInTheDocument();
    await user.click(within(expenseRow!).getByLabelText('קטגוריה'));
    await user.click(
      await screen.findByRole('option', { name: 'ציוד וטכנולוגיה' }),
    );
    expect(within(expenseRow!).getByLabelText('קטגוריה')).toHaveTextContent(
      'ציוד וטכנולוגיה',
    );
    expect(
      within(expenseRow!).getByLabelText('קטגוריה'),
    ).not.toHaveTextContent(categories[1].id);
    expect(screen.getByText('1 תנועות מוכנות לשמירה')).toBeInTheDocument();
    expect(
      within(expenseRow!).getByRole('switch', {
        name: 'זכור את צילום לעסק לפעם הבאה',
      }),
    ).toBeChecked();

    const incomeRow = screen.getByText('תשלום מלקוחה בביט').closest('li');
    expect(incomeRow).not.toBeNull();
    await user.click(
      within(incomeRow!).getByRole('radio', { name: 'עסק' }),
    );
    expect(screen.getByText('1 תנועות מוכנות לשמירה')).toBeInTheDocument();

    await user.click(
      within(incomeRow!).getByLabelText('סיווג הכנסה'),
    );
    await user.click(
      await screen.findByRole('option', { name: 'הכנסה מהעסק' }),
    );

    expect(screen.getByText('2 תנועות מוכנות לשמירה')).toBeInTheDocument();
    const save = screen.getByRole('button', {
      name: 'שמירת 2 תנועות',
    });
    expect(save).toBeEnabled();

    await user.click(save);
    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({
        sourceRow: 10,
        context: 'business',
        kind: 'expense',
        categoryId: '10000000-0000-4000-8000-000000000002',
        rememberRule: true,
      }),
      expect.objectContaining({
        sourceRow: 11,
        context: 'business',
        kind: 'income',
        incomeClass: 'business',
        rememberRule: false,
      }),
    ]);
  });
});
