import type { TransactionKind } from '@/types/domain';
import {
  buildHeaderMap,
  cellText,
  dateToISO,
  extractAccountLast4,
  normalizedHeader,
  pushUnique,
  toAgorot,
} from '../parse-helpers';
import type {
  ImportReviewReason,
  ProviderParseResult,
  SpreadsheetRow,
} from '../types';

const REQUIRED_HEADERS = [
  'תאריך ערך',
  'זכות',
  'חובה',
  'תיאור',
  'אסמכתא',
  'סוג פעולה',
  'תאריך',
] as const;

const CREDIT_CARD_SETTLEMENT_PATTERN =
  /כרטיסי אשראי|ישראכרט|כאל|הרשאה דיינרס|חיוב דיינרס/i;

const CASH_TRANSFER_PATTERN =
  /משיכת מזומן|כספומט|משיכת מזומנים/i;

const SAVINGS_CONTRIBUTION_PATTERN =
  /פנסיה וגמל|קרן השתלמות|קופת גמל|הפקדה (?:ל)?חיסכון|הפקדה (?:ל)?פיקדון/i;

const OUTGOING_TRANSFER_PATTERN = /העברה|bit|ביט|paybox|פייבוקס/i;

export function isFibiWorkbook(rows: SpreadsheetRow[]): boolean {
  return rows.some((row) => {
    const values = new Set(row.map(normalizedHeader));
    return REQUIRED_HEADERS.every((header) => values.has(header));
  });
}

export function parseFibiRows(rows: SpreadsheetRow[]): ProviderParseResult {
  const headerIndex = rows.findIndex((row) => {
    const values = new Set(row.map(normalizedHeader));
    return REQUIRED_HEADERS.every((header) => values.has(header));
  });

  if (headerIndex < 0) {
    throw new Error('FIBI_HEADER_NOT_FOUND');
  }

  const headers = buildHeaderMap(rows[headerIndex]);
  const balanceColumn = headers.get('יתרה');
  const accountLast4 = extractAccountLast4(rows);
  const candidates: ProviderParseResult['candidates'] = [];
  const rejected: ProviderParseResult['rejected'] = [];

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const bookingDate = row[headers.get('תאריך')!];
    const valueDate = row[headers.get('תאריך ערך')!];
    const dateISO = dateToISO(bookingDate) ?? dateToISO(valueDate);
    if (!dateISO) continue;

    const merchant = cellText(row[headers.get('תיאור')!]);
    if (!merchant) {
      rejected.push({ sourceRow: index + 1, reason: 'missing_merchant' });
      continue;
    }

    const creditValue = row[headers.get('זכות')!];
    const debitValue = row[headers.get('חובה')!];
    const credit = typeof creditValue === 'number' && creditValue !== 0
      ? creditValue
      : undefined;
    const debit = typeof debitValue === 'number' && debitValue !== 0
      ? debitValue
      : undefined;

    if ((credit ? 1 : 0) + (debit ? 1 : 0) !== 1) {
      rejected.push({
        sourceRow: index + 1,
        reason:
          creditValue === 0 || debitValue === 0
            ? 'zero_amount'
            : 'ambiguous_amount',
      });
      continue;
    }

    const operationType = cellText(row[headers.get('סוג פעולה')!]);
    const movementText = `${merchant} ${operationType}`;
    const creditCardSettlement =
      CREDIT_CARD_SETTLEMENT_PATTERN.test(movementText);
    const savingsContribution =
      SAVINGS_CONTRIBUTION_PATTERN.test(movementText);
    const cashTransfer = CASH_TRANSFER_PATTERN.test(movementText);
    const nonSpendingMovement =
      creditCardSettlement || savingsContribution || cashTransfer;
    const suggestedKind: TransactionKind = nonSpendingMovement
      ? 'transfer'
      : credit
        ? 'income'
        : 'expense';
    const reviewReasons: ImportReviewReason[] = [];
    if (creditCardSettlement) {
      pushUnique(reviewReasons, 'credit_card_settlement');
    } else if (savingsContribution) {
      pushUnique(reviewReasons, 'savings_contribution');
    } else if (cashTransfer) {
      pushUnique(reviewReasons, 'possible_transfer');
    }
    if (credit) pushUnique(reviewReasons, 'confirm_context');
    if (
      debit &&
      !nonSpendingMovement &&
      OUTGOING_TRANSFER_PATTERN.test(`${merchant} ${operationType}`)
    ) {
      pushUnique(reviewReasons, 'possible_transfer');
      pushUnique(reviewReasons, 'confirm_context');
    }

    candidates.push({
      sourceRow: index + 1,
      account: {
        provider: 'fibi',
        accountType: 'bank',
        ownerHint: 'shared',
        last4: accountLast4,
      },
      dateISO,
      amount: toAgorot(credit ? Math.abs(credit) : -Math.abs(debit!)),
      currency: 'ILS',
      merchant,
      reference: cellText(row[headers.get('אסמכתא')!]) || undefined,
      transactionType: operationType || undefined,
      balanceAfter:
        balanceColumn !== undefined &&
        typeof row[balanceColumn] === 'number'
          ? toAgorot(row[balanceColumn] as number)
          : undefined,
      status: 'cleared',
      suggestedKind,
      suggestedContext: reviewReasons.includes('confirm_context')
        ? undefined
        : 'household',
      reviewReasons,
      eligible: reviewReasons.length === 0,
    });
  }

  return {
    provider: 'fibi',
    ownerHint: 'shared',
    candidates,
    rejected,
  };
}
