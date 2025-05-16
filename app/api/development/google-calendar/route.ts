import { NextResponse } from 'next/server'
import { calendar } from '@googleapis/calendar'
import { OAuth2Client } from 'google-auth-library'
import { auth } from '@/lib/auth'
import { cookies } from 'next/headers'

interface GoogleAccount {
  provider: string
  access_token: string
  refresh_token: string
  expires_at?: string
}

// Ensure this route only works in development
const isDevelopment = process.env.NODE_ENV === 'development'

// Initialize Google Calendar client with tokens
const initializeCalendarClient = async () => {
  // Get the current session
  const session = await auth.handler(new Request('http://localhost', {
    headers: {
      cookie: cookies().toString()
    }
  }))
  console.log('session', session)
  const sessionData = await session.json()
  if (!sessionData?.user) {
    throw new Error('Not authenticated')
  }

  // Get the user's Google account from session
  const googleAccount = sessionData.user.accounts?.find((account: GoogleAccount) => account.provider === 'google')
  if (!googleAccount) {
    throw new Error('No Google account linked')
  }

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  // Set credentials from the account
  oauth2Client.setCredentials({
    access_token: googleAccount.access_token,
    refresh_token: googleAccount.refresh_token,
    expiry_date: googleAccount.expires_at ? new Date(googleAccount.expires_at).getTime() : undefined
  })

  return calendar({
    version: 'v3',
    auth: oauth2Client
  })
}

export async function GET(request: Request) {
  if (!isDevelopment) {
    return new NextResponse('Not available in production', { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'today'

  try {
    const calendarClient = await initializeCalendarClient()
    
    // Calculate time range based on period
    const now = new Date()
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let timeMax = new Date(timeMin)

    switch (period) {
      case 'today':
        timeMax.setDate(timeMin.getDate() + 1)
        break
      case 'week':
        timeMax.setDate(timeMin.getDate() + 7)
        break
      case 'month':
        timeMax.setMonth(timeMin.getMonth() + 1)
        break
      default:
        timeMax.setDate(timeMin.getDate() + 1) // Default to today
    }

    const response = await calendarClient.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    })

    return NextResponse.json({
      status: 'ok',
      events: response.data.items || []
    })
  } catch (error) {
    console.error('Failed to fetch calendar events:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch calendar events'
    return new NextResponse(
      errorMessage,
      { status: errorMessage.includes('Not authenticated') ? 401 : 500 }
    )
  }
}

export async function POST(request: Request) {
  if (!isDevelopment) {
    return new NextResponse('Not available in production', { status: 403 })
  }

  try {
    const body = await request.json()
    const calendar = await initializeCalendarClient()

    switch (body.action) {
      case 'list_calendars':
        const calendars = await calendar.calendarList.list()
        return NextResponse.json({
          status: 'success',
          data: calendars.data
        })

      case 'list_events':
        const { calendarId = 'primary', timeMin, timeMax } = body
        const events = await calendar.events.list({
          calendarId,
          timeMin: timeMin || new Date().toISOString(),
          timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime'
        })
        return NextResponse.json({
          status: 'success',
          data: events.data
        })

      default:
        return NextResponse.json({
          status: 'error',
          message: 'Unknown action'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Google Calendar operation failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Operation failed'
    return NextResponse.json({
      status: 'error',
      message: errorMessage,
      error: error instanceof Error ? error.stack : undefined
    }, { status: errorMessage.includes('Not authenticated') ? 401 : 500 })
  }
} 