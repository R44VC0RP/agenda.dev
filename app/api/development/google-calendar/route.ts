import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCalendarEvents } from '@/lib/google-calendar'
import { cookies } from 'next/headers'



// Ensure this route only works in development
const isDevelopment = process.env.NODE_ENV === 'development'

export async function GET(request: Request) {
  if (!isDevelopment) {
    return new NextResponse('Not available in production', { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'today'

  try {
    const session = await auth.api.getSession(request)
    const userId = session?.user.id
    
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

    const events = await getCalendarEvents(userId!, timeMin, timeMax, 50)
    console.log(events)

    return NextResponse.json({
      status: 'ok',
      events
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
    const session = await auth.api.getSession(request)
    const userId = session?.user.id
    const body = await request.json()

    switch (body.action) {
      case 'list_events':
        const { timeMin, timeMax } = body
        const startTime = timeMin ? new Date(timeMin) : new Date()
        const endTime = timeMax ? new Date(timeMax) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        
        const events = await getCalendarEvents(userId!, startTime, endTime, 10)
        console.log(events)
        return NextResponse.json({
          status: 'success',
          data: events
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