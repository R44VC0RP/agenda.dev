import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_BASE_URL,
});

// Export commonly used methods
export const { signIn, signUp, useSession, signOut } = authClient;
