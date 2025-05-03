import type React from 'react';
import './globals.css';
import '@/styles/animations.css';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from '@vercel/analytics/react';
import { PostHogProvider } from '@/components/PostHogProvider';
import ToastProvider from '@/components/toast-provider';
import PWAWrapper from '@/components/PWAWrapper';
import { TauriProvider } from '@/components/ui/tauri-provider';

export const metadata: Metadata = {
  title: 'agenda.dev',
  description: "the world's most powerful todo list",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'agenda.dev',
  },
};

export const viewport: Viewport = {
  themeColor: '#7c5aff',
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body suppressHydrationWarning>
        <PostHogProvider>
          <TauriProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
              {children}
              <ToastProvider />
            </ThemeProvider>
          </TauriProvider>
          <Analytics />
        </PostHogProvider>
        {/* PWA Support */}
        <PWAWrapper />
      </body>
    </html>
  );
}
