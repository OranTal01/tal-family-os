import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ImportCandidate } from '@/lib/imports/types';
import { agorot } from '@/types/money';
import { ImportReviewList } from './import-review-list';

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
    render(<ImportReviewList candidates={candidates} skipped={0} />);

    expect(screen.getByText('0 מתוך 2 סווגו')).toBeInTheDocument();

    const expenseRow = screen.getByText('צילום לעסק').closest('li');
    expect(expenseRow).not.toBeNull();
    await user.click(
      within(expenseRow!).getByRole('radio', { name: 'עסק' }),
    );
    expect(screen.getByText('1 מתוך 2 סווגו')).toBeInTheDocument();

    const incomeRow = screen.getByText('תשלום מלקוחה בביט').closest('li');
    expect(incomeRow).not.toBeNull();
    await user.click(
      within(incomeRow!).getByRole('radio', { name: 'עסק' }),
    );
    expect(screen.getByText('1 מתוך 2 סווגו')).toBeInTheDocument();

    await user.click(
      within(incomeRow!).getByLabelText('סיווג הכנסה'),
    );
    await user.click(
      screen.getByRole('option', { name: 'הכנסה מהעסק' }),
    );

    expect(screen.getByText('2 מתוך 2 סווגו')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'שמירת התנועות' }),
    ).toBeDisabled();
    expect(
      screen.getByText(/עדיין לא נכתבו נתונים למסד הנתונים/),
    ).toBeInTheDocument();
  });
});
