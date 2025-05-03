'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface TauriContextType {
  isTauri: boolean;
}

const TauriContext = createContext<TauriContextType>({
  isTauri: false,
});

export const useTauri = () => useContext(TauriContext);

export function TauriProvider({ children }: { children: React.ReactNode }) {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // Check if we're in the Tauri environment
    const checkTauri = () => {
      const isTauriDesktop = process.env.NEXT_PUBLIC_TAURI_DESKTOP === 'true';
      setIsTauri(isTauriDesktop || window.__TAURI__ !== undefined);
    };

    checkTauri();
  }, []);

  return <TauriContext.Provider value={{ isTauri }}>{children}</TauriContext.Provider>;
}

// Type declaration for the Tauri object
declare global {
  interface Window {
    __TAURI__?: any;
  }
}
