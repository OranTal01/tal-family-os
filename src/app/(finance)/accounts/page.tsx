import Link from 'next/link';
import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { Amount } from '@/components/finance/amount';
import { EmptyState } from '@/components/finance/empty-state';
import { StatusBadge } from '@/components/finance/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { routes } from '@/lib/routes';
import { getPersistedAccountsScreen } from '@/server/data/persisted-accounts';

export const metadata: Metadata = { title: 'חשבונות וכרטיסים' };

export default async function AccountsPage() {
  const accounts = await getPersistedAccountsScreen();
  const importAction = (
    <Link href={routes.transactions} className={buttonVariants()}>
      <Icon name='upload_file' className='text-[16px]' />
      ייבוא קובץ
    </Link>
  );

  return (
    <PageContainer>
      <PageHeader title='חשבונות וכרטיסים' actions={importAction} />

      {accounts.length === 0 ? (
        <EmptyState
          icon='account_balance'
          title='עדיין אין חשבונות אמיתיים'
          body='ייבוא ראשון של קובץ בנק או כרטיס אשראי ייצור כאן את החשבון ויציג את הנתונים שלו.'
          action={importAction}
        />
      ) : (
        <ul className='overflow-hidden rounded-lg border border-line bg-surface shadow-sm'>
          {accounts.map((account) => (
            <li
              key={account.id}
              className='flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:flex-nowrap'
            >
              <span
                aria-hidden
                className='flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-mut'
              >
                <Icon name={account.icon} className='text-[20px]' />
              </span>
              <span className='flex min-w-0 flex-1 flex-col'>
                <span className='flex items-center gap-2'>
                  <span className='truncate text-body font-bold text-ink'>
                    {account.name}
                  </span>
                  {account.context === 'business' && (
                    <StatusBadge
                      tone='future'
                      icon='storefront'
                      label='עסק'
                      size='micro'
                    />
                  )}
                </span>
                <span className='truncate text-caption font-semibold text-mut'>
                  {account.subtitle}
                </span>
              </span>
              <StatusBadge
                tone={account.source === 'imported' ? 'ok' : 'sync'}
                icon={
                  account.source === 'imported'
                    ? 'upload_file'
                    : 'edit_note'
                }
                label={
                  account.source === 'imported'
                    ? 'מיובא מקובץ'
                    : 'הוזן ידנית'
                }
              />
              <span className='flex w-32 shrink-0 flex-col items-end text-end'>
                <span className='text-micro font-semibold text-mut'>
                  {account.balanceLabel}
                </span>
                <Amount
                  value={account.balance}
                  className='text-body font-extrabold text-ink'
                />
                {account.asOfLabel && (
                  <span className='text-micro font-semibold text-mut'>
                    {account.asOfLabel}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
