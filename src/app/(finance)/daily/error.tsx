'use client';

import { PageContainer } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';

export default function DailyError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer className='max-w-[980px]'>
      <AlertBanner
        tone='error'
        title='טעינת הסיכום נכשלה'
        body='מוצג סיכום אתמול כגיבוי.'
        action={
          <Button variant='outline' onClick={reset}>
            ניסיון חוזר
          </Button>
        }
      />
    </PageContainer>
  );
}
