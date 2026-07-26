import { agorot, type Agorot } from '@/types/money';
import type {
  ImportCurrency,
  ImportOwnerHint,
  SpreadsheetCell,
  SpreadsheetRow,
} from './types';

export function cellText(value: SpreadsheetCell | undefined): string {
  if (typeof value === 'string') {
    return value.replaceAll(/\s+/g, ' ').trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

export function normalizedHeader(value: SpreadsheetCell | undefined): string {
  return cellText(value)
    .replaceAll('״', '"')
    .replaceAll('’', "'")
    .replaceAll(/\s+/g, ' ');
}

export function buildHeaderMap(row: SpreadsheetRow): Map<string, number> {
  return new Map(
    row
      .map((value, index) => [normalizedHeader(value), index] as const)
      .filter(([value]) => value.length > 0),
  );
}

export function detectOwnerHint(rows: SpreadsheetRow[]): ImportOwnerHint {
  const metadata = rows
    .slice(0, 12)
    .flat()
    .map(cellText)
    .join(' ');

  if (metadata.includes('דניאל')) return 'danielle';
  if (metadata.includes('אורן')) return 'oran';
  return 'unknown';
}

export function extractLast4(value: SpreadsheetCell | undefined): string | undefined {
  const text = cellText(value);
  const matches = [...text.matchAll(/(?:^|\D)(\d{4})(?=\D|$)/g)];
  return matches.at(-1)?.[1];
}

export function extractAccountLast4(rows: SpreadsheetRow[]): string | undefined {
  for (const row of rows.slice(0, 12)) {
    const text = row.map(cellText).join(' ');
    if (!text.includes('חשבון')) continue;
    const digitGroups = text.match(/\d[\d -]{3,}\d/g) ?? [];
    const digits = digitGroups.at(-1)?.replaceAll(/\D/g, '');
    if (digits && digits.length >= 4) return digits.slice(-4);
  }
  return undefined;
}

export function toAgorot(value: number): Agorot {
  return agorot(Math.round(value * 100));
}

export function dateToISO(value: SpreadsheetCell | undefined): string | undefined {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return undefined;
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsraeliDate(value: SpreadsheetCell | undefined): string | undefined {
  if (value instanceof Date) return dateToISO(value);
  const text = cellText(value);
  const match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(text);
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = Number(match[3]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function normalizeCurrency(
  value: SpreadsheetCell | undefined,
  fallback: ImportCurrency = 'ILS',
): ImportCurrency {
  const text = cellText(value).toUpperCase();
  if (text.includes('USD') || text.includes('דולר') || text.includes('$')) return 'USD';
  if (text.includes('EUR') || text.includes('אירו') || text.includes('€')) return 'EUR';
  if (text.includes('GBP') || text.includes('ליש"ט') || text.includes('£')) return 'GBP';
  if (text.includes('ILS') || text.includes('ש"ח') || text.includes('₪')) return 'ILS';
  return fallback;
}

export function pushUnique<T>(items: T[], value: T): void {
  if (!items.includes(value)) items.push(value);
}
