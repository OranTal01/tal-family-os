import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agorot } from '@/types/money';
import {
  ImportWorkbookError,
  MAX_IMPORT_FILE_BYTES,
} from '@/lib/imports/workbook';
import {
  commitTransactionImportAction,
  previewTransactionImportAction,
} from './actions';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getCurrentHouseholdMembership: vi.fn(),
  parseTransactionWorkbook: vi.fn(),
  createClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  peopleIs: vi.fn(),
  peopleSingle: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/dal', () => ({
  getCurrentUser: mocks.getCurrentUser,
  getCurrentHouseholdMembership: mocks.getCurrentHouseholdMembership,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
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

function commitFormData(
  decisions: unknown = [
    {
      sourceRow: 3,
      fingerprint: 'a'.repeat(64),
      context: 'household',
      kind: 'expense',
      allowDuplicate: false,
    },
  ],
) {
  const formData = fileFormData();
  formData.set('decisions', JSON.stringify(decisions));
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
      fingerprint: 'a'.repeat(64),
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
  mocks.peopleIs.mockResolvedValue({
    data: [
      { id: 'person-oran', name: 'אורן' },
      { id: 'person-danielle', name: 'דניאל' },
    ],
    error: null,
  });
  mocks.peopleSingle.mockResolvedValue({
    data: { id: 'created-person', name: 'אורן' },
    error: null,
  });
  mocks.from.mockImplementation((table: string) => {
    if (table !== 'people') throw new Error(`Unexpected table: ${table}`);
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: mocks.peopleIs,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mocks.peopleSingle,
        })),
      })),
    };
  });
  mocks.rpc.mockResolvedValue({
    data: [
      {
        batch_id: 'batch-1',
        inserted_count: 1,
        duplicate_count: 0,
        review_count: 1,
      },
    ],
    error: null,
  });
  mocks.createClient.mockResolvedValue({
    from: mocks.from,
    rpc: mocks.rpc,
  });
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

describe('commitTransactionImportAction', () => {
  it('reparses the trusted file and commits only the matching user choices', async () => {
    const result = await commitTransactionImportAction(commitFormData());

    expect(result).toEqual({
      status: 'success',
      message: '1 תנועות נשמרו בהצלחה.',
      batchId: 'batch-1',
      insertedCount: 1,
      duplicateCount: 0,
      reviewCount: 1,
      skippedCount: 0,
    });
    expect(mocks.parseTransactionWorkbook).toHaveBeenCalledWith(
      expect.any(Buffer),
      'transactions.xlsx',
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      'commit_transaction_import',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_provider: 'cal',
        p_parser_version: 'xlsx-v1',
        p_file_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        p_rows: [
          expect.objectContaining({
            source_row: 3,
            fingerprint: 'a'.repeat(64),
            amount: -1_000,
            context: 'household',
            owner_person_id: 'person-oran',
            kind: 'expense',
          }),
        ],
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/transactions');
  });

  it('rejects a browser decision that does not match the reparsed workbook', async () => {
    const result = await commitTransactionImportAction(
      commitFormData([
        {
          sourceRow: 3,
          fingerprint: 'b'.repeat(64),
          context: 'household',
          kind: 'expense',
          allowDuplicate: false,
        },
      ]),
    );

    expect(result).toEqual({
      status: 'error',
      message: 'חסר סיווג לאחת התנועות. יש לבדוק את הרשימה ולנסות שוב.',
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('blocks read-only household viewers before parsing the file', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue({
      householdId: 'household-1',
      role: 'viewer',
    });

    const result = await commitTransactionImportAction(commitFormData());

    expect(result).toEqual({
      status: 'error',
      message: 'אין לחשבון הזה הרשאה לשמור תנועות במשק הבית.',
    });
    expect(mocks.parseTransactionWorkbook).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('explains an already-imported source file without exposing database details', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        code: 'P0001',
        message: 'this source file already has an active import',
      },
    });

    const result = await commitTransactionImportAction(commitFormData());

    expect(result).toEqual({
      status: 'error',
      message:
        'הקובץ הזה כבר נשמר בעבר. אפשר לראות את התנועות שלו במסך התנועות.',
    });
  });
});
