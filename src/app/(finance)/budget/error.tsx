'use client';

import { PageContainer } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';

export default function BudgetError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer>
      <AlertBanner
        tone='error'
        title='לא ניתן לטעון את התקציב'
        body='עריכת התקציב מושבתת עד לטעינה מוצלחת.'
        action={
          <Button variant='outline' onClick={reset}>
            ניסיון חוזר
          </Button>
        }
      />
    </PageContainer>
  );
}
