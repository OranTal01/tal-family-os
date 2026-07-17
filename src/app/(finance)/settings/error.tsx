'use client';

import { PageContainer } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';

export default function SettingsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer className='max-w-[980px]'>
      <AlertBanner
        tone='error'
        title='שמירת הגדרה נכשלה'
        body='חזרנו לערך הקודם.'
        action={
          <Button variant='outline' onClick={reset}>
            ניסיון חוזר
          </Button>
        }
      />
    </PageContainer>
  );
}
