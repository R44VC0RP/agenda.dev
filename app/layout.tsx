import type React from 'react';
import './globals.css';
import '@/styles/animations.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from '@vercel/analytics/react';
import { PostHogProvider } from '@/components/PostHogProvider';
import ToastProvider from '@/components/toast-provider';
import PWAWrapper from '@/components/PWAWrapper';

export const metadata: Metadata = {
  title: 'agenda.dev',
  description: "the world's most powerful todo list",
  manifest: '/manifest.json',
  themeColor: '#7c5aff',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'agenda.dev',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body suppressHydrationWarning>
        <PostHogProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            {children}
            <ToastProvider />
          </ThemeProvider>
          <Analytics />
        </PostHogProvider>
        {/* PWA Support */}
        <PWAWrapper />
      </body>
    </html>
  );
}
