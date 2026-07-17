'use client';

import { PageContainer } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';

export default function ReviewError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer className='max-w-[860px]'>
      <AlertBanner
        tone='error'
        title='העדכון נכשל'
        body='הפעולה נשארת פתוחה — אפשר לנסות שוב.'
        action={
          <Button variant='outline' onClick={reset}>
            ניסיון חוזר
          </Button>
        }
      />
    </PageContainer>
  );
}
