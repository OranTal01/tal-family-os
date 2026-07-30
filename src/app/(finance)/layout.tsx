import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { ProfileSetupError } from '@/components/auth/profile-setup-error';
import { HouseholdSetup } from '@/components/onboarding/household-setup';
import { HouseholdInvitation } from '@/components/onboarding/household-invitation';
import { HouseholdSetupError } from '@/components/onboarding/household-setup-error';
import { getShellData } from '@/server/data/shell';
import {
  getCurrentHouseholdMembership,
  getPendingHouseholdInvitation,
  getCurrentProfile,
  getCurrentUser,
} from '@/lib/supabase/dal';
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

  let membership;
  try {
    membership = await getCurrentHouseholdMembership();
  } catch {
    return <HouseholdSetupError />;
  }

  if (!membership) {
    let invitation;
    try {
      invitation = await getPendingHouseholdInvitation();
    } catch {
      return <HouseholdSetupError />;
    }

    if (invitation) {
      return (
        <HouseholdInvitation
          invitation={invitation}
          displayName={profile.display_name}
        />
      );
    }

    return <HouseholdSetup displayName={profile.display_name} />;
  }

  const { reviewCount, syncState, syncedAgo } = await getShellData();
  return (
    <AppShell
      reviewCount={reviewCount}
      syncState={syncState}
      syncedAgo={syncedAgo}
    >
      {children}
    </AppShell>
  );
}
