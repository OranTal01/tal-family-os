import type { Metadata, Viewport } from 'next';
import { Assistant } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import 'material-symbols/rounded.css';
import './globals.css';

const assistant = Assistant({
  subsets: ['hebrew', 'latin'],
  variable: '--font-assistant',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'כספי הבית · The Tal Family OS',
    template: '%s · כספי הבית',
  },
  description: 'מערכת ניהול הכספים המשפחתית של משפחת טל',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f5f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1513' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='he'
      dir='rtl'
      className={assistant.variable}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position='bottom-center' dir='rtl' />
        </ThemeProvider>
      </body>
    </html>
  );
}
