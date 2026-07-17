'use client';

import { PageContainer } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer>
      <AlertBanner
        tone='error'
        title='סנכרון חלקי'
        body='חלק מהנתונים לא נטענו. הנתונים האחרונים שנשמרו יוצגו לאחר רענון.'
        action={
          <Button variant='outline' onClick={reset}>
            רענון
          </Button>
        }
      />
    </PageContainer>
  );
}
