import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { Amount } from '@/components/finance/amount';
import { Icon } from '@/components/ui/icon';
import { formatMoney } from '@/lib/format/currency';
import { getAssetsScreen } from '@/server/data/views';

export const metadata: Metadata = { title: 'נכסים וחיסכון' };

export default async function AssetsPage() {
  const a = await getAssetsScreen();

  return (
    <PageContainer>
      <PageHeader title='נכסים וחיסכון' meta='עודכן היום · 08:00' />

      <dl className='mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <div className='rounded-lg border border-line bg-accent p-4 shadow-md'>
          <dt className='text-caption font-semibold text-accent-foreground'>שווי נטו כולל</dt>
          <dd className='flex flex-col'>
            <Amount value={a.netWorth} className='text-display font-extrabold text-accent-foreground' />
            <span className='ltr-embed tabular-amounts text-caption font-semibold text-accent-ink'>
              {formatMoney(a.totalAssets, { abbreviate: true })} −{' '}
              {formatMoney(a.totalLiabilities, { abbreviate: true })}
            </span>
          </dd>
        </div>
        <div className='rounded-lg border border-line bg-surface p-4 shadow-sm'>
          <dt className='text-caption font-semibold text-mut'>סך נכסים</dt>
          <dd>
            <Amount value={a.totalAssets} className='text-display font-extrabold text-ink' />
          </dd>
        </div>
        <div className='rounded-lg border border-line bg-surface p-4 shadow-sm'>
          <dt className='flex items-center gap-1 text-caption font-semibold text-mut'>
            <Icon name='south_east' className='text-[14px]' />
            התחייבויות
          </dt>
          <dd>
            <Amount
              value={(-a.totalLiabilities) as typeof a.totalLiabilities}
              className='text-display font-extrabold text-ink'
            />
          </dd>
        </div>
      </dl>

      <ul className='overflow-hidden rounded-lg border border-line bg-surface shadow-sm'>
        {a.rows.map((row) => (
          <li
            key={row.id}
            className='flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0'
          >
            <span
              aria-hidden
              className='flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-mut'
            >
              <Icon name={row.icon} className='text-[18px]' />
            </span>
            <span className='flex min-w-0 flex-1 flex-col'>
              <span className='truncate text-body font-bold text-ink' title={row.name}>
                {row.name}
              </span>
              <span className='truncate text-caption font-semibold text-mut'>{row.subtitle}</span>
            </span>
            <span
              className={
                row.liability
                  ? 'rounded-full bg-warn-soft px-2 py-0.5 text-micro font-bold text-warn-ink'
                  : 'rounded-full bg-surface-2 px-2 py-0.5 text-micro font-bold text-mut'
              }
            >
              {row.chip}
            </span>
            <Amount
              value={(row.liability ? -row.value : row.value) as typeof row.value}
              className='shrink-0 text-body font-extrabold text-ink'
            />
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
