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
import type {
  Context,
  IncomeClass,
  TransactionKind,
} from '@/types/domain';
import type {
  ImportCandidate,
  ImportCurrency,
  ImportReviewReason,
} from '@/lib/imports/types';
import { cn } from '@/lib/utils';

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
      (choice.kind !== 'income' || choice.incomeClass),
  );
}

function ImportReviewRow({
  candidate,
  choice,
  onChange,
}: {
  candidate: ImportCandidate;
  choice: ReviewChoice;
  onChange: (next: ReviewChoice) => void;
}) {
  const idPrefix = `import-${candidate.id}-${candidate.sourceRow}`;
  const complete = isChoiceComplete(choice);

  return (
    <li className='py-4'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-start'>
        <div className='min-w-0 flex-1'>
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
        <span
          dir='ltr'
          className='shrink-0 text-body font-extrabold tabular-nums text-ink'
        >
          {formatCandidateAmount(candidate.amount, candidate.currency)}
        </span>
      </div>

      <div className='mt-3 grid gap-3 rounded-lg bg-surface-2 p-3 sm:grid-cols-2 lg:grid-cols-3'>
        <fieldset className='flex flex-col gap-1.5'>
          <legend className='text-caption font-semibold text-ink-2'>
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
                  onClick={() =>
                    onChange({ ...choice, context: option.value })
                  }
                  className={cn(
                    'flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-caption font-bold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                    active
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-mut hover:text-ink-2',
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
          <Label htmlFor={`${idPrefix}-kind`}>סוג תנועה</Label>
          <Select
            value={choice.kind}
            onValueChange={(value) =>
              onChange({
                ...choice,
                kind: value as TransactionKind,
                incomeClass:
                  value === 'income' ? choice.incomeClass : undefined,
              })
            }
          >
            <SelectTrigger id={`${idPrefix}-kind`} className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kindOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {choice.kind === 'income' ? (
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor={`${idPrefix}-income-class`}>סיווג הכנסה</Label>
            <Select
              value={choice.incomeClass ?? ''}
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
                <SelectValue placeholder='בחירת סוג הכנסה' />
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

      {choice.kind === 'transfer' && (
        <p className='mt-2 text-caption font-semibold text-mut'>
          לפני שמירה נבחר גם את חשבון היעד כדי ליצור שתי תנועות העברה
          תואמות.
        </p>
      )}
    </li>
  );
}

export function ImportReviewList({
  candidates,
  skipped,
}: {
  candidates: ImportCandidate[];
  skipped: number;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [choices, setChoices] = useState<Record<string, ReviewChoice>>(() =>
    Object.fromEntries(
      candidates.map((candidate) => [
        candidateKey(candidate),
        {
          context: candidate.suggestedContext,
          kind: candidate.suggestedKind,
        },
      ]),
    ),
  );

  const completeCount = useMemo(
    () =>
      candidates.filter((candidate) =>
        isChoiceComplete(choices[candidateKey(candidate)]),
      ).length,
    [candidates, choices],
  );
  const visibleCandidates = candidates.slice(0, limit);

  return (
    <div className='rounded-lg border border-line bg-surface px-3'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-line py-3'>
        <div>
          <h3 className='text-body font-extrabold text-ink'>
            סקירה וסיווג
          </h3>
          <p className='mt-0.5 text-caption font-semibold text-mut'>
            {completeCount} מתוך {candidates.length} סווגו
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
          הסיווג נשמר כרגע במסך בלבד. עדיין לא נכתבו נתונים למסד הנתונים.
        </p>
        <Button type='button' disabled>
          שמירת התנועות
        </Button>
      </div>
    </div>
  );
}
