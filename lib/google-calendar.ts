import { calendar_v3, calendar } from '@googleapis/calendar';
import { OAuth2Client } from 'google-auth-library';
import { auth } from './auth';

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
export async function hasGoogleCalendarAccess(userId: string): Promise<{ success: boolean; hasAccess: boolean; error?: string }> {
  try {
    const token = await auth.api.getAccessToken({
      body: {
        providerId: 'google',
        userId
      }
    });

    return {
      success: true,
      hasAccess: !!token.accessToken
    };
  } catch (error) {
    console.error('Error checking Google Calendar access:', error);
    return {
      success: false,
      hasAccess: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Function to get Google Calendar client
async function getGoogleCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
  try {
    const token = await auth.api.getAccessToken({
      body: {
        providerId: 'google',
        userId
      }
    });

    if (!token.accessToken) {
      console.log('No access token found for user:', userId);
      return null;
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: token.accessToken
    });

    return calendar({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error('Error getting Google Calendar client:', error);
    return null;
  }
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
    throw new Error(`Google Calendar not connected. Access status: ${access.hasAccess}`);
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

return (response.data.items ?? []) as CalendarEvent[];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
} 