import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { passkey } from 'better-auth/plugins/passkey';
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
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
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
  plugins: [
    passkey({
      // Global passkey settings
      relyingPartyName: 'Agenda',
      relyingPartyId: 'localhost',
      // Disable conditional UI to avoid auto-prompting issues
      conditional: false,
      // Enable passkeys for all providers
      providers: ['github', 'google'],
      // Configure cross-device authentication - but don't specify attachment
      authenticatorSelection: {
        // Ensure user verification for security
        userVerification: 'preferred',
        // Allow for multi-device credentials
        residentKey: 'preferred',
      },
    }),
  ],
});
