import type {
  Context,
  IncomeClass,
  TransactionKind,
} from '@/types/domain';
import type { Agorot } from '@/types/money';

export type ImportProvider = 'fibi' | 'cal' | 'isracard';
export type ImportOwnerHint = 'oran' | 'danielle' | 'shared' | 'unknown';
export type ImportCurrency = 'ILS' | 'USD' | 'EUR' | 'GBP';
export type ImportTransactionStatus = 'cleared' | 'pending';

export type ImportReviewReason =
  | 'possible_duplicate'
  | 'possible_transfer'
  | 'pending'
  | 'confirm_context';

export type ImportRejectedReason =
  | 'invalid_date'
  | 'missing_merchant'
  | 'missing_amount'
  | 'zero_amount'
  | 'ambiguous_amount';

export type SpreadsheetCell = string | number | boolean | Date | null;
export type SpreadsheetRow = SpreadsheetCell[];

export type ImportAccountHint = {
  provider: ImportProvider;
  accountType: 'bank' | 'credit_card';
  ownerHint: ImportOwnerHint;
  last4?: string;
};
export type ImportCandidate = {
  id: string;
  fingerprint: string;
  sourceRow: number;
  account: ImportAccountHint;
  dateISO: string;
  chargeDateISO?: string;
  amount: Agorot;
  currency: ImportCurrency;
  merchant: string;
  description?: string;
  reference?: string;
  transactionType?: string;
  status: ImportTransactionStatus;
  suggestedKind: TransactionKind;
  suggestedContext?: Context;
  reviewReasons: ImportReviewReason[];
  eligible: boolean;
};

export type UnfingerprintedImportCandidate = Omit<
  ImportCandidate,
  'id' | 'fingerprint'
>;

export type RejectedImportRow = {
  sourceRow: number;
  reason: ImportRejectedReason;
};

export type ProviderParseResult = {
  provider: ImportProvider;
  ownerHint: ImportOwnerHint;
  candidates: UnfingerprintedImportCandidate[];
  rejected: RejectedImportRow[];
};

export type ImportPreview = {
  fileName: string;
  provider: ImportProvider;
  providerLabel: string;
  ownerHint: ImportOwnerHint;
  ownerLabel: string;
  accountLabels: string[];
  candidates: ImportCandidate[];
  stats: {
    detected: number;
    eligible: number;
    needsReview: number;
    pending: number;
    duplicates: number;
    skipped: number;
  };
  notices: string[];
};

export type ImportActionState =
  | { status: 'idle'; message: string }
  | { status: 'error'; message: string }
  | { status: 'preview'; message: string; preview: ImportPreview };

export type ImportDecision = {
  sourceRow: number;
  fingerprint: string;
  context: Context;
  kind: TransactionKind;
  incomeClass?: IncomeClass;
  allowDuplicate: boolean;
};

export type ImportCommitActionState =
  | { status: 'idle'; message: string }
  | { status: 'error'; message: string }
  | {
      status: 'success';
      message: string;
      batchId: string;
      insertedCount: number;
      duplicateCount: number;
      reviewCount: number;
      skippedCount: number;
    };

export const initialImportActionState: ImportActionState = {
  status: 'idle',
  message: '',
};

export const initialImportCommitActionState: ImportCommitActionState = {
  status: 'idle',
  message: '',
};
