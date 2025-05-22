import { NextResponse } from 'next/server'

// Ensure this route only works in development
const isDevelopment = process.env.NODE_ENV === 'development'

export async function GET() {
  if (!isDevelopment) {
    return new NextResponse('Not available in production', { status: 403 })
  }

  return NextResponse.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    googleCalendar: {
      clientId: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'missing',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'not configured'
    }
  })
}

export async function POST(request: Request) {
  if (!isDevelopment) {
    return new NextResponse('Not available in production', { status: 403 })
  }

  try {
    const body = await request.json()
    
    // Handle test actions
    switch (body.action) {
      case 'test_calendar_connection':
        // Test calendar connection using the dedicated endpoint
        const res = await fetch('http://localhost:3000/api/development/google-calendar')
        const data = await res.json()
        return NextResponse.json(data)
      
      default:
        return NextResponse.json({ status: 'error', message: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
} 