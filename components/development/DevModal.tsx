import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FaTools, FaCalendar, FaGoogle } from 'react-icons/fa'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from '@/lib/auth-client'
import { authClient } from "@/lib/auth-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"

interface DevSettings {
  environment: string
  googleCalendar: {
    clientId: string
    clientSecret: string
    redirectUri: string
  }
}

interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime?: string, date?: string }
  end: { dateTime?: string, date?: string }
}

interface Account {
  id: string
  provider: string
  accountId: string
  userId?: string
  createdAt: string | Date
  updatedAt: string | Date
  scopes?: string[]
}

export default function DevModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState<DevSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const { data: session } = useSession()
  
  // Account linking states
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchDevSettings()
      fetchLinkedAccounts()
    }
  }, [isOpen])

  const fetchLinkedAccounts = async () => {
    try {
      setIsLoadingAccounts(true)
      setAccountError(null)
      const response = await authClient.listAccounts()
      const accountsData = response.data
      setAccounts(Array.isArray(accountsData) ? accountsData : [])
    } catch (err) {
      console.error("Error fetching account info:", err)
      setAccountError("Failed to load account information")
    } finally {
      setIsLoadingAccounts(false)
    }
  }

  const handleLinkGoogle = async () => {
    setIsLinking(true)
    try {
      const { data, error: linkError } = await authClient.linkSocial({
        provider: 'google',
        callbackURL: window.location.href
      })
      if (linkError) throw linkError
      if (data?.url) window.location.href = data.url
    } catch (err: any) {
      console.error("Error linking Google account:", err)
      setAccountError(err.message || "Failed to link Google account")
    } finally {
      setIsLinking(false)
    }
  }

  const fetchDevSettings = async () => {
    try {
      const res = await fetch('/api/development')
      if (!res.ok) throw new Error('Failed to fetch dev settings')
      const data = await res.json()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching dev settings:', error)
    }
  }

  const fetchCalendarEvents = async (period: 'today' | 'week' | 'month') => {
    setLoading(true)
    setCalendarError(null)
    try {
      const res = await fetch(`/api/development/google-calendar?period=${period}`)
      if (!res.ok) {
        const error = await res.text()
        throw new Error(error)
      }
      const data = await res.json()
      setCalendarEvents(data.events)
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      setCalendarError(error instanceof Error ? error.message : 'Failed to fetch calendar events')
    } finally {
      setLoading(false)
    }
  }

  const formatEventDate = (event: CalendarEvent) => {
    const date = event.start.dateTime || event.start.date
    return date ? new Date(date).toLocaleString() : 'No date available'
  }

  const hasGoogleAccount = accounts.some(account => account.provider === 'google')

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 rounded-full bg-white dark:bg-[#131316] flex items-center gap-2"
        >
          <FaTools className="w-3 h-3" />
          <span className="text-sm">Dev Tools</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Development Tools</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-medium">Environment</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {settings?.environment || 'Loading...'}
              </p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-medium">Google Calendar Config</h3>
              <div className="space-y-1">
 <p className="text-sm">
   Client ID: <span className="text-gray-500 dark:text-gray-400">{settings?.googleCalendar?.clientId || 'Not configured'}</span>
 </p>
 <p className="text-sm">
   Client Secret: <span className="text-gray-500 dark:text-gray-400">{settings?.googleCalendar?.clientSecret || 'Not configured'}</span>
 </p>
 <p className="text-sm">
   Redirect URI: <span className="text-gray-500 dark:text-gray-400">{settings?.googleCalendar?.redirectUri || 'Not configured'}</span>
 </p>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-medium">Connected Accounts</h3>
              
              {accountError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{accountError}</AlertDescription>
                </Alert>
              )}

              {isLoadingAccounts ? (
                <div className="flex justify-center items-center h-12">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : accounts.length > 0 ? (
                <div className="space-y-2">
                  {accounts.map(account => (
                    <div key={account.id} className="flex items-center gap-2 py-2">
                      {account.provider === 'google' && <FaGoogle className="h-4 w-4 text-[#4285F4]" />}
                      <div>
                        <p className="text-sm font-medium">
                          {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)} Account
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Connected since {new Date(account.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2 text-sm text-muted-foreground">
                  No accounts connected
                </div>
              )}

              {!hasGoogleAccount && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    onClick={handleLinkGoogle}
                    disabled={isLinking}
                    className="w-full"
                  >
                    {isLinking ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FaGoogle className="h-4 w-4 mr-2" />
                    )}
                    {isLinking ? 'Connecting...' : 'Connect Google Account'}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            {!session?.user ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                Please sign in to test calendar features
              </div>
            ) : !hasGoogleAccount ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                Please connect your Google account to test calendar features
              </div>
            ) : (
              <>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fetchCalendarEvents('today')}
                    disabled={loading}
                  >
                    <FaCalendar className="w-3 h-3 mr-2" />
                    Today's Events
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fetchCalendarEvents('week')}
                    disabled={loading}
                  >
                    <FaCalendar className="w-3 h-3 mr-2" />
                    This Week
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fetchCalendarEvents('month')}
                    disabled={loading}
                  >
                    <FaCalendar className="w-3 h-3 mr-2" />
                    This Month
                  </Button>
                </div>

                {loading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                  </div>
                )}

                {calendarError && (
                  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4">
                    <p className="text-sm text-red-600 dark:text-red-400">{calendarError}</p>
                  </div>
                )}

                {!loading && !calendarError && calendarEvents.length > 0 && (
                  <div className="rounded-lg border p-4 space-y-2 max-h-[300px] overflow-y-auto">
                    {calendarEvents.map(event => (
                      <div key={event.id} className="border-b last:border-0 pb-2 last:pb-0">
                        <h4 className="font-medium">{event.summary}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatEventDate(event)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && !calendarError && calendarEvents.length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No events found
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 