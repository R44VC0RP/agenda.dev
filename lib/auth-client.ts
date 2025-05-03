import { createAuthClient } from 'better-auth/react';

// Dynamic imports for Tauri API to avoid errors during SSR
let invoke: any;
let listen: any;

// This will be executed only in the browser, not during SSR
if (typeof window !== 'undefined') {
  // Use dynamic imports to load Tauri API
  const loadTauriApis = async () => {
    try {
      const tauriApi = await import('@tauri-apps/api');
      invoke = tauriApi?.invoke;
      listen = tauriApi?.event?.listen;
    } catch (e) {
      console.warn('Tauri API import failed:', e);
    }
  };

  loadTauriApis();
}

// Detect if we're running in Tauri
const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_BASE_URL,
  onSocialAuth: async (authUrl, provider) => {
    if (isTauri) {
      // Handle OAuth flow in Tauri
      return handleTauriOAuth(authUrl, provider);
    }
    // Default behavior for web
    return null;
  },
});

// Handle OAuth flow in Tauri
async function handleTauriOAuth(
  authUrl: string,
  provider: string
): Promise<{ accessToken: string }> {
  return new Promise((resolve, reject) => {
    // Listen for auth callback from Tauri
    listen<{ url: string }>('auth-callback', async (event) => {
      try {
        // Parse the URL to extract tokens
        const url = event.payload.url;

        // For fragments like #access_token=xyz&refresh_token=abc
        if (url.includes('#access_token=')) {
          const fragmentPart = url.split('#')[1];
          const params = new URLSearchParams(fragmentPart);

          const accessToken = params.get('access_token');
          if (accessToken) {
            resolve({ accessToken });
          }
        }

        // For query params like ?code=xyz&state=abc
        else if (url.includes('?code=') || url.includes('&state=')) {
          // This requires a server exchange, which better-auth should handle
          // We're just passing the entire URL back to better-auth

          // Note: Return the URL for better-auth to complete the flow
          resolve({ accessToken: url });
        } else {
          reject(new Error('Invalid auth response'));
        }
      } catch (error) {
        reject(error);
      }
    });

    // Open the OAuth window in Tauri
    invoke('open_oauth_window', { authUrl }).catch((error) => {
      reject(error);
    });
  });
}

// Export commonly used methods
export const { signIn, signUp, useSession, signOut } = authClient;
