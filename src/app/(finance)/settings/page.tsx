import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { SectionCard } from '@/components/finance/section-card';
import { Icon } from '@/components/ui/icon';
import { InviteButton } from '@/features/settings/invite-button';
import { Preferences } from '@/features/settings/preferences';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { getSettingsScreen } from '@/server/data/views';
import { getCurrentUser } from '@/lib/supabase/dal';

export const metadata: Metadata = { title: 'הגדרות' };

export default async function SettingsPage() {
  const [{ members, rules }, user] = await Promise.all([
    getSettingsScreen(),
    getCurrentUser(),
  ]);
  const adults = members.filter((m) => m.kind === 'adult');
  const children = members.filter((m) => m.kind === 'child');

  return (
    <PageContainer className='max-w-[980px]'>
      <PageHeader title='הגדרות' />

      <div className='grid gap-4 lg:grid-cols-2'>
        <SectionCard title='בני משק הבית' action={<InviteButton />}>
          <ul className='flex flex-col divide-y divide-line'>
            {adults.map((m) => (
              <li key={m.id} className='flex items-center gap-3 py-3'>
                <span
                  aria-hidden
                  className='flex size-10 items-center justify-center rounded-full bg-surface-3 text-subhead font-extrabold text-ink-2'
                >
                  {m.initial}
                </span>
                <span className='flex min-w-0 flex-1 flex-col'>
                  <span className='truncate text-body font-bold text-ink'>{m.name}</span>
                  <span className='text-caption font-semibold text-mut'>{m.role}</span>
                </span>
                <Icon name='chevron_left' className='text-[18px] text-mut' />
              </li>
            ))}
            {children.length > 0 && (
              <li className='flex items-center gap-3 py-3'>
                <span
                  aria-hidden
                  className='flex size-10 items-center justify-center rounded-full bg-accent text-accent-ink'
                >
                  <Icon name='family_restroom' className='text-[20px]' />
                </span>
                <span className='flex min-w-0 flex-1 flex-col'>
                  <span className='text-body font-bold text-ink'>
                    {children.map((c) => c.name).join(' · ')}
                  </span>
                  <span className='text-caption font-semibold text-mut'>
                    ילדים · ללא גישה למערכת
                  </span>
                </span>
              </li>
            )}
          </ul>
        </SectionCard>

        <SectionCard title='העדפות'>
          <Preferences />
        </SectionCard>

        <SectionCard title='חשבון'>
          <div className='flex items-center justify-between gap-3'>
            <span className='truncate text-body font-semibold text-ink-2'>
              {user?.email}
            </span>
            <SignOutButton />
          </div>
        </SectionCard>

        <SectionCard
          title='כללי סיווג'
          className='lg:col-span-2'
          action={
            <span className='text-caption font-semibold text-mut'>
              נוצרים מ״זכור כלל זה״ בזרימת הבדיקה
            </span>
          }
        >
          {rules.length === 0 ? (
            <p className='py-3 text-body text-mut'>
              עדיין אין כללים. בעת סיווג תנועה אפשר לבחור ״זכור כלל זה״ — והכלל יופיע כאן.
            </p>
          ) : (
            <ul className='grid gap-2 sm:grid-cols-2'>
              {rules.map((r) => (
                <li
                  key={r.id}
                  className='flex items-center gap-3 rounded-md bg-surface-2 px-3 py-2.5'
                >
                  <Icon name='rule' className='text-[18px] text-mut' />
                  <span className='flex min-w-0 flex-1 flex-col'>
                    <span className='truncate text-body font-bold text-ink'>{r.pattern}</span>
                    <span className='truncate text-caption font-semibold text-mut'>
                      ישויך אוטומטית ל{r.categoryName}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
