'use client';

// This file provides a wrapper for Tauri API calls

let tauriApi: any;

// Only import Tauri API in a browser environment
if (typeof window !== 'undefined') {
  try {
    // Dynamic import ensures Tauri API is only imported in browser environment
    const loadTauriApi = async () => {
      if (window.__TAURI__) {
        // If Tauri is detected, use its API
        return {
          invoke: window.__TAURI__.invoke,
          ready: true,
          isTauri: true,
        };
      }
      return {
        invoke: async () => {
          console.warn('Tauri not available, API calls will fail');
          return null;
        },
        ready: true,
        isTauri: false,
      };
    };

    tauriApi = {
      invoke: async (...args: any[]) => {
        const api = await loadTauriApi();
        return api.invoke(...args);
      },
      isTauri: () => Boolean(window.__TAURI__),
    };
  } catch (e) {
    console.error('Failed to initialize Tauri API:', e);
    tauriApi = {
      invoke: async () => {
        console.warn('Tauri not available, API calls will fail');
        return null;
      },
      isTauri: () => false,
    };
  }
} else {
  // Server-side rendering fallback
  tauriApi = {
    invoke: async () => null,
    isTauri: () => false,
  };
}

// Storage functions
export async function getPreferences() {
  if (!tauriApi.isTauri()) return {};
  try {
    return await tauriApi.invoke('get_preferences');
  } catch (e) {
    console.error('Failed to get preferences:', e);
    return {};
  }
}

export async function savePreferences(preferences: Record<string, any>) {
  if (!tauriApi.isTauri()) return false;
  try {
    await tauriApi.invoke('save_preferences', { preferences });
    return true;
  } catch (e) {
    console.error('Failed to save preferences:', e);
    return false;
  }
}

// Type declaration for the Tauri object
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

export default tauriApi;
