'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  commitTransactionImportAction,
  previewTransactionImportAction,
} from '@/app/(finance)/transactions/actions';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImportReviewList } from '@/features/transactions/import-review-list';
import {
  initialImportActionState,
  initialImportCommitActionState,
  type ImportDecision,
} from '@/lib/imports/types';
import type { CategoryOption } from '@/server/data/views';

export function ImportTransactionsButton({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [commitState, setCommitState] = useState(
    initialImportCommitActionState,
  );
  const [saving, startSaving] = useTransition();
  const [state, formAction, pending] = useActionState(
    previewTransactionImportAction,
    initialImportActionState,
  );
  const preview =
    state.status === 'preview' && selectedFile === previewFile
      ? state.preview
      : null;

  function saveTransactions(decisions: ImportDecision[]) {
    if (!selectedFile) {
      setCommitState({
        status: 'error',
        message: 'יש לבחור מחדש את קובץ ה־Excel לפני השמירה.',
      });
      return;
    }

    setCommitState(initialImportCommitActionState);
    startSaving(async () => {
      const formData = new FormData();
      formData.set('file', selectedFile);
      formData.set('decisions', JSON.stringify(decisions));
      const result = await commitTransactionImportAction(formData);
      setCommitState(result);
      if (result.status === 'success') {
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button variant='outline' size='lg' onClick={() => setOpen(true)}>
        <Icon name='upload_file' className='text-[16px]' />
        ייבוא Excel
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[780px]'>
          <DialogHeader>
            <DialogTitle className='text-subhead font-extrabold text-ink'>
              ייבוא תנועות מ־Excel
            </DialogTitle>
            <DialogDescription className='text-body text-mut'>
              תומך ביצוא XLSX של הבנק הבינלאומי, כאל וישראכרט. הקובץ נקרא
              בזיכרון בלבד ולא נשמר בשלב התצוגה.
            </DialogDescription>
          </DialogHeader>

          <form
            action={formAction}
            onSubmit={() => {
              setPreviewFile(selectedFile);
              setCommitState(initialImportCommitActionState);
            }}
            className='flex flex-col gap-3 rounded-lg border border-line bg-surface-2 p-3'
          >
            <div className='flex flex-col gap-2'>
              <Label htmlFor='transaction-import-file'>קובץ XLSX</Label>
              <Input
                id='transaction-import-file'
                name='file'
                type='file'
                accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                required
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  setCommitState(initialImportCommitActionState);
                }}
                className='h-11 cursor-pointer bg-surface file:me-3 file:border-0 file:bg-transparent file:font-bold'
              />
              <p className='text-caption font-semibold text-mut'>
                עד 1.5MB. אין להעלות PDF, צילום מסך או קובץ XLS ישן.
              </p>
            </div>
            <div className='flex justify-end'>
              <Button type='submit' disabled={pending}>
                <Icon name='document_scanner' className='text-[16px]' />
                {pending ? 'קוראים את הקובץ…' : 'בדיקה ותצוגה מקדימה'}
              </Button>
            </div>
          </form>

          {state.status === 'error' && (
            <AlertBanner
              tone='error'
              title='לא הצלחנו להכין תצוגה מקדימה'
              body={state.message}
            />
          )}

          {preview && (
            <div className='flex flex-col gap-4' aria-live='polite'>
              <AlertBanner
                tone='success'
                title={`${preview.providerLabel} זוהה בהצלחה`}
                body={state.message}
              />

              <div className='grid gap-2 sm:grid-cols-3'>
                <Card size='sm'>
                  <CardHeader>
                    <CardTitle className='text-caption font-bold text-mut'>
                      בעלות שזוהתה
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='text-body font-extrabold text-ink'>
                    {preview.ownerLabel}
                  </CardContent>
                </Card>
                <Card size='sm'>
                  <CardHeader>
                    <CardTitle className='text-caption font-bold text-mut'>
                      תנועות שנמצאו
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='text-heading font-extrabold text-ink'>
                    {preview.stats.detected}
                  </CardContent>
                </Card>
                <Card size='sm'>
                  <CardHeader>
                    <CardTitle className='text-caption font-bold text-mut'>
                      דורשות בדיקה
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='text-heading font-extrabold text-ink'>
                    {preview.stats.needsReview}
                  </CardContent>
                </Card>
              </div>

              <div className='rounded-lg border border-line bg-surface p-3'>
                <p className='text-body font-bold text-ink'>
                  {preview.accountLabels.join(' · ')}
                </p>
                <ul className='mt-2 list-disc space-y-1 ps-5 text-caption font-semibold text-mut'>
                  {preview.notices.map((notice) => (
                    <li key={notice}>{notice}</li>
                  ))}
                </ul>
              </div>

              {commitState.status !== 'success' && (
                <ImportReviewList
                  key={[
                    preview.provider,
                    preview.fileName,
                    preview.candidates.length,
                    preview.candidates.at(0)?.fingerprint,
                    preview.candidates.at(-1)?.fingerprint,
                  ].join(':')}
                  candidates={preview.candidates}
                  categories={categories}
                  skipped={preview.stats.skipped}
                  saving={saving}
                  saveError={
                    commitState.status === 'error'
                      ? commitState
                      : undefined
                  }
                  onReviewChange={() =>
                    setCommitState(initialImportCommitActionState)
                  }
                  onSave={saveTransactions}
                />
              )}

              {commitState.status === 'error' && (
                <AlertBanner
                  tone='error'
                  title='לא הצלחנו לשמור'
                  body={commitState.message}
                />
              )}

              {commitState.status === 'success' && (
                <div className='flex flex-col gap-3'>
                  <AlertBanner
                    tone='success'
                    title='הייבוא נשמר בהצלחה'
                    body={`${commitState.insertedCount} תנועות נוספו, ${commitState.duplicateCount} כפילויות לא נוספו, ו־${commitState.skippedCount} שורות הושמטו בבטחה.`}
                  />
                  {commitState.reviewCount > 0 && (
                    <AlertBanner
                      tone='info'
                      title={`${commitState.reviewCount} תנועות מחכות לקטגוריה`}
                      body='התנועות כבר מופיעות במסך, וניתן לסנן אותן בלשונית "לבדיקה".'
                    />
                  )}
                  <div className='flex justify-end'>
                    <Button type='button' onClick={() => setOpen(false)}>
                      סיום וצפייה בתנועות
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
