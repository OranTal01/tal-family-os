'use client';

import { PageContainer } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';

export default function SplitError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer>
      <AlertBanner
        tone='error'
        title='נתוני עסק לא נטענו'
        body='נתוני הבית עדיין מוצגים.'
        action={
          <Button variant='outline' onClick={reset}>
            ניסיון חוזר
          </Button>
        }
      />
    </PageContainer>
  );
}
