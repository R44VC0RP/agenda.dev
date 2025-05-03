import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as schema from './db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET is not set');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Google OAuth credentials are not set');
}

if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  throw new Error('GitHub OAuth credentials are not set');
}

if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
  throw new Error('Twitter OAuth credentials are not set');
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true, // This will automatically map tables to their plural form (e.g., user -> users)
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Enable passkey support for Google
      passkeys: {
        enabled: true,
        // Use "conditional UI" to check for passkeys first
        conditional: true,
      },
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      // Enable passkey support for GitHub
      passkeys: {
        enabled: true,
        // Use "conditional UI" to check for passkeys first
        conditional: true,
      },
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: {
      enabled: false,
    },
  },
  passkeys: {
    // Global passkey settings
    enabled: true,
    relyingPartyName: 'Agenda',
    relyingPartyId: process.env.NEXT_PUBLIC_APP_URL || 'https://agenda.dev',
  },
});
