'use server';

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  ImportWorkbookError,
  MAX_IMPORT_FILE_BYTES,
  parseTransactionWorkbook,
} from '@/lib/imports/workbook';
import { suggestCandidateCategorization } from '@/lib/imports/categorization';
import type {
  ImportActionState,
  ImportCommitActionState,
  ImportDecision,
  ImportOwnerHint,
  ImportPreview,
} from '@/lib/imports/types';
import {
  getCurrentHouseholdMembership,
  getCurrentUser,
} from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database.generated';

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

const importDecisionSchema = z.object({
  sourceRow: z.number().int().positive().max(1_000_000),
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  context: z.enum(['household', 'business']),
  kind: z.enum(['expense', 'income', 'refund', 'transfer']),
  incomeClass: z.enum(['salary', 'business', 'other']).optional(),
  categoryId: z.string().uuid().optional(),
  rememberRule: z.boolean().default(false),
  allowDuplicate: z.boolean(),
});

const importDecisionsSchema = z.array(importDecisionSchema).min(1).max(5_000);

type ValidatedWorkbook = {
  file: File;
  buffer: Buffer;
  preview: ImportPreview;
};

function fileValidationError(value: FormDataEntryValue | null): string | null {
  if (!(value instanceof File) || value.size === 0) {
    return 'יש לבחור קובץ Excel מסוג XLSX.';
  }
  if (
    !value.name.toLocaleLowerCase('en').endsWith('.xlsx') ||
    !XLSX_MIME_TYPES.has(value.type)
  ) {
    return 'אפשר להעלות רק קובץ Excel מסוג XLSX.';
  }
  if (value.size > MAX_IMPORT_FILE_BYTES) {
    return 'הקובץ גדול מדי. הגודל המרבי לייבוא הוא 1.5MB.';
  }
  return null;
}

function isUserFacingFileError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (error.message.startsWith('אפשר') ||
      error.message.startsWith('יש לבחור') ||
      error.message.startsWith('הקובץ'))
  );
}

async function readValidatedWorkbook(
  value: FormDataEntryValue | null,
): Promise<ValidatedWorkbook> {
  const validationError = fileValidationError(value);
  if (validationError || !(value instanceof File)) {
    throw new Error(validationError ?? 'יש לבחור קובץ Excel מסוג XLSX.');
  }

  const buffer = Buffer.from(await value.arrayBuffer());
  return {
    file: value,
    buffer,
    preview: await parseTransactionWorkbook(buffer, value.name),
  };
}

function decisionKey(decision: Pick<ImportDecision, 'sourceRow' | 'fingerprint'>) {
  return `${decision.sourceRow}:${decision.fingerprint}`;
}

function normalizedPersonName(name: string): string {
  return name.replaceAll(/\s+/g, '').toLocaleLowerCase('he');
}

async function resolveImportOwners({
  householdId,
  requiredHints,
}: {
  householdId: string;
  requiredHints: Set<ImportOwnerHint>;
}): Promise<Partial<Record<ImportOwnerHint, string>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('people')
    .select('id, name')
    .eq('household_id', householdId)
    .is('archived_at', null);

  if (error) throw new Error('Unable to resolve import owners', { cause: error });

  const people = [...data];
  const ownerNames: Partial<Record<ImportOwnerHint, string[]>> = {
    oran: ['אורן', 'oran'],
    danielle: ['דניאל', 'danielle'],
  };
  const result: Partial<Record<ImportOwnerHint, string>> = {};

  for (const hint of ['oran', 'danielle'] as const) {
    if (!requiredHints.has(hint)) continue;

    const acceptedNames = new Set(
      (ownerNames[hint] ?? []).map(normalizedPersonName),
    );
    let person = people.find((candidate) =>
      acceptedNames.has(normalizedPersonName(candidate.name)),
    );

    if (!person) {
      const { data: created, error: createError } = await supabase
        .from('people')
        .insert({
          household_id: householdId,
          name: hint === 'oran' ? 'אורן' : 'דניאל',
          kind: 'adult',
        })
        .select('id, name')
        .single();

      if (createError) {
        throw new Error('Unable to create a missing import owner', {
          cause: createError,
        });
      }
      person = created;
      people.push(created);
    }

    result[hint] = person.id;
  }

  return result;
}

async function addImportCategorySuggestions(
  preview: ImportPreview,
  householdId: string,
): Promise<ImportPreview> {
  const supabase = await createClient();
  const [categoriesResult, rulesResult] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, context')
      .eq('household_id', householdId)
      .is('archived_at', null),
    supabase
      .from('merchant_rules')
      .select('merchant_pattern, category_id, context')
      .eq('household_id', householdId)
      .is('archived_at', null),
  ]);
  const error = categoriesResult.error ?? rulesResult.error;
  if (error) {
    throw new Error('Unable to load import categorization data', {
      cause: error,
    });
  }

  const categories = categoriesResult.data ?? [];
  const merchantRules = rulesResult.data ?? [];
  return {
    ...preview,
    candidates: preview.candidates.map((candidate) => ({
      ...candidate,
      ...suggestCandidateCategorization(
        candidate,
        categories,
        merchantRules,
      ),
    })),
  };
}

function importOwnerHint(
  accountOwner: ImportOwnerHint,
  decision: ImportDecision,
): ImportOwnerHint {
  if (accountOwner !== 'shared') return accountOwner;
  return decision.context === 'business' ? 'danielle' : 'shared';
}

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
  const validationError = fileValidationError(value);
  if (validationError) {
    return {
      status: 'error',
      message: validationError,
    };
  }

  try {
    const workbook = await readValidatedWorkbook(value);
    const preview = await addImportCategorySuggestions(
      workbook.preview,
      membership.householdId,
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
          : isUserFacingFileError(error)
            ? error.message
            : 'לא הצלחנו לקרוא את הקובץ. אפשר לייצא אותו מחדש ולנסות שוב.',
    };
  }
}

export async function commitTransactionImportAction(
  formData: FormData,
): Promise<ImportCommitActionState> {
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

  if (!membership || !['owner', 'member'].includes(membership.role)) {
    return {
      status: 'error',
      message: 'אין לחשבון הזה הרשאה לשמור תנועות במשק הבית.',
    };
  }

  const rawDecisions = formData.get('decisions');
  if (
    typeof rawDecisions !== 'string' ||
    rawDecisions.length === 0 ||
    rawDecisions.length > 1_000_000
  ) {
    return {
      status: 'error',
      message: 'הסיווגים חסרים או גדולים מדי. יש להכין את הקובץ מחדש.',
    };
  }

  let decisions: ImportDecision[];
  try {
    decisions = importDecisionsSchema.parse(JSON.parse(rawDecisions));
  } catch {
    return {
      status: 'error',
      message: 'אחד הסיווגים אינו תקין. יש לבדוק את הרשימה ולנסות שוב.',
    };
  }

  const decisionsByKey = new Map(
    decisions.map((decision) => [decisionKey(decision), decision]),
  );
  if (decisionsByKey.size !== decisions.length) {
    return {
      status: 'error',
      message: 'נמצאו סיווגים כפולים. יש להכין את הקובץ מחדש.',
    };
  }

  try {
    const { file, buffer, preview } = await readValidatedWorkbook(
      formData.get('file'),
    );
    const requiredHints = new Set<ImportOwnerHint>();
    const prepared: {
      candidate: ImportPreview['candidates'][number];
      decision: ImportDecision;
      ownerHint: ImportOwnerHint;
    }[] = [];
    let skippedCount = preview.stats.skipped;

    for (const candidate of preview.candidates) {
      if (candidate.status === 'pending') {
        skippedCount += 1;
        continue;
      }

      const decision = decisionsByKey.get(
        decisionKey({
          sourceRow: candidate.sourceRow,
          fingerprint: candidate.fingerprint,
        }),
      );
      if (!decision) {
        return {
          status: 'error',
          message: 'חסר סיווג לאחת התנועות. יש לבדוק את הרשימה ולנסות שוב.',
        };
      }

      const needsExpenseCategory =
        decision.kind === 'expense' || decision.kind === 'refund';
      if (
        (needsExpenseCategory && !decision.categoryId) ||
        (!needsExpenseCategory && decision.categoryId) ||
        (decision.rememberRule && !needsExpenseCategory)
      ) {
        return {
          status: 'error',
          message: `הקטגוריה בשורה ${candidate.sourceRow} אינה מתאימה לסוג התנועה.`,
        };
      }

      if (decision.kind === 'transfer') {
        skippedCount += 1;
        continue;
      }
      if (
        (candidate.amount < 0 && decision.kind !== 'expense') ||
        (candidate.amount > 0 &&
          decision.kind !== 'income' &&
          decision.kind !== 'refund') ||
        (decision.kind === 'income' && !decision.incomeClass) ||
        (decision.kind !== 'income' && decision.incomeClass)
      ) {
        return {
          status: 'error',
          message: `הסיווג בשורה ${candidate.sourceRow} אינו מתאים לסכום התנועה.`,
        };
      }
      if (!candidate.account.last4) {
        return {
          status: 'error',
          message: `לא הצלחנו לזהות את ארבע הספרות האחרונות בשורה ${candidate.sourceRow}.`,
        };
      }

      const ownerHint = importOwnerHint(
        candidate.account.ownerHint,
        decision,
      );
      if (ownerHint === 'oran' || ownerHint === 'danielle') {
        requiredHints.add(ownerHint);
      }
      prepared.push({ candidate, decision, ownerHint });
    }

    if (prepared.length === 0) {
      return {
        status: 'error',
        message:
          'אין תנועות מוכנות לשמירה. תנועות ממתינות והעברות פנימיות אינן נשמרות בשלב הזה.',
      };
    }

    const owners = await resolveImportOwners({
      householdId: membership.householdId,
      requiredHints,
    });
    const rows: Json[] = prepared.map(
      ({ candidate, decision, ownerHint }) => ({
        source_row: candidate.sourceRow,
        fingerprint: candidate.fingerprint,
        account_type: candidate.account.accountType,
        masked_last4: candidate.account.last4!,
        date: candidate.dateISO,
        amount: candidate.amount,
        currency: candidate.currency,
        merchant: candidate.merchant,
        description: candidate.description ?? null,
        reference: candidate.reference ?? null,
        category_id: decision.categoryId ?? null,
        context: decision.context,
        owner_person_id:
          ownerHint === 'oran' || ownerHint === 'danielle'
            ? owners[ownerHint] ?? null
            : null,
        kind: decision.kind,
        income_class: decision.incomeClass ?? null,
        status: candidate.status,
        remember_rule: decision.rememberRule,
        allow_duplicate:
          decision.allowDuplicate &&
          candidate.reviewReasons.includes('possible_duplicate'),
      }),
    );

    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      'commit_categorized_transaction_import',
      {
        p_household_id: membership.householdId,
        p_provider: preview.provider,
        p_display_file_name: file.name
          .replaceAll(/[\\/]/g, '-')
          .slice(0, 160),
        p_file_sha256: createHash('sha256').update(buffer).digest('hex'),
        p_parser_version: 'xlsx-v1',
        p_rows: rows,
        p_skipped_count: skippedCount,
      },
    );

    if (error) {
      if (error.message.includes('source file already has an active import')) {
        return {
          status: 'error',
          message:
            'הקובץ הזה כבר נשמר בעבר. אפשר לראות את התנועות שלו במסך התנועות.',
        };
      }
      console.error('Transaction import commit failed', { code: error.code });
      return {
        status: 'error',
        message:
          'לא הצלחנו לשמור את התנועות. דבר לא נשמר ואפשר לנסות שוב בבטחה.',
      };
    }

    const receipt = data?.[0];
    if (!receipt) {
      return {
        status: 'error',
        message:
          'לא התקבל אישור שמירה ממסד הנתונים. דבר לא נשמר ואפשר לנסות שוב.',
      };
    }

    revalidatePath('/transactions');
    return {
      status: 'success',
      message: `${receipt.inserted_count} תנועות נשמרו בהצלחה.`,
      batchId: receipt.batch_id,
      insertedCount: receipt.inserted_count,
      duplicateCount: receipt.duplicate_count,
      reviewCount: receipt.review_count,
      skippedCount,
    };
  } catch (error) {
    const code =
      error instanceof ImportWorkbookError ? error.code : 'unexpected';
    console.error('Transaction import commit preparation failed', { code });
    return {
      status: 'error',
      message:
        error instanceof ImportWorkbookError
          ? errorMessages[error.code]
          : isUserFacingFileError(error)
            ? error.message
            : 'לא הצלחנו להכין את התנועות לשמירה. דבר לא נשמר ואפשר לנסות שוב.',
    };
  }
}
