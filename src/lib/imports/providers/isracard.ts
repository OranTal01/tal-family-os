import type { TransactionKind } from '@/types/domain';
import {
  buildHeaderMap,
  cellText,
  detectOwnerHint,
  extractLast4,
  normalizeCurrency,
  normalizedHeader,
  parseIsraeliDate,
  pushUnique,
  toAgorot,
} from '../parse-helpers';
import type {
  ImportReviewReason,
  ProviderParseResult,
  SpreadsheetRow,
} from '../types';

const BASE_HEADERS = ['תאריך רכישה', 'שם בית עסק', 'סכום עסקה'] as const;

export function isIsracardWorkbook(rows: SpreadsheetRow[]): boolean {
  return rows.some((row) => {
    const values = new Set(row.map(normalizedHeader));
    return BASE_HEADERS.every((header) => values.has(header));
  });
}

function findCardLast4(rows: SpreadsheetRow[]): string | undefined {
  for (const row of rows.slice(0, 12)) {
    const text = row.map(cellText).join(' ');
    const looksLikeCardHeading =
      text.includes('כרטיס') ||
      /(?:mastercard|masterca|visa|world elite|amex|מסטרקארד|מאסטרקארד|ויזה|אמריקן אקספרס|ישראכרט|דיינרס)/i.test(
        text,
      );
    if (!looksLikeCardHeading) continue;
    const last4 = extractLast4(text);
    if (last4) return last4;
  }
  return undefined;
}

export function parseIsracardRows(rows: SpreadsheetRow[]): ProviderParseResult {
  const ownerHint = detectOwnerHint(rows);
  const cardLast4 = findCardLast4(rows);
  const candidates: ProviderParseResult['candidates'] = [];
  const rejected: ProviderParseResult['rejected'] = [];

  const headerIndexes = rows
    .map((row, index) => {
      const values = new Set(row.map(normalizedHeader));
      return BASE_HEADERS.every((header) => values.has(header)) ? index : -1;
    })
    .filter((index) => index >= 0);

  if (headerIndexes.length === 0) {
    throw new Error('ISRACARD_HEADER_NOT_FOUND');
  }

  for (let section = 0; section < headerIndexes.length; section += 1) {
    const headerIndex = headerIndexes[section];
    const nextHeaderIndex = headerIndexes[section + 1] ?? rows.length;
    const headers = buildHeaderMap(rows[headerIndex]);
    const pending =
      !headers.has('סכום חיוב') ||
      rows
        .slice(Math.max(0, headerIndex - 3), headerIndex)
        .flat()
        .map(cellText)
        .some((text) => text.includes('טרם נקלטו'));

    for (let index = headerIndex + 1; index < nextHeaderIndex; index += 1) {
      const row = rows[index];
      const dateISO = parseIsraeliDate(row[headers.get('תאריך רכישה')!]);
      if (!dateISO) continue;

      const merchant = cellText(row[headers.get('שם בית עסק')!]);
      if (!merchant) {
        rejected.push({ sourceRow: index + 1, reason: 'missing_merchant' });
        continue;
      }

      const transactionAmountValue = row[headers.get('סכום עסקה')!];
      const chargeAmountIndex = headers.get('סכום חיוב');
      const chargeAmountValue =
        chargeAmountIndex === undefined ? undefined : row[chargeAmountIndex];
      const sourceAmount =
        typeof chargeAmountValue === 'number'
          ? chargeAmountValue
          : typeof transactionAmountValue === 'number'
            ? transactionAmountValue
            : undefined;

      if (sourceAmount === undefined) {
        rejected.push({ sourceRow: index + 1, reason: 'missing_amount' });
        continue;
      }
      if (sourceAmount === 0) {
        rejected.push({ sourceRow: index + 1, reason: 'zero_amount' });
        continue;
      }

      const suggestedKind: TransactionKind =
        sourceAmount < 0 ? 'refund' : 'expense';
      const reviewReasons: ImportReviewReason[] = [];
      if (pending) pushUnique(reviewReasons, 'pending');
      if (ownerHint === 'danielle') pushUnique(reviewReasons, 'confirm_context');

      const transactionCurrencyIndex = headers.get('מטבע עסקה');
      const chargeCurrencyIndex = headers.get('מטבע חיוב');
      const detailsIndex = headers.get('פירוט נוסף');
      const voucherIndex = headers.get("מס' שובר");

      candidates.push({
        sourceRow: index + 1,
        account: {
          provider: 'isracard',
          accountType: 'credit_card',
          ownerHint,
          last4: cardLast4,
        },
        dateISO,
        amount: toAgorot(
          suggestedKind === 'refund'
            ? Math.abs(sourceAmount)
            : -Math.abs(sourceAmount),
        ),
        currency: normalizeCurrency(
          chargeCurrencyIndex === undefined ? undefined : row[chargeCurrencyIndex],
          normalizeCurrency(
            transactionCurrencyIndex === undefined
              ? undefined
              : row[transactionCurrencyIndex],
          ),
        ),
        merchant,
        description:
          detailsIndex === undefined ? undefined : cellText(row[detailsIndex]) || undefined,
        reference:
          voucherIndex === undefined ? undefined : cellText(row[voucherIndex]) || undefined,
        status: pending ? 'pending' : 'cleared',
        suggestedKind,
        suggestedContext: ownerHint === 'danielle' ? undefined : 'household',
        reviewReasons,
        eligible: reviewReasons.length === 0,
      });
    }
  }

  return { provider: 'isracard', ownerHint, candidates, rejected };
}
