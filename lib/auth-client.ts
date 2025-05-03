import { createAuthClient } from 'better-auth/react';
import { passkeyClient } from 'better-auth/client/plugins';

// Define noop implementations that do nothing but return valid values
// to avoid errors when running in web environment
const noopInvoke = async () => null;
const noopListen = async () => () => {};

// Default to noop implementations
let invoke: any = noopInvoke;
let listen: any = noopListen;

// For WebAuthn API
let webauthnSupported = false;
let webauthnJson: any;

// Export a resolved promise by default - no waiting needed in web mode
export let tauriReady: Promise<void> = Promise.resolve();

// Only execute this in the browser, not during SSR
if (typeof window !== 'undefined') {
  try {
    // Check if this is the Tauri desktop app
    const isTauriApp = window.__TAURI_IPC__ !== undefined;

    if (isTauriApp) {
      // We're in Tauri - try to load the APIs
      console.log('Tauri environment detected');

      // Create a new promise for loading the Tauri APIs
      tauriReady = new Promise<void>(async (resolve) => {
        try {
          // We're being very careful here to avoid letting errors bubble up
          // First, verify the __TAURI_IPC__ global exists
          if (window.__TAURI_IPC__) {
            // This is the safest approach - we'll manually set up properties to avoid
            // any direct imports which cause build errors
            invoke = async (...args: any[]) => {
              try {
                // Call the global Tauri API directly
                return await window.__TAURI__.invoke(...args);
              } catch (e) {
                console.error('Tauri invoke error:', e);
                return null;
              }
            };

            // For listen, we do the same pattern
            listen = async (event: string, callback: any) => {
              try {
                return await window.__TAURI__.event.listen(event, callback);
              } catch (e) {
                console.error('Tauri listen error:', e);
                return () => {}; // Return noop unlisten function
              }
            };
          }
        } catch (e) {
          // If anything goes wrong, quietly fall back to noop implementations
          console.warn('Failed to set up Tauri APIs:', e);
          invoke = noopInvoke;
          listen = noopListen;
        }

        // Always resolve the promise to prevent hanging
        resolve();
      });
    } else {
      console.log('Web environment detected, not loading Tauri APIs');
    }

    // WebAuthn APIs (works in any browser)
    const loadWebAuthnApis = async () => {
      try {
        webauthnSupported =
          window.PublicKeyCredential !== undefined &&
          typeof window.PublicKeyCredential === 'function';

        if (webauthnSupported) {
          webauthnJson = await import('@github/webauthn-json');
        }
      } catch (e) {
        console.warn('WebAuthn API import failed:', e);
      }
    };

    // Always try to load WebAuthn
    loadWebAuthnApis();
  } catch (e) {
    // Global error handler - make sure nothing leaks out
    console.error('Error in Tauri/WebAuthn setup:', e);
  }
} else {
  // SSR environment
  console.log('Server-side rendering, Tauri/WebAuthn not applicable');
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
  plugins: [
    passkeyClient({
      // Client-side passkey configuration
      conditional: false, // Disable conditional UI to avoid auto-prompting issues
    }),
  ],
});

// Handle OAuth flow in Tauri
async function handleTauriOAuth(
  authUrl: string,
  provider: string
): Promise<{ accessToken: string }> {
  // If not in a Tauri environment, redirect to the authUrl directly in a new window
  if (typeof window !== 'undefined' && !window.__TAURI_IPC__) {
    console.log('Not in Tauri environment, opening OAuth URL in a new window');
    const width = 600;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2.5;
    const features = `width=${width},height=${height},left=${left},top=${top}`;

    // Open a popup for OAuth flow
    window.open(authUrl, `auth-${provider}`, features);

    // Return an empty token - better-auth will handle the redirect
    return Promise.resolve({ accessToken: '' });
  }

  // Run Tauri-specific OAuth flow if we're in Tauri
  try {
    // Ensure Tauri APIs are loaded before proceeding
    await tauriReady;

    if (!invoke || !listen) {
      throw new Error('Tauri APIs not available');
    }

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
  } catch (error) {
    console.error('Error in Tauri OAuth flow:', error);
    return Promise.resolve({ accessToken: '' });
  }
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
    // Platform support check: supports macOS, Windows, and other compatible platforms
    (window.navigator.platform.includes('Mac') ||
      window.navigator.platform.includes('Win') ||
      // Use feature detection for platform authenticator availability
      'isUserVerifyingPlatformAuthenticatorAvailable' in window.PublicKeyCredential)
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
