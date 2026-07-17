'use client';

import { PageContainer } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';

export default function AccountsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer>
      <AlertBanner
        tone='error'
        title='שגיאת חיבור'
        body='לא הצלחנו לטעון את רשימת המקורות.'
        action={
          <Button variant='outline' onClick={reset}>
            התחברות מחדש
          </Button>
        }
      />
    </PageContainer>
  );
}
