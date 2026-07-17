import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Amount } from '@/components/finance/amount';
import { StatusBadge } from '@/components/finance/status-badge';
import { Icon } from '@/components/ui/icon';
import { ConnectButton, ReconnectButton } from '@/features/accounts/connect-buttons';
import { getAccountsScreen } from '@/server/data/views';

export const metadata: Metadata = { title: 'חשבונות וכרטיסים' };

export default async function AccountsPage() {
  const accounts = await getAccountsScreen();
  const failing = accounts.find((a) => a.sync === 'error');

  return (
    <PageContainer>
      <PageHeader title='חשבונות וכרטיסים' actions={<ConnectButton />} />

      {failing && (
        <AlertBanner
          tone='error'
          className='mb-4'
          title={`אירעה שגיאת סנכרון ב${failing.name}`}
          body='החיבור פג לפני יומיים. חלק מהתנועות עשויות לא להופיע.'
          action={<ReconnectButton name={failing.name} />}
        />
      )}

      <ul className='overflow-hidden rounded-lg border border-line bg-surface shadow-sm'>
        {accounts.map((a) => (
          <li
            key={a.id}
            className='flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:flex-nowrap'
          >
            <span
              aria-hidden
              className='flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-mut'
            >
              <Icon name={a.icon} className='text-[20px]' />
            </span>
            <span className='flex min-w-0 flex-1 flex-col'>
              <span className='flex items-center gap-2'>
                <span className='truncate text-body font-bold text-ink'>{a.name}</span>
                {a.context === 'business' && (
                  <StatusBadge tone='future' icon='storefront' label='עסק' size='micro' />
                )}
              </span>
              <span className='truncate text-caption font-semibold text-mut'>{a.subtitle}</span>
            </span>
            <StatusBadge
              tone={a.sync === 'ok' ? 'ok' : a.sync === 'syncing' ? 'sync' : 'warn'}
              icon={a.sync === 'ok' ? 'check_circle' : a.sync === 'syncing' ? 'progress_activity' : 'error'}
              label={a.sync === 'ok' ? 'מסונכרן' : a.sync === 'syncing' ? 'מסנכרן…' : 'שגיאת חיבור'}
              spin={a.sync === 'syncing'}
            />
            <span className='flex w-28 shrink-0 flex-col items-end text-end'>
              <span className='text-micro font-semibold text-mut'>{a.balanceLabel}</span>
              {a.balance !== null ? (
                <Amount value={a.balance} className='text-body font-extrabold text-ink' />
              ) : (
                <span className='text-body font-extrabold text-mut'>—</span>
              )}
            </span>
            {a.sync === 'error' && <ReconnectButton name={a.name} compact />}
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
