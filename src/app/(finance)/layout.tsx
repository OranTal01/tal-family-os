import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { ProfileSetupError } from '@/components/auth/profile-setup-error';
import { getShellData } from '@/server/data/shell';
import { getCurrentProfile, getCurrentUser } from '@/lib/supabase/dal';
import { authRoutes } from '@/lib/routes';

export default async function FinanceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Defensive fallback — the proxy already redirects unauthenticated requests
  // before they reach here on every navigation; this only matters if that gate
  // is ever bypassed.
  const user = await getCurrentUser();
  if (!user) redirect(authRoutes.login);

  const profile = await getCurrentProfile();
  if (!profile) return <ProfileSetupError />;

  const { reviewCount, syncedAgo } = await getShellData();
  return (
    <AppShell reviewCount={reviewCount} syncedAgo={syncedAgo}>
      {children}
    </AppShell>
  );
}
