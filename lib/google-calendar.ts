import { calendar_v3, calendar } from '@googleapis/calendar';
import { OAuth2Client } from 'google-auth-library';
import { accounts } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { db } from './db';

// Types for calendar events
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  status: string;
}

// Function to check if a user has Google Calendar connected
export async function hasGoogleCalendarAccess(userId: string): Promise<{ success: boolean; hasAccess: boolean; details: { hasAccount: boolean; hasAccessToken: boolean; hasRefreshToken: boolean }; error?: string }> {
  try {
    const account = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, userId),
        eq(accounts.providerId, 'google')
      )
    });

    return {
      success: true,
      hasAccess: !!account && !!account.accessToken && !!account.refreshToken,
      details: {
        hasAccount: !!account,
        hasAccessToken: !!account?.accessToken,
        hasRefreshToken: !!account?.refreshToken
      }
    };
  } catch (error) {
    console.error('Error checking Google Calendar access:', error);
    return {
      success: false,
      hasAccess: false,
      details: {
        hasAccount: false,
        hasAccessToken: false,
        hasRefreshToken: false
      },
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Function to get Google Calendar client
async function getGoogleCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.userId, userId),
      eq(accounts.providerId, 'google')
    )
  });

  if (!account?.accessToken) {
    console.log('No access token found for user:', userId);
    return null;
  }

  if (!account?.refreshToken) {
    console.log('No refresh token found for user:', userId);
    return null;
  }

  const auth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  auth.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.accessTokenExpiresAt?.getTime() || undefined
  });

  return calendar({ version: 'v3', auth });
}

// Function to get calendar events for a specific time range
export async function getCalendarEvents(
  userId: string,
  timeMin: Date,
  timeMax: Date,
  maxResults: number = 10
): Promise<CalendarEvent[]> {
  const calendar = await getGoogleCalendarClient(userId);
  
  if (!calendar) {
    const access = await hasGoogleCalendarAccess(userId);
    throw new Error(`Google Calendar not connected. Details: ${JSON.stringify(access.details)}`);
  }

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items as CalendarEvent[];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
} 