'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { _Check, _X } from 'lucide-react';
import { _IOSpinner } from './spinner';

export default function ToastProvider() {
  return (
    <SonnerToaster
      position="top-center"
      offset="24px"
      gap={16}
      toastOptions={{
        style: {
          background: '#131316',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'white',
          boxShadow: `
            0px 32px 64px -16px rgba(0,0,0,0.30),
            0px 16px 32px -8px rgba(0,0,0,0.30),
            0px 8px 16px -4px rgba(0,0,0,0.24),
            0px 4px 8px -2px rgba(0,0,0,0.24),
            0px -8px 16px -1px rgba(0,0,0,0.16),
            0px 2px 4px -1px rgba(0,0,0,0.24),
            0px 0px 0px 1px rgba(0,0,0,1.00),
            inset 0px 0px 0px 1px rgba(255,255,255,0.08),
            inset 0px 1px 0px 0px rgba(255,255,255,0.20)
          `,
          borderRadius: '99px',
          height: '40px',
          padding: '0 16px',
          fontSize: '13px',
          fontFamily: 'OpenRunde, sans-serif',
          gap: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '300px',
        },
        unstyled: true,
        duration: 3000,
        classNames: {
          toast: 'group',
          title: 'text-[13px] font-normal text-white',
          error: 'bg-red-500/10 border-red-500/20',
        },
      }}
    />
  );
}
