import { create, get } from '@github/webauthn-json';

/**
 * WebAuthn helper utility to handle passkey authentication directly
 * for social providers like Google and GitHub
 */
export const WebAuthnHelper = {
  /**
   * Detect if the browser supports WebAuthn/passkeys
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function'
    );
  },

  /**
   * Check if the browser supports platform authenticators (like Touch ID)
   */
  async isPlatformSupported(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      return await (
        window.PublicKeyCredential as any
      ).isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      console.warn('Error checking platform authenticator availability:', e);
      return false;
    }
  },

  /**
   * Check if the browser supports conditional UI (auto-prompting for passkeys)
   */
  async isConditionalUISupported(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      // Make sure the browser supports conditional UI
      return (
        'isConditionalMediationAvailable' in window.PublicKeyCredential &&
        (await (window.PublicKeyCredential as any).isConditionalMediationAvailable())
      );
    } catch (e) {
      console.warn('Error checking conditional UI availability:', e);
      return false;
    }
  },

  /**
   * Register a new passkey
   */
  async register(options: any): Promise<any> {
    try {
      return await create(options);
    } catch (error) {
      console.error('Error registering passkey:', error);
      throw error;
    }
  },

  /**
   * Authenticate with a passkey
   */
  async authenticate(options: any): Promise<any> {
    try {
      return await get(options);
    } catch (error) {
      console.error('Error authenticating with passkey:', error);
      throw error;
    }
  },

  /**
   * Prepare options for Google authentication
   */
  prepareGoogleAuthOptions(callbackURL: string): any {
    // Create options for Google passkey authentication
    return {
      challenge: this.randomChallenge(),
      rpId: window.location.hostname,
      userVerification: 'preferred',
      timeout: 60000,
      transports: ['internal', 'usb', 'nfc', 'ble'],
    };
  },

  /**
   * Generate a random challenge
   */
  randomChallenge(): Uint8Array {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return arr;
  },

  /**
   * Create a base64url string from bytes
   */
  base64urlEncode(bytes: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },
};
