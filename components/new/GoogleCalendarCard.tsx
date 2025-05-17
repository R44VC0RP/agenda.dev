"use client"

import { useState } from "react"
import { Calendar, Clock, MapPin, User, Users, ExternalLink, CheckCircle, HelpCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
    hangoutLink?: string
    isRecurring?: boolean
  }
}

const GoogleCalendarCard = ({ event }: GoogleCalendarCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Determine join link (prefer hangoutLink)
  const joinUrl = event.hangoutLink ?? event.url

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
      className="group relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "relative w-full rounded-lg overflow-hidden transition-all duration-200",
          "bg-white dark:bg-gray-900 shadow-sm",
          "hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20",
          "border border-gray-200/80 dark:border-white/[0.05]",
          isHovered && "ring-1 ring-black/5 dark:ring-white/10"
        )}
      >
        <div className="p-4">
          <div className="flex flex-col gap-1">
            {/* Event title */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-medium text-gray-900 dark:text-white truncate">
                  {event.title}
                </h3>
              </div>
            </div>

            {/* Time and duration */}
            <div className="flex items-center text-[13px] text-gray-700 dark:text-gray-300">
              <Clock className="w-3.5 h-3.5 mr-1 text-gray-500 dark:text-gray-400" />
              <span>{formatTimeRange(event.startTime, event.endTime)}</span>
              <span className="mx-1.5 text-gray-400 dark:text-gray-500">•</span>
              <span className="text-gray-500 dark:text-gray-400">{formatDuration()}</span>
              {event.isRecurring && (
                <span className="ml-1 text-blue-500 dark:text-blue-400 font-medium">↻</span>
              )}
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center text-[13px] text-gray-700 dark:text-gray-300">
                <MapPin className="w-3.5 h-3.5 mr-1 text-gray-500 dark:text-gray-400" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            
            {/* Description */}
            {event.description && (
              <p className="mt-2 text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {event.description}
              </p>
            )}
            
            {/* Join meeting button */}
            {joinUrl && (
              <div className="mt-3">
                <Button 
                  asChild 
                  className="h-8 text-[13px] bg-gradient-to-b from-blue-500 to-blue-600 hover:to-blue-700 transition-all duration-200"
                >
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Join Meeting
                  </a>
                </Button>
              </div>
            )}

            {/* Attendees section */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setShowDetails(!showDetails)}
              >
                <div className="flex items-center text-[13px] text-gray-700 dark:text-gray-300">
                  <Users className="w-3.5 h-3.5 mr-1 text-gray-500 dark:text-gray-400" />
                  <span>{acceptedCount}/{totalCount} attending</span>
                </div>
                <div className="text-xs text-blue-500 dark:text-blue-400 font-medium hover:text-blue-600 dark:hover:text-blue-300 transition-colors">
                  {showDetails ? "Hide details" : "Show details"}
                </div>
              </div>
              
              {/* Attendee details */}
              {showDetails && (
                <div className="mt-2 space-y-2 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                  {event.attendees.map((attendee, index) => (
                    <div key={index} className="flex items-center justify-between text-[12px] text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-400 border border-gray-200/80 dark:border-white/[0.05]">
                          {attendee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[180px]">{attendee.name}</span>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusIcon(attendee.responseStatus)}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-400 mt-1 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
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
  )
}

export default GoogleCalendarCard