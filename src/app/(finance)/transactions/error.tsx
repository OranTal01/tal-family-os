'use client';

import { PageContainer } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';

export default function TransactionsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer>
      <AlertBanner
        tone='error'
        title='טעינת התנועות נכשלה'
        body='המסננים שבחרתם נשמרו — ננסה לטעון שוב.'
        action={
          <Button variant='outline' onClick={reset}>
            ניסיון חוזר
          </Button>
        }
      />
    </PageContainer>
  );
}
