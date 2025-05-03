import { createAuthClient } from 'better-auth/react';

// Dynamic imports for Tauri API to avoid errors during SSR
let invoke: any;
let listen: any;

// Dynamic imports for WebAuthn API
let webauthnSupported = false;
let webauthnJson: any;

// Export promise to track Tauri API loading status
export let tauriReady: Promise<void>;

// This will be executed only in the browser, not during SSR
if (typeof window !== 'undefined') {
  // Use dynamic imports to load Tauri API
  const loadTauriApis = async () => {
    try {
      // Import the unified Tauri API to avoid module resolution issues
      const tauriApi = await import('@tauri-apps/api');

      // Get invoke from the core module
      invoke = tauriApi.core.invoke;

      // Get listen from the event module
      listen = tauriApi.event.listen;

      if (!invoke || !listen) {
        throw new Error('Tauri API functions not found');
      }
    } catch (e) {
      console.warn('Tauri API import failed:', e);
      throw e; // Propagate error to tauriReady promise
    }
  };

  // Load WebAuthn APIs
  const loadWebAuthnApis = async () => {
    try {
      // Check if the browser supports WebAuthn
      webauthnSupported =
        window.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === 'function';

      // Load GitHub's WebAuthn JSON library
      if (webauthnSupported) {
        webauthnJson = await import('@github/webauthn-json');
      }
    } catch (e) {
      console.warn('WebAuthn API import failed:', e);
    }
  };

  // Initialize and export promises for API loading
  tauriReady = loadTauriApis();
  loadWebAuthnApis();
} else {
  // Provide a resolved promise for SSR environments
  tauriReady = Promise.resolve();
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
  // Ensure Tauri APIs are loaded before proceeding
  await tauriReady;

  return new Promise((resolve, reject) => {
    // Track unlisten function to clean up event listener
    let unlistenFn: () => void;

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
            // Clean up listener before resolving
            if (unlistenFn) unlistenFn();
            resolve({ accessToken });
          }
        }

        // For query params like ?code=xyz&state=abc
        else if (url.includes('?code=') || url.includes('&state=')) {
          // This requires a server exchange, which better-auth should handle
          // We're just passing the entire URL back to better-auth

          // Clean up listener before resolving
          if (unlistenFn) unlistenFn();
          // Return the URL for better-auth to complete the flow
          resolve({ accessToken: url });
        } else {
          // Clean up listener before rejecting
          if (unlistenFn) unlistenFn();
          reject(new Error('Invalid auth response'));
        }
      } catch (error) {
        // Clean up listener before rejecting
        if (unlistenFn) unlistenFn();
        reject(error);
      }
    })
      .then((unlisten) => {
        // Store the unlisten function for cleanup
        unlistenFn = unlisten;
      })
      .catch((error) => {
        reject(error);
      });

    // Open the OAuth window in Tauri
    invoke('open_oauth_window', { authUrl }).catch((error) => {
      // Clean up listener if window opening fails
      if (unlistenFn) unlistenFn();
      reject(error);
    });
  });
}

// Utility function to check if passkeys are supported
const isPasskeySupported = (): boolean => {
  // Check if running in a browser
  if (typeof window === 'undefined') return false;

  // Check basic WebAuthn support
  if (!webauthnSupported) return false;

  // Check for conditional UI support (passkey UX)
  return (
    window.PublicKeyCredential &&
    'isConditionalMediationAvailable' in window.PublicKeyCredential &&
    // For macOS platform passkey support
    window.navigator.platform.includes('Mac')
  );
};

// Create enhanced authentication helpers with platform passkey support
export const { signIn: standardSignIn, signUp, useSession, signOut } = authClient;

// Extend the signIn object with passkey support
export const signIn = {
  ...standardSignIn,

  // Keep standard social sign-in methods but add usePasskeys option
  social: async (options: { provider: string; callbackURL?: string; usePasskeys?: boolean }) => {
    // Handle WebAuthn/Passkey functionality transparently when the
    // usePasskeys flag is passed and platform supports it
    if (options.usePasskeys && webauthnSupported && typeof window !== 'undefined') {
      console.log('Using passkey-enhanced social login for', options.provider);

      // The actual WebAuthn functionality is handled by better-auth via
      // the conditional UI support we enabled in the backend
    }

    // Standard social sign-in with or without passkey support
    return await standardSignIn.social(options);
  },
};

// Export additional passkey utilities
export const passkeys = {
  isSupported: isPasskeySupported,
};
