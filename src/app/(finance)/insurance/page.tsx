import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { Amount } from '@/components/finance/amount';
import { StatusBadge } from '@/components/finance/status-badge';
import { Icon } from '@/components/ui/icon';
import { getInsuranceScreen } from '@/server/data/views';

export const metadata: Metadata = { title: 'ביטוחים' };

export default async function InsurancePage() {
  const { totalPremium, policies } = await getInsuranceScreen();

  return (
    <PageContainer>
      <PageHeader
        title='ביטוחים'
        actions={
          <div className='flex items-baseline gap-2 rounded-lg border border-line bg-surface px-3 py-2 shadow-sm'>
            <span className='text-caption font-semibold text-mut'>סה״כ פרמיה חודשית</span>
            <Amount value={totalPremium} className='text-heading font-extrabold text-ink' />
          </div>
        }
      />

      <ul className='grid gap-3 sm:grid-cols-2'>
        {policies.map((p) => (
          <li
            key={p.id}
            className='flex items-center gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm'
          >
            <span
              aria-hidden
              className='flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink'
            >
              <Icon name={p.icon} className='text-[20px]' />
            </span>
            <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <span className='truncate text-body font-bold text-ink'>{p.name}</span>
              <span className='truncate text-caption font-semibold text-mut'>
                {p.provider} · {p.coverage}
              </span>
              <StatusBadge
                tone={p.status === 'renewal_due' ? 'near' : 'ok'}
                icon={p.status === 'renewal_due' ? 'update' : 'check_circle'}
                label={p.statusLabel}
                size='micro'
                className='w-fit'
              />
            </span>
            <span className='ltr-embed tabular-amounts shrink-0 text-body font-extrabold text-ink'>
              ₪{Math.round(p.premiumMonthly / 100)}/ח׳
            </span>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
