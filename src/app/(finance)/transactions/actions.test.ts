import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agorot } from '@/types/money';
import {
  ImportWorkbookError,
  MAX_IMPORT_FILE_BYTES,
} from '@/lib/imports/workbook';
import { previewTransactionImportAction } from './actions';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getCurrentHouseholdMembership: vi.fn(),
  parseTransactionWorkbook: vi.fn(),
}));

vi.mock('@/lib/supabase/dal', () => ({
  getCurrentUser: mocks.getCurrentUser,
  getCurrentHouseholdMembership: mocks.getCurrentHouseholdMembership,
}));

vi.mock('@/lib/imports/workbook', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/imports/workbook')>();
  return {
    ...actual,
    parseTransactionWorkbook: mocks.parseTransactionWorkbook,
  };
});

function fileFormData(
  name = 'transactions.xlsx',
  type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  bytes: number[] = [0x50, 0x4b, 0x03, 0x04],
) {
  const formData = new FormData();
  formData.set('file', new File([new Uint8Array(bytes)], name, { type }));
  return formData;
}

const preview = {
  fileName: 'transactions.xlsx',
  provider: 'cal' as const,
  providerLabel: 'כאל',
  ownerHint: 'oran' as const,
  ownerLabel: 'אורן',
  accountLabels: ['כאל ••1234'],
  candidates: [
    {
      id: 'candidate-1',
      fingerprint: 'fingerprint-1',
      sourceRow: 3,
      account: {
        provider: 'cal' as const,
        accountType: 'credit_card' as const,
        ownerHint: 'oran' as const,
        last4: '1234',
      },
      dateISO: '2026-07-01',
      amount: agorot(-1_000),
      currency: 'ILS' as const,
      merchant: 'חנות לדוגמה',
      status: 'cleared' as const,
      suggestedKind: 'expense' as const,
      suggestedContext: 'household' as const,
      reviewReasons: [],
      eligible: true,
    },
  ],
  stats: {
    detected: 1,
    eligible: 1,
    needsReview: 0,
    pending: 0,
    duplicates: 0,
    skipped: 0,
  },
  notices: ['תצוגה בלבד'],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: 'profile-1' });
  mocks.getCurrentHouseholdMembership.mockResolvedValue({
    householdId: 'household-1',
    role: 'owner',
  });
  mocks.parseTransactionWorkbook.mockResolvedValue(preview);
});

describe('previewTransactionImportAction', () => {
  it('requires an authenticated household before reading the file', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const result = await previewTransactionImportAction(
      { status: 'idle', message: '' },
      fileFormData(),
    );

    expect(result.status).toBe('error');
    expect(mocks.parseTransactionWorkbook).not.toHaveBeenCalled();
  });

  it('rejects non-XLSX files before parsing', async () => {
    const result = await previewTransactionImportAction(
      { status: 'idle', message: '' },
      fileFormData('transactions.csv', 'text/csv'),
    );

    expect(result).toEqual({
      status: 'error',
      message: 'אפשר להעלות רק קובץ Excel מסוג XLSX.',
    });
    expect(mocks.parseTransactionWorkbook).not.toHaveBeenCalled();
  });

  it('returns only the constrained preview from the server parser', async () => {
    const result = await previewTransactionImportAction(
      { status: 'idle', message: '' },
      fileFormData(),
    );

    expect(result).toEqual({
      status: 'preview',
      message: 'זוהו 1 תנועות. דבר עדיין לא נשמר.',
      preview,
    });
    expect(mocks.parseTransactionWorkbook).toHaveBeenCalledWith(
      expect.any(Buffer),
      'transactions.xlsx',
    );
  });

  it('maps parser failures without leaking workbook contents', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.parseTransactionWorkbook.mockRejectedValue(
      new ImportWorkbookError('unsupported_source'),
    );

    const result = await previewTransactionImportAction(
      { status: 'idle', message: '' },
      fileFormData(),
    );

    expect(result).toEqual({
      status: 'error',
      message:
        'לא זיהינו יצוא של הבנק הבינלאומי, כאל או ישראכרט בקובץ הזה.',
    });
    expect(consoleError).toHaveBeenCalledWith(
      'Transaction import preview failed',
      { code: 'unsupported_source' },
    );
    consoleError.mockRestore();
  });

  it('rejects an oversized upload before allocating its ArrayBuffer', async () => {
    const formData = new FormData();
    const file = new File(['x'], 'too-large.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    Object.defineProperty(file, 'size', {
      value: MAX_IMPORT_FILE_BYTES + 1,
    });
    formData.set('file', file);

    const result = await previewTransactionImportAction(
      { status: 'idle', message: '' },
      formData,
    );

    expect(result.status).toBe('error');
    expect(mocks.parseTransactionWorkbook).not.toHaveBeenCalled();
  });
});
