import 'server-only';

import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import readExcelFile from 'read-excel-file/node';
import {
  strFromU8,
  strToU8,
  unzipSync,
  zipSync,
  type Unzipped,
} from 'fflate';
import { isCalWorkbook, parseCalRows } from './providers/cal';
import { isFibiWorkbook, parseFibiRows } from './providers/fibi';
import {
  isIsracardWorkbook,
  parseIsracardRows,
} from './providers/isracard';
import type {
  ImportCandidate,
  ImportOwnerHint,
  ImportPreview,
  ImportProvider,
  ImportReviewReason,
  ProviderParseResult,
  SpreadsheetRow,
  UnfingerprintedImportCandidate,
} from './types';

export const MAX_IMPORT_FILE_BYTES = 1_500_000;
const MAX_XML_ARCHIVE_BYTES = 10_000_000;
const MAX_ARCHIVE_ENTRIES = 500;
const MAX_WORKBOOK_SHEETS = 5;
const MAX_WORKBOOK_ROWS = 5_000;
const MAX_WORKBOOK_COLUMNS = 50;

type ImportWorkbookErrorCode =
  | 'invalid_xlsx'
  | 'archive_too_large'
  | 'unsupported_source'
  | 'ambiguous_source'
  | 'workbook_too_large'
  | 'no_transactions';

export class ImportWorkbookError extends Error {
  constructor(public readonly code: ImportWorkbookErrorCode) {
    super(code);
    this.name = 'ImportWorkbookError';
  }
}

const WORKSHEET_CELL =
  /<((?:[\w-]+:)?)c\b([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/\1c>)/g;

/**
 * Isracard emits rich/empty inline strings and CAL emits typed empty shared
 * strings. Both are legal provider quirks but unsupported by the narrow reader.
 * Convert only those cells into the equivalent plain-string/blank OOXML form.
 */
export function normalizeProviderWorksheetXml(xml: string): string {
  return xml.replace(
    WORKSHEET_CELL,
    (cellXml, prefix: string, attributes: string, body = '') => {
      if (/\bt="inlineStr"/.test(attributes)) {
        const textPattern = new RegExp(
          `<${prefix}t(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${prefix}t>`,
          'g',
        );
        const parts = [...body.matchAll(textPattern)].map((match) => match[1]);
        if (parts.length === 0) {
          return `<${prefix}c${attributes.replace('t="inlineStr"', 't="z"')}></${prefix}c>`;
        }
        return `<${prefix}c${attributes}><${prefix}is><${prefix}t>${parts.join('')}</${prefix}t></${prefix}is></${prefix}c>`;
      }

      if (/\bt="s"/.test(attributes)) {
        const sharedStringPattern = new RegExp(
          `<${prefix}v(?:\\s[^>]*)?>\\s*\\d+\\s*<\\/${prefix}v>`,
        );
        if (!sharedStringPattern.test(body)) {
          return `<${prefix}c${attributes.replace('t="s"', 't="z"')}></${prefix}c>`;
        }
      }

      return cellXml;
    },
  );
}

function prepareCompatibleArchive(input: Buffer): Buffer {
  let entryCount = 0;
  let uncompressedXmlBytes = 0;
  let archive: Unzipped;

  try {
    archive = unzipSync(input, {
      filter(entry) {
        entryCount += 1;
        if (entryCount > MAX_ARCHIVE_ENTRIES) {
          throw new ImportWorkbookError('archive_too_large');
        }
        if (
          entry.name.startsWith('/') ||
          entry.name.includes('\\') ||
          entry.name.split('/').includes('..')
        ) {
          throw new ImportWorkbookError('invalid_xlsx');
        }

        const isXml =
          entry.name.endsWith('.xml') || entry.name.endsWith('.xml.rels');
        if (!isXml) return false;

        uncompressedXmlBytes += entry.originalSize;
        if (uncompressedXmlBytes > MAX_XML_ARCHIVE_BYTES) {
          throw new ImportWorkbookError('archive_too_large');
        }
        return true;
      },
    });
  } catch (error) {
    if (error instanceof ImportWorkbookError) throw error;
    throw new ImportWorkbookError('invalid_xlsx');
  }

  const requiredEntries = [
    'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels',
  ];
  if (requiredEntries.some((entry) => !archive[entry])) {
    throw new ImportWorkbookError('invalid_xlsx');
  }

  for (const [entryName, entry] of Object.entries(archive)) {
    if (
      !entryName.startsWith('xl/worksheets/') ||
      !entryName.endsWith('.xml')
    ) {
      continue;
    }
    archive[entryName] = strToU8(
      normalizeProviderWorksheetXml(strFromU8(entry)),
    );
  }

  return Buffer.from(zipSync(archive, { level: 1 }));
}

function assertWorkbookSize(sheets: { data: SpreadsheetRow[] }[]): void {
  if (sheets.length === 0 || sheets.length > MAX_WORKBOOK_SHEETS) {
    throw new ImportWorkbookError('workbook_too_large');
  }

  let rows = 0;
  for (const sheet of sheets) {
    rows += sheet.data.length;
    if (
      rows > MAX_WORKBOOK_ROWS ||
      sheet.data.some((row) => row.length > MAX_WORKBOOK_COLUMNS)
    ) {
      throw new ImportWorkbookError('workbook_too_large');
    }
  }
}

function detectAndParse(sheets: { data: SpreadsheetRow[] }[]): ProviderParseResult {
  const matches: {
    provider: ImportProvider;
    rows: SpreadsheetRow[];
  }[] = [];

  for (const sheet of sheets) {
    if (isFibiWorkbook(sheet.data)) {
      matches.push({ provider: 'fibi', rows: sheet.data });
    }
    if (isCalWorkbook(sheet.data)) {
      matches.push({ provider: 'cal', rows: sheet.data });
    }
    if (isIsracardWorkbook(sheet.data)) {
      matches.push({ provider: 'isracard', rows: sheet.data });
    }
  }

  if (matches.length === 0) {
    throw new ImportWorkbookError('unsupported_source');
  }
  if (matches.length > 1) {
    throw new ImportWorkbookError('ambiguous_source');
  }

  const match = matches[0];
  if (match.provider === 'fibi') return parseFibiRows(match.rows);
  if (match.provider === 'cal') return parseCalRows(match.rows);
  return parseIsracardRows(match.rows);
}

function normalizeFingerprintText(value: string | undefined): string {
  return (value ?? '').replaceAll(/\s+/g, ' ').trim().toLocaleLowerCase('he');
}

function fingerprintCandidate(candidate: UnfingerprintedImportCandidate): string {
  return createHash('sha256')
    .update(
      [
        candidate.account.provider,
        candidate.account.accountType,
        candidate.account.last4 ?? '',
        candidate.dateISO,
        candidate.chargeDateISO ?? '',
        candidate.amount,
        candidate.currency,
        normalizeFingerprintText(candidate.merchant),
        normalizeFingerprintText(candidate.reference),
      ].join('\u001f'),
    )
    .digest('hex');
}

function addReviewReason(
  reasons: ImportReviewReason[],
  reason: ImportReviewReason,
): ImportReviewReason[] {
  return reasons.includes(reason) ? reasons : [...reasons, reason];
}

export function addFingerprints(
  candidates: UnfingerprintedImportCandidate[],
): ImportCandidate[] {
  const fingerprints = candidates.map(fingerprintCandidate);
  const counts = new Map<string, number>();
  for (const fingerprint of fingerprints) {
    counts.set(fingerprint, (counts.get(fingerprint) ?? 0) + 1);
  }

  return candidates.map((candidate, index) => {
    const fingerprint = fingerprints[index];
    const duplicate = (counts.get(fingerprint) ?? 0) > 1;
    const reviewReasons = duplicate
      ? addReviewReason(candidate.reviewReasons, 'possible_duplicate')
      : candidate.reviewReasons;

    return {
      ...candidate,
      id: fingerprint.slice(0, 20),
      fingerprint,
      reviewReasons,
      eligible: candidate.eligible && !duplicate,
    };
  });
}

const providerLabels: Record<ImportProvider, string> = {
  fibi: 'הבנק הבינלאומי',
  cal: 'כאל',
  isracard: 'ישראכרט',
};

const ownerLabels: Record<ImportOwnerHint, string> = {
  oran: 'אורן',
  danielle: 'דניאל',
  shared: 'משותף · אורן ודניאל',
  unknown: 'בעלות לא זוהתה',
};

function accountLabel(candidate: ImportCandidate): string {
  const base = providerLabels[candidate.account.provider];
  return candidate.account.last4
    ? `${base} ••${candidate.account.last4}`
    : base;
}

function safeFileName(fileName: string): string {
  return fileName.split(/[\\/]/).at(-1)?.trim().slice(0, 160) || 'import.xlsx';
}

function buildNotices(
  result: ProviderParseResult,
  candidates: ImportCandidate[],
): string[] {
  const notices = [
    'זהו שלב תצוגה בלבד — הקובץ והתנועות עדיין לא נשמרו.',
    'לפני שמירה נחבר כל כרטיס או חשבון לחשבון המתאים במערכת.',
  ];
  if (result.ownerHint === 'danielle') {
    notices.push(
      'עסקאות של דניאל ממתינות לאישור משק בית או עסק — לא ניחשנו לפי שם הקובץ.',
    );
  }
  if (
    result.provider === 'fibi' &&
    candidates.some(
      (candidate) =>
        candidate.suggestedKind === 'income' &&
        candidate.reviewReasons.includes('confirm_context'),
    )
  ) {
    notices.push(
      'זיכויים בחשבון המשותף ממתינים לאישור — תשלום בביט או בהעברה עשוי להיות הכנסה עסקית.',
    );
  }
  if (candidates.some((candidate) => candidate.status === 'pending')) {
    notices.push(
      'אפשר לסווג ולשמור גם עסקאות ממתינות של ישראכרט; הן ייכללו בהוצאות עם סימון "ממתינה".',
    );
  }
  if (
    candidates.some((candidate) =>
      candidate.reviewReasons.includes('credit_card_settlement'),
    )
  ) {
    notices.push(
      'חיובים חודשיים של חברות האשראי לא ייספרו כהוצאה נוספת; העסקאות המפורטות בכרטיס הן ההוצאות.',
    );
  }
  if (
    candidates.some((candidate) =>
      candidate.reviewReasons.includes('savings_contribution'),
    )
  ) {
    notices.push(
      'הפקדות לפנסיה ולחיסכון מסומנות כתנועות שאינן הוצאה שוטפת.',
    );
  }
  if (
    candidates.some((candidate) =>
      candidate.reviewReasons.includes('possible_transfer'),
    )
  ) {
    notices.push(
      'משיכות מזומן והעברות אפשריות מסומנות לבדיקה כדי שלא ייספרו בטעות כהוצאה כפולה.',
    );
  }
  return notices;
}

export async function parseTransactionWorkbook(
  input: Buffer,
  fileName: string,
): Promise<ImportPreview> {
  if (
    input.length === 0 ||
    input.length > MAX_IMPORT_FILE_BYTES ||
    input[0] !== 0x50 ||
    input[1] !== 0x4b
  ) {
    throw new ImportWorkbookError('invalid_xlsx');
  }

  let sheets;
  try {
    sheets = await readExcelFile(prepareCompatibleArchive(input));
  } catch (error) {
    if (error instanceof ImportWorkbookError) throw error;
    throw new ImportWorkbookError('invalid_xlsx');
  }

  const normalizedSheets = sheets.map((sheet) => ({
    data: sheet.data as SpreadsheetRow[],
  }));
  assertWorkbookSize(normalizedSheets);

  const parsed = detectAndParse(normalizedSheets);
  const candidates = addFingerprints(parsed.candidates);
  if (candidates.length === 0) {
    throw new ImportWorkbookError('no_transactions');
  }

  const duplicates = candidates.filter((candidate) =>
    candidate.reviewReasons.includes('possible_duplicate'),
  ).length;
  const pending = candidates.filter(
    (candidate) => candidate.status === 'pending',
  ).length;

  return {
    fileName: safeFileName(fileName),
    provider: parsed.provider,
    providerLabel: providerLabels[parsed.provider],
    ownerHint: parsed.ownerHint,
    ownerLabel: ownerLabels[parsed.ownerHint],
    accountLabels: [...new Set(candidates.map(accountLabel))],
    candidates,
    stats: {
      detected: candidates.length,
      eligible: candidates.filter((candidate) => candidate.eligible).length,
      needsReview: candidates.filter(
        (candidate) => candidate.reviewReasons.length > 0,
      ).length,
      pending,
      duplicates,
      skipped: parsed.rejected.length,
    },
    notices: buildNotices(parsed, candidates),
  };
}
