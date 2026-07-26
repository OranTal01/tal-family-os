import type { TransactionKind } from '@/types/domain';
import {
  buildHeaderMap,
  cellText,
  dateToISO,
  detectOwnerHint,
  extractLast4,
  normalizedHeader,
  pushUnique,
  toAgorot,
} from '../parse-helpers';
import type {
  ImportCurrency,
  ImportReviewReason,
  ProviderParseResult,
  SpreadsheetRow,
} from '../types';

const REQUIRED_HEADERS = [
  'תאריך עסקה',
  'שם בית עסק',
  'סכום בש"ח',
  'סכום בדולר',
  'כרטיס',
  'מועד חיוב',
  'סוג עסקה',
] as const;

export function isCalWorkbook(rows: SpreadsheetRow[]): boolean {
  return rows.some((row) => {
    const values = new Set(row.map(normalizedHeader));
    return REQUIRED_HEADERS.every((header) => values.has(header));
  });
}
export function parseCalRows(rows: SpreadsheetRow[]): ProviderParseResult {
  const headerIndex = rows.findIndex((row) => {
    const values = new Set(row.map(normalizedHeader));
    return REQUIRED_HEADERS.every((header) => values.has(header));
  });

  if (headerIndex < 0) {
    throw new Error('CAL_HEADER_NOT_FOUND');
  }

  const headers = buildHeaderMap(rows[headerIndex]);
  const ownerHint = detectOwnerHint(rows);
  const candidates: ProviderParseResult['candidates'] = [];
  const rejected: ProviderParseResult['rejected'] = [];

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const dateISO = dateToISO(row[headers.get('תאריך עסקה')!]);
    if (!dateISO) continue;

    const merchant = cellText(row[headers.get('שם בית עסק')!]);
    if (!merchant) {
      rejected.push({ sourceRow: index + 1, reason: 'missing_merchant' });
      continue;
    }

    const ilsValue = row[headers.get('סכום בש"ח')!];
    const usdValue = row[headers.get('סכום בדולר')!];
    const ilsAmount = typeof ilsValue === 'number' ? ilsValue : undefined;
    const usdAmount = typeof usdValue === 'number' ? usdValue : undefined;
    const hasIls = ilsAmount !== undefined && ilsAmount !== 0;
    const hasUsd = usdAmount !== undefined && usdAmount !== 0;

    if (!hasIls && !hasUsd) {
      rejected.push({
        sourceRow: index + 1,
        reason: ilsAmount === 0 || usdAmount === 0 ? 'zero_amount' : 'missing_amount',
      });
      continue;
    }

    if (hasIls && hasUsd) {
      rejected.push({ sourceRow: index + 1, reason: 'ambiguous_amount' });
      continue;
    }

    const sourceAmount = hasIls ? ilsAmount! : usdAmount!;
    const currency: ImportCurrency = hasIls ? 'ILS' : 'USD';
    const transactionType = cellText(row[headers.get('סוג עסקה')!]);
    const isCashWithdrawal = transactionType === 'משיכת מזומן';
    const isRefund = sourceAmount < 0;
    const suggestedKind: TransactionKind = isCashWithdrawal
      ? 'transfer'
      : isRefund
        ? 'refund'
        : 'expense';
    const reviewReasons: ImportReviewReason[] = [];

    if (isCashWithdrawal) pushUnique(reviewReasons, 'possible_transfer');
    if (ownerHint === 'danielle') pushUnique(reviewReasons, 'confirm_context');

    const cardValue = row[headers.get('כרטיס')!];
    const cardLast4 = extractLast4(cardValue);
    const notesIndex = headers.get('הערות');
    const walletIndex = headers.get('מזהה כרטיס בארנק דיגילטי');
    const note = notesIndex === undefined ? '' : cellText(row[notesIndex]);
    const walletId = walletIndex === undefined ? '' : cellText(row[walletIndex]);
    const description = [transactionType, note].filter(Boolean).join(' · ');

    candidates.push({
      sourceRow: index + 1,
      account: {
        provider: 'cal',
        accountType: 'credit_card',
        ownerHint,
        last4: cardLast4,
      },
      dateISO,
      chargeDateISO: dateToISO(row[headers.get('מועד חיוב')!]),
      amount: toAgorot(
        suggestedKind === 'refund' ? Math.abs(sourceAmount) : -Math.abs(sourceAmount),
      ),
      currency,
      merchant,
      description: description || undefined,
      reference: walletId || undefined,
      transactionType: transactionType || undefined,
      status: 'cleared',
      suggestedKind,
      suggestedContext: ownerHint === 'danielle' ? undefined : 'household',
      reviewReasons,
      eligible: reviewReasons.length === 0,
    });
  }

  return { provider: 'cal', ownerHint, candidates, rejected };
}
