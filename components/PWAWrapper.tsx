'use client';

import { useEffect } from 'react';

export default function PWAWrapper() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.workbox !== undefined
    ) {
      const wb = window.workbox;

      // Skip waiting on install and activate new service worker right away
      wb.addEventListener('installed', (event) => {
        if (event.isUpdate) {
          if (confirm('New version available! Reload to update?')) {
            window.location.reload();
          }
        }
      });

      wb.register();
    } else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        },
        (error) => {
          console.log('ServiceWorker registration failed: ', error);
        }
      );
    }
  }, []);

  return null;
}

// Add this to make TypeScript happy
declare global {
  interface Window {
    workbox: any;
  }
}
