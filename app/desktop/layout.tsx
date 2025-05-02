'use client';

import '../globals.css';
import '@/styles/animations.css';
import { ThemeProvider } from '@/components/theme-provider';
import { TauriProvider } from '@/components/ui/tauri-provider';
import ToastProvider from '@/components/toast-provider';

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Agenda - Desktop App</title>
        <meta name="description" content="The world's most powerful todo list - Desktop App" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body suppressHydrationWarning>
        <TauriProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            {children}
            <ToastProvider />
          </ThemeProvider>
        </TauriProvider>
      </body>
    </html>
  );
}
