'use server';

import { Buffer } from 'node:buffer';
import {
  ImportWorkbookError,
  MAX_IMPORT_FILE_BYTES,
  parseTransactionWorkbook,
} from '@/lib/imports/workbook';
import type { ImportActionState } from '@/lib/imports/types';
import {
  getCurrentHouseholdMembership,
  getCurrentUser,
} from '@/lib/supabase/dal';

const XLSX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
  'application/zip',
  '',
]);

const errorMessages: Record<ImportWorkbookError['code'], string> = {
  invalid_xlsx: 'הקובץ אינו קובץ Excel תקין מסוג XLSX.',
  archive_too_large: 'מבנה הקובץ גדול מדי לייבוא בטוח.',
  unsupported_source:
    'לא זיהינו יצוא של הבנק הבינלאומי, כאל או ישראכרט בקובץ הזה.',
  ambiguous_source: 'הקובץ מכיל יותר ממבנה מקור אחד ולא ניתן לזהות אותו בבטחה.',
  workbook_too_large: 'הקובץ מכיל יותר מדי גיליונות, שורות או עמודות.',
  no_transactions: 'המבנה זוהה, אבל לא נמצאו בו תנועות עם תאריך וסכום.',
};

export async function previewTransactionImportAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      status: 'error',
      message: 'החיבור לחשבון פג. יש להתנתק ולהיכנס מחדש.',
    };
  }

  let membership;
  try {
    membership = await getCurrentHouseholdMembership();
  } catch {
    return {
      status: 'error',
      message: 'לא הצלחנו לאמת את משק הבית. אפשר לרענן ולנסות שוב.',
    };
  }

  if (!membership) {
    return {
      status: 'error',
      message: 'יש להשלים את הגדרת משק הבית לפני ייבוא תנועות.',
    };
  }

  const value = formData.get('file');
  if (!(value instanceof File) || value.size === 0) {
    return {
      status: 'error',
      message: 'יש לבחור קובץ Excel מסוג XLSX.',
    };
  }

  if (
    !value.name.toLocaleLowerCase('en').endsWith('.xlsx') ||
    !XLSX_MIME_TYPES.has(value.type)
  ) {
    return {
      status: 'error',
      message: 'אפשר להעלות רק קובץ Excel מסוג XLSX.',
    };
  }

  if (value.size > MAX_IMPORT_FILE_BYTES) {
    return {
      status: 'error',
      message: 'הקובץ גדול מדי. הגודל המרבי לייבוא הוא 1.5MB.',
    };
  }

  try {
    const preview = await parseTransactionWorkbook(
      Buffer.from(await value.arrayBuffer()),
      value.name,
    );
    return {
      status: 'preview',
      message: `זוהו ${preview.stats.detected} תנועות. דבר עדיין לא נשמר.`,
      preview,
    };
  } catch (error) {
    const code =
      error instanceof ImportWorkbookError ? error.code : 'unexpected';
    console.error('Transaction import preview failed', { code });
    return {
      status: 'error',
      message:
        error instanceof ImportWorkbookError
          ? errorMessages[error.code]
          : 'לא הצלחנו לקרוא את הקובץ. אפשר לייצא אותו מחדש ולנסות שוב.',
    };
  }
}
