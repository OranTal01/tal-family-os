import { AppShell } from '@/components/shell/app-shell';
import { getShellData } from '@/server/data/shell';

export default async function FinanceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { reviewCount, syncedAgo } = await getShellData();
  return (
    <AppShell reviewCount={reviewCount} syncedAgo={syncedAgo}>
      {children}
    </AppShell>
  );
}
