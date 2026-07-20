/**
 * Bare layout for the auth route group — no AppShell (sidebar/topbar/bottom nav),
 * just a centered surface on the app background.
 */
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className='flex min-h-dvh items-center justify-center bg-bg px-4 py-10'>
      <div className='w-full max-w-[380px]'>{children}</div>
    </div>
  );
}
