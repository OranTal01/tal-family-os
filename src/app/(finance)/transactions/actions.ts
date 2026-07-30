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

const transactionClassificationSchema = z.object({
  transactionId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  context: z.enum(['household', 'business']),
  ownerId: z.enum(['shared', 'oran', 'danielle']),
  rememberRule: z.boolean(),
  isRecurring: z.boolean().default(false),
});

const reviewedTransactionIdsSchema = z
  .array(z.string().uuid())
  .min(1)
  .max(500);

export type TransactionClassificationInput = z.infer<
  typeof transactionClassificationSchema
>;

export type TransactionClassificationActionResult =
  | {
      status: 'success';
      message: string;
      transaction: {
        id: string;
        categoryId?: string;
        categoryName?: string;
        categoryIcon?: string;
        context: 'household' | 'business';
        ownerId: TransactionClassificationInput['ownerId'];
        needsReview: boolean;
        isRecurring: boolean;
      };
      ruleSaved: boolean;
    }
  | {
      status: 'error';
      message: string;
    };

export type DismissTransactionReviewsActionResult =
  | { status: 'success'; count: number }
  | { status: 'error'; message: string };

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

function importedBalanceSnapshots(preview: ImportPreview): Json[] {
  const latestByAccount = new Map<
    string,
    ImportPreview['candidates'][number]
  >();

  for (const candidate of preview.candidates) {
    if (
      candidate.account.accountType !== 'bank' ||
      !candidate.account.last4 ||
      candidate.balanceAfter === undefined
    ) {
      continue;
    }

    const key = `${candidate.account.accountType}:${candidate.account.last4}`;
    const current = latestByAccount.get(key);
    if (
      !current ||
      candidate.dateISO > current.dateISO ||
      (candidate.dateISO === current.dateISO &&
        candidate.sourceRow > current.sourceRow)
    ) {
      latestByAccount.set(key, candidate);
    }
  }

  return [...latestByAccount.values()].map((candidate) => ({
    account_type: candidate.account.accountType,
    masked_last4: candidate.account.last4!,
    balance: candidate.balanceAfter!,
    snapshot_date: candidate.dateISO,
  }));
}

function observedMovementType(
  candidate: ImportPreview['candidates'][number],
): string {
  if (candidate.reviewReasons.includes('credit_card_settlement')) {
    return 'credit_card_settlement';
  }
  if (candidate.reviewReasons.includes('savings_contribution')) {
    return 'savings_contribution';
  }
  if (/משיכת מזומן|כספומט|משיכת מזומנים/i.test(candidate.merchant)) {
    return 'cash_movement';
  }
  return 'unclassified_transfer';
}

function sourceRowFromErrorMessage(message: string): number | undefined {
  const match = /source row (\d+)/i.exec(message);
  if (!match) return undefined;

  const sourceRow = Number(match[1]);
  return Number.isSafeInteger(sourceRow) && sourceRow > 0
    ? sourceRow
    : undefined;
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
      .select('id, name, icon, context')
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
    const observedMovements: Json[] = [];
    let skippedCount = preview.stats.skipped;

    for (const candidate of preview.candidates) {
      const decision = decisionsByKey.get(
        decisionKey({
          sourceRow: candidate.sourceRow,
          fingerprint: candidate.fingerprint,
        }),
      );
      if (!decision) {
        return {
          status: 'error',
          message: `חסר סיווג עבור ${candidate.merchant} (שורה ${candidate.sourceRow} בקובץ).`,
          sourceRow: candidate.sourceRow,
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
          message: `הקטגוריה עבור ${candidate.merchant} (שורה ${candidate.sourceRow} בקובץ) אינה מתאימה לסוג התנועה.`,
          sourceRow: candidate.sourceRow,
        };
      }

      if (decision.kind === 'transfer') {
        observedMovements.push({
          source_row: candidate.sourceRow,
          fingerprint: candidate.fingerprint,
          account_type: candidate.account.accountType,
          masked_last4: candidate.account.last4 ?? null,
          date: candidate.dateISO,
          amount: candidate.amount,
          merchant: candidate.merchant,
          movement_type: observedMovementType(candidate),
        });
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
          message: `הסיווג עבור ${candidate.merchant} (שורה ${candidate.sourceRow} בקובץ) אינו מתאים לסכום התנועה.`,
          sourceRow: candidate.sourceRow,
        };
      }
      if (!candidate.account.last4) {
        return {
          status: 'error',
          message: `לא הצלחנו לזהות את ארבע הספרות האחרונות של הכרטיס עבור ${candidate.merchant} (שורה ${candidate.sourceRow} בקובץ).`,
          sourceRow: candidate.sourceRow,
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
          'אין תנועות מוכנות לשמירה. העברות פנימיות אינן נשמרות בשלב הזה.',
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

    const balanceSnapshots = importedBalanceSnapshots(preview);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      'commit_categorized_transaction_import_with_balances',
      {
        p_household_id: membership.householdId,
        p_provider: preview.provider,
        p_display_file_name: file.name
          .replaceAll(/[\\/]/g, '-')
          .slice(0, 160),
        p_file_sha256: createHash('sha256').update(buffer).digest('hex'),
        p_parser_version: 'xlsx-v1',
        p_rows: rows,
        p_balance_snapshots: balanceSnapshots,
        p_skipped_count: skippedCount,
        p_observed_movements: observedMovements,
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
      const sourceRow = sourceRowFromErrorMessage(error.message);
      return {
        status: 'error',
        message:
          'לא הצלחנו לשמור את התנועות. דבר לא נשמר ואפשר לנסות שוב בבטחה.',
        ...(sourceRow ? { sourceRow } : {}),
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

    if (
      receipt.reused_batch &&
      receipt.balance_snapshot_count === 0 &&
      receipt.observed_movement_count === 0
    ) {
      return {
        status: 'error',
        message:
          'הקובץ הזה כבר נשמר בעבר. אפשר לראות את התנועות שלו במסך התנועות.',
      };
    }

    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/dashboard');
    revalidatePath('/assets');
    return {
      status: 'success',
      message: receipt.reused_batch
        ? 'יתרת העו״ש ותנועות שאינן הוצאה עודכנו בקובץ שכבר יובא.'
        : `${receipt.inserted_count} תנועות נשמרו בהצלחה.`,
      batchId: receipt.batch_id,
      insertedCount: receipt.inserted_count,
      duplicateCount: receipt.duplicate_count,
      reviewCount: receipt.review_count,
      skippedCount,
      balanceUpdated: receipt.balance_snapshot_count > 0,
      observedMovementCount: receipt.observed_movement_count,
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

function transactionClassificationError(message: string): string {
  if (message.includes('not authorized')) {
    return 'אין לחשבון הזה הרשאה לעדכן תנועות במשק הבית.';
  }
  if (message.includes('transaction not found')) {
    return 'התנועה לא נמצאה. ייתכן שהיא עודכנה או הוסרה בחלון אחר.';
  }
  if (message.includes('require a category')) {
    return 'יש לבחור קטגוריה לפני השמירה.';
  }
  if (
    message.includes('category not found') ||
    message.includes('category context mismatch')
  ) {
    return 'הקטגוריה שנבחרה אינה מתאימה למשק הבית או לעסק.';
  }
  if (message.includes('owner not found')) {
    return 'השיוך שנבחר אינו זמין יותר. אפשר לבחור שיוך אחר ולנסות שוב.';
  }
  if (message.includes('transfer transactions')) {
    return 'שינוי העברה בין חשבונות דורש בחירת חשבון מקור וחשבון יעד.';
  }
  if (message.includes('income transactions')) {
    return 'לא ניתן לשייך קטגוריית הוצאה לתנועת הכנסה.';
  }
  if (message.includes('only expense transactions')) {
    return 'אפשר להגדיר כהוצאה קבועה רק תנועת הוצאה.';
  }

  return 'לא הצלחנו לעדכן את התנועה. דבר לא השתנה ואפשר לנסות שוב.';
}

export async function updateTransactionClassificationAction(
  input: TransactionClassificationInput,
): Promise<TransactionClassificationActionResult> {
  const parsed = transactionClassificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'אחד מפרטי הסיווג אינו תקין. יש לבדוק ולנסות שוב.',
    };
  }

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
      message: 'אין לחשבון הזה הרשאה לעדכן תנועות במשק הבית.',
    };
  }

  try {
    let ownerPersonId: string | null = null;
    if (parsed.data.ownerId !== 'shared') {
      const owners = await resolveImportOwners({
        householdId: membership.householdId,
        requiredHints: new Set([parsed.data.ownerId]),
      });
      ownerPersonId = owners[parsed.data.ownerId] ?? null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      'update_transaction_classification_with_recurring',
      {
        p_household_id: membership.householdId,
        p_transaction_id: parsed.data.transactionId,
        p_category_id: parsed.data.categoryId ?? null,
        p_context: parsed.data.context,
        p_owner_person_id: ownerPersonId,
        p_remember_rule: parsed.data.rememberRule,
        p_is_recurring: parsed.data.isRecurring,
      },
    );

    if (error) {
      console.error('Transaction classification update failed', {
        code: error.code,
      });
      return {
        status: 'error',
        message: transactionClassificationError(error.message),
      };
    }

    const updated = data?.[0];
    if (!updated) {
      return {
        status: 'error',
        message:
          'לא התקבל אישור שמירה ממסד הנתונים. דבר לא השתנה ואפשר לנסות שוב.',
      };
    }

    for (const path of [
      '/transactions',
      '/dashboard',
      '/budget',
      '/business',
      '/daily',
      '/planning',
    ]) {
      revalidatePath(path);
    }

    return {
      status: 'success',
      message: 'התנועה נשמרה בהצלחה.',
      transaction: {
        id: updated.transaction_id,
        categoryId: updated.category_id ?? undefined,
        categoryName: updated.category_name ?? undefined,
        categoryIcon: updated.category_icon ?? undefined,
        context: updated.context,
        ownerId: parsed.data.ownerId,
        needsReview: updated.needs_review,
        isRecurring: updated.is_recurring,
      },
      ruleSaved: updated.rule_saved,
    };
  } catch (error) {
    console.error('Transaction classification preparation failed', {
      code: error instanceof Error ? error.name : 'unexpected',
    });
    return {
      status: 'error',
      message:
        'לא הצלחנו להכין את התנועה לשמירה. דבר לא השתנה ואפשר לנסות שוב.',
    };
  }
}

export async function dismissTransactionReviewsAction(
  transactionIds: string[],
): Promise<DismissTransactionReviewsActionResult> {
  const parsed = reviewedTransactionIdsSchema.safeParse(transactionIds);
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'רשימת התנועות לבדיקה אינה תקינה.',
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      status: 'error',
      message: 'החיבור לחשבון פג. יש להתנתק ולהיכנס מחדש.',
    };
  }

  const membership = await getCurrentHouseholdMembership();
  if (!membership || !['owner', 'member'].includes(membership.role)) {
    return {
      status: 'error',
      message: 'אין לחשבון הזה הרשאה לעדכן את רשימת הבדיקה.',
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('review_items')
    .update({
      status: 'dismissed',
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      resolution: { decision: 'accepted_as_is' },
    })
    .eq('household_id', membership.householdId)
    .eq('status', 'open')
    .in('transaction_id', parsed.data)
    .select('id');

  if (error) {
    console.error('Transaction review dismissal failed', {
      code: error.code,
    });
    return {
      status: 'error',
      message:
        'לא הצלחנו לעדכן את רשימת הבדיקה. דבר לא השתנה ואפשר לנסות שוב.',
    };
  }

  for (const path of [
    '/transactions/review',
    '/transactions',
    '/dashboard',
    '/daily',
  ]) {
    revalidatePath(path);
  }

  return { status: 'success', count: data?.length ?? 0 };
}
