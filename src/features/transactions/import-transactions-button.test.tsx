import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImportTransactionsButton } from './import-transactions-button';

vi.mock('@/app/(finance)/transactions/actions', () => ({
  commitTransactionImportAction: vi.fn(),
  previewTransactionImportAction: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe('ImportTransactionsButton', () => {
  it('opens an accessible XLSX upload dialog with preview-only guidance', async () => {
    const user = userEvent.setup();
    render(<ImportTransactionsButton categories={[]} />);

    await user.click(
      screen.getByRole('button', { name: 'ייבוא Excel' }),
    );

    expect(
      screen.getByRole('heading', { name: 'ייבוא תנועות מ־Excel' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('קובץ XLSX')).toHaveAttribute(
      'accept',
      expect.stringContaining('.xlsx'),
    );
    expect(
      screen.getByRole('button', { name: 'בדיקה ותצוגה מקדימה' }),
    ).toBeEnabled();
    expect(
      screen.getByText(/הקובץ נקרא בזיכרון בלבד ולא נשמר/),
    ).toBeInTheDocument();
  });
});
