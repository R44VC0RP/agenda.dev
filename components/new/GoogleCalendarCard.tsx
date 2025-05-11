"use client"

import { useState } from "react"
import { Calendar, Clock, MapPin, User, Users, ExternalLink, CheckCircle, HelpCircle, XCircle, AlertCircle } from "lucide-react"

interface GoogleCalendarCardProps {
  event: {
    id: string
    title: string
    description?: string
    location?: string
    startTime: string
    endTime: string
    organizer: string
    attendees: Array<{
      name: string
      email: string
      responseStatus?: 'accepted' | 'tentative' | 'declined' | 'needsAction'
    }>
    url: string
    isRecurring?: boolean
  }
}

const GoogleCalendarCard = ({ event }: GoogleCalendarCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Format time (e.g. "10:00 AM - 11:00 AM")
  const formatTimeRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    }
    
    // Check if event is within today
    const isToday = (date: Date) => {
      const today = new Date()
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear()
    }
    
    // Check if event is tomorrow
    const isTomorrow = (date: Date) => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return date.getDate() === tomorrow.getDate() &&
             date.getMonth() === tomorrow.getMonth() &&
             date.getFullYear() === tomorrow.getFullYear()
    }
    
    let startDateStr = formatDate(startDate)
    if (isToday(startDate)) startDateStr = 'Today'
    else if (isTomorrow(startDate)) startDateStr = 'Tomorrow'
    
    return `${startDateStr}, ${formatTime(startDate)} - ${formatTime(endDate)}`
  }

  // Calculate event duration in minutes
  const getEventDuration = () => {
    const startDate = new Date(event.startTime)
    const endDate = new Date(event.endTime)
    const durationMs = endDate.getTime() - startDate.getTime()
    return Math.round(durationMs / (1000 * 60))
  }
  
  // Format duration as human-readable text
  const formatDuration = () => {
    const minutes = getEventDuration()
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  // Get status icon based on response status
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />
      case 'tentative':
        return <HelpCircle className="w-3.5 h-3.5 text-yellow-500" />
      case 'declined':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
    }
  }
  
  // Limit number of attendees shown
  const displayAttendees = event.attendees.slice(0, 3)
  const additionalAttendees = Math.max(0, event.attendees.length - 3)

  // Calculate how many people accepted
  const acceptedCount = event.attendees.filter(a => a.responseStatus === 'accepted').length
  const totalCount = event.attendees.length

  return (
    <div
      className="backdrop-blur-sm bg-gradient-to-br from-blue-50/95 to-white/90 dark:from-blue-950/90 dark:to-[#131316]/95 rounded-[14px] shadow-[0px_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0px_8px_40px_rgba(0,0,0,0.35)] border border-black/[0.04] dark:border-white/[0.06] backdrop-filter overflow-hidden transition-colors duration-200 relative
      before:absolute before:inset-0 before:rounded-[14px] before:border before:border-white/[0.12] dark:before:border-white/[0.04] before:z-[-1]
      after:absolute after:inset-0 after:rounded-[14px] after:bg-[url('/noise-light.png')] after:opacity-[0.03] after:z-[-1] dark:after:opacity-[0.07]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col relative">
        <div className="border-l-2 border-blue-500 dark:border-blue-400">
          <div className="p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/40 rounded-full p-1.5">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Google Calendar
                  </span>
                </div>
                
                {isHovered && (
                  <a 
                    href={event.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 dark:text-white/50 dark:hover:text-white/80 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              <div className="mt-1">
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
                  {event.title}
                </h3>
                
                <div className="flex items-center mt-2 text-[13px] text-gray-700 dark:text-gray-300">
                  <Clock className="w-3.5 h-3.5 mr-1 text-gray-500 dark:text-gray-400" />
                  <span>{formatTimeRange(event.startTime, event.endTime)}</span>
                  <span className="mx-1.5 text-gray-400 dark:text-gray-500">•</span>
                  <span className="text-gray-500 dark:text-gray-400">{formatDuration()}</span>
                  {event.isRecurring && (
                    <span className="ml-1 text-blue-500 dark:text-blue-400 font-medium">↻</span>
                  )}
                </div>

                {event.location && (
                  <div className="flex items-center mt-1.5 text-[13px] text-gray-700 dark:text-gray-300">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-gray-500 dark:text-gray-400" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>

              <div 
                className="mt-1 border-t border-gray-100 dark:border-gray-800 pt-3"
                onClick={() => setShowDetails(!showDetails)}
              >
                {/* Attendee summary */}
                <div className="flex justify-between items-center cursor-pointer">
                  <div className="flex items-center text-[13px] text-gray-700 dark:text-gray-300">
                    <Users className="w-3.5 h-3.5 mr-1 text-gray-500 dark:text-gray-400" />
                    <span>{acceptedCount}/{totalCount} attending</span>
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {showDetails ? "Hide details" : "Show details"}
                  </div>
                </div>
                
                {/* Attendee details */}
                {showDetails && (
                  <div className="mt-2 space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                    {event.attendees.map((attendee, index) => (
                      <div key={index} className="flex items-center justify-between text-[12px] text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300">
                            {attendee.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[120px]">{attendee.name}</span>
                        </div>
                        <div>
                          {getStatusIcon(attendee.responseStatus)}
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-400 mt-1 pt-1 border-t border-gray-100 dark:border-gray-800/50">
                      <User className="w-3.5 h-3.5 mr-1" />
                      <span>Organized by {event.organizer}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GoogleCalendarCard 