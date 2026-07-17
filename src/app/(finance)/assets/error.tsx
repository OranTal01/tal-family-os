'use client';

import { PageContainer } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';

export default function AssetsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer>
      <AlertBanner
        tone='error'
        title='עדכון שווי נכסים נכשל'
        body='מוצג הערך האחרון הידוע.'
        action={
          <Button variant='outline' onClick={reset}>
            ניסיון חוזר
          </Button>
        }
      />
    </PageContainer>
  );
}
