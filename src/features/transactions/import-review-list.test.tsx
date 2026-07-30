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
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'שיווק ופרסום',
    icon: 'campaign',
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
  it('moves focus to the first incomplete row and explains what is missing', async () => {
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

    const save = screen.getByRole('button', {
      name: 'שמירת 0 תנועות',
    });
    expect(save).toBeEnabled();

    await user.click(save);

    const expenseRow = screen.getByText('צילום לעסק').closest('li');
    expect(expenseRow).toHaveFocus();
    expect(expenseRow).toHaveAttribute('data-invalid', 'true');
    expect(
      within(expenseRow!).getByRole('alert'),
    ).toHaveTextContent(
      'יש לבחור משק בית או עסק עבור צילום לעסק (שורה 10 בקובץ).',
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('moves focus to a row identified by a server save error', () => {
    render(
      <ImportReviewList
        candidates={candidates}
        categories={categories}
        skipped={0}
        saveError={{
          message: 'לא הצלחנו לזהות את הכרטיס בשורה הזאת.',
          sourceRow: 11,
        }}
        onSave={vi.fn()}
      />,
    );

    const incomeRow = screen
      .getByText('תשלום מלקוחה בביט')
      .closest('li');
    expect(incomeRow).toHaveFocus();
    expect(incomeRow).toHaveAttribute('data-invalid', 'true');
    expect(within(incomeRow!).getByRole('alert')).toHaveTextContent(
      'לא הצלחנו לזהות את הכרטיס בשורה הזאת.',
    );
  });

  it('allows a pending card transaction to be classified and saved', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const pendingCandidate: ImportCandidate = {
      ...candidates[0],
      id: 'pending-expense',
      fingerprint: 'pending-fingerprint',
      sourceRow: 14,
      merchant: 'MYST',
      status: 'pending',
      suggestedContext: 'household',
      reviewReasons: ['pending'],
    };

    render(
      <ImportReviewList
        candidates={[pendingCandidate]}
        categories={categories}
        skipped={0}
        onSave={onSave}
      />,
    );

    const pendingRow = screen.getByText('MYST').closest('li');
    expect(pendingRow).not.toBeNull();
    expect(
      within(pendingRow!).getByRole('radio', { name: 'משק בית' }),
    ).toBeEnabled();
    expect(within(pendingRow!).getByLabelText('סוג תנועה')).toBeEnabled();
    expect(within(pendingRow!).getByLabelText('קטגוריה')).toBeEnabled();
    expect(
      within(pendingRow!).getByText(/אפשר לסווג ולשמור אותה עכשיו/),
    ).toBeInTheDocument();

    await user.click(within(pendingRow!).getByLabelText('קטגוריה'));
    await user.click(
      await screen.findByRole('option', { name: 'סופר וקניות' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'שמירת 1 תנועות' }),
    );

    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({
        sourceRow: 14,
        context: 'household',
        kind: 'expense',
        categoryId: '10000000-0000-4000-8000-000000000001',
      }),
    ]);
  });

  it('explains that a monthly card settlement is excluded, not an internal expense', () => {
    const settlement: ImportCandidate = {
      ...candidates[0],
      id: 'card-settlement',
      fingerprint: 'settlement-fingerprint',
      sourceRow: 18,
      account: {
        provider: 'fibi',
        accountType: 'bank',
        ownerHint: 'shared',
        last4: '3270',
      },
      merchant: 'הרשאה דיינרס',
      suggestedKind: 'transfer',
      suggestedContext: 'household',
      reviewReasons: ['credit_card_settlement'],
    };

    render(
      <ImportReviewList
        candidates={[settlement]}
        categories={categories}
        skipped={0}
        onSave={vi.fn()}
      />,
    );

    const settlementRow = screen.getByText('הרשאה דיינרס').closest('li');
    expect(settlementRow).not.toBeNull();
    expect(
      within(settlementRow!).getByLabelText('סוג תנועה'),
    ).toHaveTextContent('חיוב כרטיס — לא נספר כהוצאה');
    expect(
      within(settlementRow!).getByText(
        /החיוב החודשי לא יישמר כהוצאה/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('0 תנועות מוכנות לשמירה'),
    ).toBeInTheDocument();
  });

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
    const categorySearch = await screen.findByRole('combobox', {
      name: 'חיפוש קטגוריה',
    });
    expect(
      screen.getByRole('option', { name: 'שיווק ופרסום' }),
    ).toBeInTheDocument();
    await user.type(categorySearch, 'ציוד');
    expect(
      screen.queryByRole('option', { name: 'שיווק ופרסום' }),
    ).not.toBeInTheDocument();
    const equipmentOption = await screen.findByRole('option', {
      name: 'ציוד וטכנולוגיה',
    });
    expect(equipmentOption).toHaveClass('justify-start', 'text-start');
    await user.click(
      equipmentOption,
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
