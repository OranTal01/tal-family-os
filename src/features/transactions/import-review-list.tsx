'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type {
  Context,
  IncomeClass,
  TransactionKind,
} from '@/types/domain';
import type {
  ImportCandidate,
  ImportCategorySuggestionSource,
  ImportCurrency,
  ImportDecision,
  ImportReviewReason,
} from '@/lib/imports/types';
import { suggestSmartCategory } from '@/lib/imports/categorization';
import { cn } from '@/lib/utils';
import type { CategoryOption } from '@/server/data/views';

const PAGE_SIZE = 40;

const reviewLabels: Record<ImportReviewReason, string> = {
  possible_duplicate: 'כפילות אפשרית',
  possible_transfer: 'העברה אפשרית',
  pending: 'ממתינה לקליטה',
  confirm_context: 'אישור משק בית / עסק',
};

const kindOptions: { value: TransactionKind; label: string }[] = [
  { value: 'expense', label: 'הוצאה' },
  { value: 'income', label: 'הכנסה' },
  { value: 'refund', label: 'החזר' },
  { value: 'transfer', label: 'העברה פנימית' },
];

const incomeClassOptions: { value: IncomeClass; label: string }[] = [
  { value: 'salary', label: 'משכורת' },
  { value: 'business', label: 'הכנסה מהעסק' },
  { value: 'other', label: 'הכנסה אחרת' },
];

type ReviewChoice = {
  context?: Context;
  kind: TransactionKind;
  incomeClass?: IncomeClass;
  categoryId?: string;
  categorySuggestionSource?: ImportCategorySuggestionSource;
  rememberRule: boolean;
  allowDuplicate: boolean;
};

const currencyFormatters = new Map<ImportCurrency, Intl.NumberFormat>();

function formatCandidateAmount(
  amount: number,
  currency: ImportCurrency,
): string {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(amount / 100);
}

function candidateKey(candidate: ImportCandidate): string {
  return `${candidate.id}:${candidate.sourceRow}`;
}

function isChoiceComplete(choice: ReviewChoice): boolean {
  return Boolean(
    choice.context &&
      (choice.kind === 'income'
        ? choice.incomeClass
        : choice.kind === 'expense' || choice.kind === 'refund'
          ? choice.categoryId
          : true),
  );
}

function isIncluded(
  candidate: ImportCandidate,
  choice: ReviewChoice,
): boolean {
  return candidate.status === 'cleared' && choice.kind !== 'transfer';
}

function ImportReviewRow({
  candidate,
  categories,
  choice,
  onChange,
}: {
  candidate: ImportCandidate;
  categories: CategoryOption[];
  choice: ReviewChoice;
  onChange: (next: ReviewChoice) => void;
}) {
  const idPrefix = `import-${candidate.id}-${candidate.sourceRow}`;
  const complete = isChoiceComplete(choice);
  const pending = candidate.status === 'pending';
  const availableKindOptions = kindOptions.filter((option) =>
    candidate.amount < 0
      ? option.value === 'expense' || option.value === 'transfer'
      : option.value !== 'expense',
  );
  const availableCategories = categories.filter(
    (category) => category.context === choice.context,
  );
  const selectedKindLabel =
    kindOptions.find((option) => option.value === choice.kind)?.label ??
    'בחירת סוג תנועה';
  const selectedIncomeClassLabel =
    incomeClassOptions.find(
      (option) => option.value === choice.incomeClass,
    )?.label ?? 'בחירת סוג הכנסה';
  const selectedCategoryName = availableCategories.find(
    (category) => category.id === choice.categoryId,
  )?.name;
  const needsCategory =
    choice.kind === 'expense' || choice.kind === 'refund';

  function changeContext(context: Context) {
    const currentCategory = categories.find(
      (category) =>
        category.id === choice.categoryId &&
        category.context === context,
    );
    const smartCategory =
      currentCategory ??
      (needsCategory
        ? suggestSmartCategory(candidate.merchant, context, categories)
        : undefined);

    onChange({
      ...choice,
      context,
      categoryId: smartCategory?.id,
      categorySuggestionSource: currentCategory
        ? choice.categorySuggestionSource
        : smartCategory
          ? 'smart_rule'
          : undefined,
      rememberRule: currentCategory
        ? choice.rememberRule
        : Boolean(smartCategory),
    });
  }

  return (
    <li className='py-4'>
      <div className='min-w-0'>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='truncate text-body font-bold text-ink'>
            {candidate.merchant}
          </span>
          {candidate.reviewReasons.map((reason) => (
            <Badge key={reason} variant='secondary'>
              {reviewLabels[reason]}
            </Badge>
          ))}
        </div>
        <span
          dir='ltr'
          className='mt-1 inline-block text-body font-extrabold tabular-nums text-ink'
        >
          {formatCandidateAmount(candidate.amount, candidate.currency)}
        </span>
        <p className='mt-1 text-caption font-semibold text-mut'>
          <span dir='ltr'>{candidate.dateISO}</span>
          {' · '}
          {candidate.account.last4
            ? `••${candidate.account.last4}`
            : 'חשבון לזיהוי'}
          {candidate.transactionType
            ? ` · ${candidate.transactionType}`
            : ''}
        </p>
      </div>

      <div className='mt-3 grid gap-3 rounded-lg bg-surface-2 p-3 sm:grid-cols-2 lg:grid-cols-3'>
        <fieldset className='flex flex-col gap-1.5'>
          <legend className='flex h-5 items-center text-caption font-semibold text-ink-2'>
            משק בית או עסק
          </legend>
          <div
            role='radiogroup'
            aria-label={`הקשר עבור ${candidate.merchant}`}
            className='inline-flex w-full rounded-lg bg-surface p-1'
          >
            {(
              [
                { value: 'household', label: 'משק בית', icon: 'home' },
                { value: 'business', label: 'עסק', icon: 'storefront' },
              ] as const
            ).map((option) => {
              const active = choice.context === option.value;
              return (
                <button
                  key={option.value}
                  type='button'
                  role='radio'
                  aria-checked={active}
                  disabled={pending}
                  onClick={() => changeContext(option.value)}
                  className={cn(
                    'flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-caption font-bold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                    active
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-mut hover:text-ink-2',
                    pending && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <Icon name={option.icon} className='text-[16px]' />
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className='flex flex-col gap-1.5'>
          <Label className='h-5' htmlFor={`${idPrefix}-kind`}>
            סוג תנועה
          </Label>
          <Select
            value={choice.kind}
            disabled={pending}
            onValueChange={(value) =>
              onChange({
                ...choice,
                kind: value as TransactionKind,
                incomeClass:
                  value === 'income' ? choice.incomeClass : undefined,
                categoryId:
                  value === 'expense' || value === 'refund'
                    ? choice.categoryId
                    : undefined,
                categorySuggestionSource:
                  value === 'expense' || value === 'refund'
                    ? choice.categorySuggestionSource
                    : undefined,
                rememberRule:
                  value === 'expense' || value === 'refund'
                    ? choice.rememberRule
                    : false,
              })
            }
          >
            <SelectTrigger id={`${idPrefix}-kind`} className='w-full'>
              <SelectValue>{selectedKindLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableKindOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {choice.kind === 'income' ? (
          <div className='flex flex-col gap-1.5'>
            <Label
              className='h-5'
              htmlFor={`${idPrefix}-income-class`}
            >
              סיווג הכנסה
            </Label>
            <Select
              value={choice.incomeClass ?? ''}
              disabled={pending}
              onValueChange={(value) =>
                onChange({
                  ...choice,
                  incomeClass: value as IncomeClass,
                })
              }
            >
              <SelectTrigger
                id={`${idPrefix}-income-class`}
                className='w-full'
              >
                <SelectValue>{selectedIncomeClassLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {incomeClassOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : needsCategory ? (
          <div className='flex flex-col gap-1.5'>
            <div className='flex h-5 items-center justify-between gap-2'>
              <Label htmlFor={`${idPrefix}-category`}>קטגוריה</Label>
              {choice.categorySuggestionSource && (
                <Badge variant='secondary'>
                  {choice.categorySuggestionSource === 'learned_rule'
                    ? 'נלמד בעבר'
                    : 'הצעה חכמה'}
                </Badge>
              )}
            </div>
            <Select
              value={choice.categoryId ?? ''}
              disabled={pending || !choice.context}
              onValueChange={(categoryId) =>
                onChange({
                  ...choice,
                  categoryId: categoryId ?? undefined,
                  categorySuggestionSource: undefined,
                  rememberRule: Boolean(categoryId),
                })
              }
            >
              <SelectTrigger
                id={`${idPrefix}-category`}
                className='w-full'
              >
                <SelectValue>
                  {selectedCategoryName ??
                    (choice.context
                      ? 'בחירת קטגוריה'
                      : 'קודם בוחרים משק בית או עסק')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                align='start'
                alignItemWithTrigger={false}
                showScrollButtons={false}
                className='max-h-72 overscroll-contain scroll-smooth'
              >
                {availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div
            className={cn(
              'flex items-center gap-2 self-end rounded-md px-3 py-2 text-caption font-bold',
              complete
                ? 'bg-pos-soft text-pos-ink'
                : 'bg-warn-soft text-warn-ink',
            )}
          >
            <Icon
              name={complete ? 'check_circle' : 'pending_actions'}
              className='text-[18px]'
            />
            {complete ? 'הסיווג הושלם' : 'נדרשת בחירה'}
          </div>
        )}
      </div>

      {needsCategory &&
        choice.categoryId &&
        !pending &&
        choice.categorySuggestionSource !== 'learned_rule' && (
          <div className='mt-3 flex items-center justify-between gap-3 rounded-md bg-accent-soft px-3 py-2.5'>
            <span className='flex flex-col'>
              <span className='text-caption font-bold text-ink'>
                לזכור את בית העסק לפעם הבאה
              </span>
              <span className='text-caption font-semibold text-mut'>
                בפעם הבאה נציע אוטומטית את אותה קטגוריה באותו הקשר.
              </span>
            </span>
            <Switch
              aria-label={`זכור את ${candidate.merchant} לפעם הבאה`}
              checked={choice.rememberRule}
              onCheckedChange={(rememberRule) =>
                onChange({ ...choice, rememberRule })
              }
            />
          </div>
        )}

      {needsCategory &&
        choice.categorySuggestionSource === 'learned_rule' &&
        !pending && (
          <p className='mt-2 text-caption font-semibold text-pos-ink'>
            הקטגוריה נבחרה לפי תיקון ששמרתם בייבוא קודם.
          </p>
        )}

      {choice.kind === 'transfer' && (
        <p className='mt-2 text-caption font-semibold text-mut'>
          התנועה לא תישמר בייבוא הזה. בהמשך נחבר אותה לחשבון היעד וניצור
          שתי תנועות העברה תואמות.
        </p>
      )}

      {pending && (
        <p className='mt-2 text-caption font-semibold text-warn-ink'>
          התנועה עדיין ממתינה אצל חברת האשראי ולכן לא תישמר כעת.
        </p>
      )}

      {candidate.reviewReasons.includes('possible_duplicate') && !pending && (
        <label className='mt-3 flex items-center justify-between gap-3 rounded-md bg-warn-soft px-3 py-2.5'>
          <span className='flex flex-col'>
            <span className='text-caption font-bold text-warn-ink'>
              זו תנועה אמיתית נוספת
            </span>
            <span className='text-caption font-semibold text-mut'>
              יש להפעיל רק אם זו אינה כפילות של אותה עסקה.
            </span>
          </span>
          <Switch
            checked={choice.allowDuplicate}
            onCheckedChange={(allowDuplicate) =>
              onChange({ ...choice, allowDuplicate })
            }
          />
        </label>
      )}
    </li>
  );
}

export function ImportReviewList({
  candidates,
  categories,
  skipped,
  saving = false,
  onSave,
}: {
  candidates: ImportCandidate[];
  categories: CategoryOption[];
  skipped: number;
  saving?: boolean;
  onSave: (decisions: ImportDecision[]) => void;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [choices, setChoices] = useState<Record<string, ReviewChoice>>(() =>
    Object.fromEntries(
      candidates.map((candidate) => [
        candidateKey(candidate),
        {
          context: candidate.suggestedContext,
          kind: candidate.suggestedKind,
          categoryId: candidate.suggestedCategoryId,
          categorySuggestionSource:
            candidate.suggestedCategorySource,
          rememberRule:
            Boolean(candidate.suggestedCategoryId) &&
            candidate.suggestedCategorySource !== 'learned_rule',
          allowDuplicate: false,
        },
      ]),
    ),
  );

  const readyDecisions = useMemo(
    () =>
      candidates
        .filter((candidate) => {
          const choice = choices[candidateKey(candidate)];
          return isIncluded(candidate, choice) && isChoiceComplete(choice);
        })
        .map((candidate): ImportDecision => {
          const choice = choices[candidateKey(candidate)];
          return {
            sourceRow: candidate.sourceRow,
            fingerprint: candidate.fingerprint,
            context: choice.context!,
            kind: choice.kind,
            incomeClass: choice.incomeClass,
            categoryId: choice.categoryId,
            rememberRule: choice.rememberRule,
            allowDuplicate: choice.allowDuplicate,
          };
        }),
    [candidates, choices],
  );
  const unresolvedCount = useMemo(
    () =>
      candidates.filter((candidate) => {
        const choice = choices[candidateKey(candidate)];
        return isIncluded(candidate, choice) && !isChoiceComplete(choice);
      }).length,
    [candidates, choices],
  );
  const commitDecisions = useMemo(
    () =>
      candidates
        .filter((candidate) => candidate.status === 'cleared')
        .map((candidate): ImportDecision => {
          const choice = choices[candidateKey(candidate)];
          return {
            sourceRow: candidate.sourceRow,
            fingerprint: candidate.fingerprint,
            context: choice.context ?? 'household',
            kind: choice.kind,
            incomeClass: choice.incomeClass,
            categoryId: choice.categoryId,
            rememberRule: choice.rememberRule,
            allowDuplicate: choice.allowDuplicate,
          };
        }),
    [candidates, choices],
  );
  const excludedCount =
    candidates.filter((candidate) => {
      const choice = choices[candidateKey(candidate)];
      return !isIncluded(candidate, choice);
    }).length + skipped;
  const visibleCandidates = candidates.slice(0, limit);

  return (
    <div className='rounded-lg border border-line bg-surface px-3'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-line py-3'>
        <div>
          <h3 className='text-body font-extrabold text-ink'>
            סקירה וסיווג
          </h3>
          <p className='mt-0.5 text-caption font-semibold text-mut'>
            {readyDecisions.length} תנועות מוכנות לשמירה
          </p>
        </div>
        <span className='text-caption font-semibold text-mut'>
          {skipped > 0
            ? `${skipped} שורות ללא סכום תקין לא הוצגו`
            : 'כל השורות התקינות מוצגות'}
        </span>
      </div>

      <ul className='divide-y divide-line'>
        {visibleCandidates.map((candidate) => {
          const key = candidateKey(candidate);
          return (
            <ImportReviewRow
              key={key}
              candidate={candidate}
              categories={categories}
              choice={choices[key]}
              onChange={(next) =>
                setChoices((current) => ({ ...current, [key]: next }))
              }
            />
          );
        })}
      </ul>

      {candidates.length > visibleCandidates.length && (
        <div className='flex justify-center border-t border-line py-3'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setLimit((current) => current + PAGE_SIZE)}
          >
            הצגת תנועות נוספות
          </Button>
        </div>
      )}

      <div className='flex flex-col gap-2 border-t border-line py-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-caption font-semibold text-mut'>
          {unresolvedCount > 0
            ? `נדרש להשלים סיווג של ${unresolvedCount} תנועות.`
            : excludedCount > 0
              ? `${excludedCount} שורות ממתינות, העברות או שורות לא תקינות לא יישמרו.`
              : 'כל התנועות מוכנות לשמירה.'}
        </p>
        <Button
          type='button'
          disabled={
            saving || unresolvedCount > 0 || readyDecisions.length === 0
          }
          onClick={() => onSave(commitDecisions)}
        >
          <Icon name='save' className='text-[16px]' />
          {saving
            ? 'שומרים…'
            : `שמירת ${readyDecisions.length} תנועות`}
        </Button>
      </div>
    </div>
  );
}
