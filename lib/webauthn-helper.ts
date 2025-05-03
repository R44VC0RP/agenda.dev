import { create, get } from '@github/webauthn-json';

// Define error types for WebAuthn operations
export enum WebAuthnErrorType {
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  PLATFORM_NOT_SUPPORTED = 'PLATFORM_NOT_SUPPORTED',
  CONDITIONAL_UI_NOT_SUPPORTED = 'CONDITIONAL_UI_NOT_SUPPORTED',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  USER_CANCELLED = 'USER_CANCELLED',
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Custom error class for WebAuthn operations
export class WebAuthnError extends Error {
  type: WebAuthnErrorType;
  originalError?: Error;

  constructor(message: string, type: WebAuthnErrorType, originalError?: Error) {
    super(message);
    this.name = 'WebAuthnError';
    this.type = type;
    this.originalError = originalError;
  }
}

/**
 * WebAuthn helper utility to handle passkey authentication directly
 * for social providers like Google and GitHub
 */
export const WebAuthnHelper = {
  /**
   * Centralized error handler for WebAuthn operations
   */
  handleError(error: any, operation: string): WebAuthnError {
    // User cancellation (DOMException with specific names)
    if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
      return new WebAuthnError(
        `User cancelled the ${operation} operation`,
        WebAuthnErrorType.USER_CANCELLED,
        error
      );
    }

    // Timeout error
    if (error.name === 'TimeoutError') {
      return new WebAuthnError(
        `The ${operation} operation timed out`,
        WebAuthnErrorType.OPERATION_TIMEOUT,
        error
      );
    }

    // Handle other known error types based on error message or name
    if (
      error.message?.includes('browser not supported') ||
      error.message?.includes('navigator.credentials')
    ) {
      return new WebAuthnError(
        'WebAuthn is not supported in this browser',
        WebAuthnErrorType.BROWSER_NOT_SUPPORTED,
        error
      );
    }

    // Default to unknown error with the original message
    return new WebAuthnError(
      `${operation} failed: ${error.message || 'Unknown error'}`,
      WebAuthnErrorType.UNKNOWN_ERROR,
      error
    );
  },
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
  async register(options: PublicKeyCredentialCreationOptions): Promise<any> {
    try {
      return await create(options);
    } catch (error) {
      // Use centralized error handling
      const webAuthnError = this.handleError(error, 'Registration');

      // Log the error with proper type information
      console.error(`WebAuthn registration error [${webAuthnError.type}]:`, webAuthnError.message);

      // Throw the well-structured error
      throw webAuthnError;
    }
  },

  /**
   * Authenticate with a passkey
   */
  async authenticate(options: PublicKeyCredentialRequestOptions): Promise<any> {
    try {
      return await get(options);
    } catch (error) {
      // Use centralized error handling
      const webAuthnError = this.handleError(error, 'Authentication');

      // Log the error with proper type information
      console.error(
        `WebAuthn authentication error [${webAuthnError.type}]:`,
        webAuthnError.message
      );

      // Throw the well-structured error
      throw webAuthnError;
    }
  },

  /**
   * Prepare options for Google authentication
   * @returns PublicKeyCredentialRequestOptions for WebAuthn authentication
   */
  prepareGoogleAuthOptions(): PublicKeyCredentialRequestOptions {
    // Create options for Google passkey authentication
    return {
      challenge: this.randomChallenge(),
      rpId: window.location.hostname,
      userVerification: 'preferred',
      timeout: 60000,
      allowCredentials: [],
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
   * Compatible with both browser and Node.js environments
   */
  base64urlEncode(bytes: Uint8Array): string {
    let base64;

    // Check if we're in a browser or Node.js environment
    if (typeof btoa === 'function') {
      // Browser environment
      base64 = btoa(String.fromCharCode(...bytes));
    } else {
      // Node.js environment
      base64 = Buffer.from(bytes).toString('base64');
    }

    // Convert base64 to base64url format
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },

  /**
   * TODO: Add unit/E2E tests for WebAuthn operations
   *
   * Tests should be implemented using Playwright with virtual authenticators to cover:
   * 1. Successful registration flow
   * 2. Successful authentication flow
   * 3. Error handling for various failure cases (user cancellation, timeout, etc.)
   * 4. Browser compatibility checks
   * 5. Platform authenticator detection
   */
};
