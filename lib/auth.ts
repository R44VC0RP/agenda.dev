import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";
import Stripe from "stripe";
import { stripe } from "@better-auth/stripe";
import { mcp } from "better-auth/plugins"

// Calendar-specific scopes needed for testing
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.settings.readonly'
];

// If you are working on local development, comment out any of the auth methods that are not needed for local development.

// These checks are only for production environments.

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is not set");
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials are not set");
}

if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  throw new Error("GitHub OAuth credentials are not set");
}

if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
  throw new Error("Twitter OAuth credentials are not set");
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

if (!process.env.STRIPE_PRO_PRICE_ID) {
  throw new Error("STRIPE_PRO_PRICE_ID is not set");
}

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true, // This will automatically map tables to their plural form (e.g., user -> users)
    
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      prompt: 'consent',  // Force consent screen to appear
      accessType: 'offline', // Enable refresh token
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.events.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.settings.readonly'
      ],
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
    // twitter: {
    //   clientId: process.env.TWITTER_CLIENT_ID,
    //   clientSecret: process.env.TWITTER_CLIENT_SECRET,
    // },
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  plugins: [
    mcp({
      loginPage: "/"
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      onEvent: async (event: Stripe.Event): Promise<void> => {
        console.log(`[Stripe] Event received: ${event.type}`);
      },
      subscription: {
        enabled: true,
        // only paid plans go here; absence of subscription = "free"
        plans: [
          {
            name: "pro",
            priceId: process.env.STRIPE_PRO_PRICE_ID!,
            limits: { workspaces: 5 },
          }
        ],
        // onTrialStart: async (
        //   { subscription, user }: { subscription: any; user: any },
        //   request: Request
        // ): Promise<void> => {
        //   console.log(`[Stripe] Trial started for ${subscription.referenceId}`);
        // },
        // onTrialEnd: async (
        //   { subscription, user }: { subscription: any; user: any },
        //   request: Request
        // ): Promise<void> => {
        //   console.log(`[Stripe] Trial ended for ${subscription.referenceId}`);
        // },
        // onTrialExpired: async (
        //   subscription: any
        // ): Promise<void> => {
        //   console.log(`[Stripe] Trial expired for ${subscription.referenceId}`);
        // },
      }
    })
  ]
}); 