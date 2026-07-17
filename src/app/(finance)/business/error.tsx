'use client';

import { PageContainer } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';

export default function BusinessError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer>
      <AlertBanner
        tone='error'
        title='סנכרון חשבון העסק נכשל'
        action={
          <Button variant='outline' onClick={reset}>
            חיבור מחדש
          </Button>
        }
      />
    </PageContainer>
  );
}
