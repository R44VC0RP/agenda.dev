"use client"

import { useState, useMemo } from "react"
import { Calendar, Clock, MapPin, User, Users, ExternalLink, CheckCircle, HelpCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import DOMPurify from "dompurify"

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
    conferenceData?: {
      entryPoints?: Array<{
        entryPointType?: string
        uri?: string
        label?: string
      }>
      conferenceSolution?: {
        key?: {
          type?: string
        }
        name?: string
        iconUri?: string
      }
      conferenceId?: string
    }
  }
}

// Helper function to get time color based on how soon the event is
const getTimeColor = (dateStr: string) => {
  const eventDate = new Date(dateStr);
  const now = new Date();
  const diffHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return "text-red-500 dark:text-red-400"; // Past or current event
  } else if (diffHours <= 6) {
    return "text-yellow-600 dark:text-yellow-400"; // Very soon
  } else if (diffHours <= 24) {
    return "text-yellow-500 dark:text-yellow-300"; // Within 24 hours
  } else if (diffHours <= 72) {
    return "text-green-500 dark:text-green-400"; // Within 3 days
  } else {
    return "text-green-600 dark:text-green-500"; // More than 3 days
  }
};

// Helper function to get status style based on how soon the event is
const getStatusStyle = (dateStr: string) => {
  const eventDate = new Date(dateStr);
  const now = new Date();
  const diffHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return "bg-gradient-to-r from-red-500/10 to-transparent dark:from-red-950/30 dark:to-transparent border-l-2 border-red-500/50 dark:border-red-500/30";
  } else if (diffHours <= 6) {
    return "bg-gradient-to-r from-yellow-500/10 to-transparent dark:from-yellow-900/30 dark:to-transparent border-l-2 border-yellow-500/40 dark:border-yellow-500/30";
  } else if (diffHours <= 24) {
    return "bg-gradient-to-r from-yellow-400/10 to-transparent dark:from-yellow-800/30 dark:to-transparent border-l-2 border-yellow-400/40 dark:border-yellow-400/20";
  } else if (diffHours <= 72) {
    return "bg-gradient-to-r from-green-400/10 to-transparent dark:from-green-900/30 dark:to-transparent border-l-2 border-green-400/40 dark:border-green-400/20";
  } else {
    return "bg-gradient-to-r from-green-500/10 to-transparent dark:from-green-950/30 dark:to-transparent border-l-2 border-green-500/30 dark:border-green-500/20";
  }
};

// Helper function to get button color based on event timing
const getButtonStyle = (dateStr: string) => {
  const eventDate = new Date(dateStr);
  const now = new Date();
  const diffHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return {
      base: "bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_12px_rgba(239,68,68,0.2)]",
      hover: "hover:shadow-[0_0_16px_rgba(239,68,68,0.35)] hover:translate-y-[-1px] hover:from-red-400 hover:to-red-600",
      active: "active:shadow-[0_0_8px_rgba(239,68,68,0.3)] active:translate-y-[1px] active:from-red-600 active:to-red-700"
    };
  } else if (diffHours <= 6) {
    return {
      base: "bg-gradient-to-b from-yellow-500 to-yellow-600 shadow-[0_0_12px_rgba(234,179,8,0.2)]",
      hover: "hover:shadow-[0_0_16px_rgba(234,179,8,0.35)] hover:translate-y-[-1px] hover:from-yellow-400 hover:to-yellow-600",
      active: "active:shadow-[0_0_8px_rgba(234,179,8,0.3)] active:translate-y-[1px] active:from-yellow-600 active:to-yellow-700"
    };
  } else if (diffHours <= 24) {
    return {
      base: "bg-gradient-to-b from-yellow-400 to-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.2)]",
      hover: "hover:shadow-[0_0_16px_rgba(234,179,8,0.35)] hover:translate-y-[-1px] hover:from-yellow-300 hover:to-yellow-500",
      active: "active:shadow-[0_0_8px_rgba(234,179,8,0.3)] active:translate-y-[1px] active:from-yellow-500 active:to-yellow-600"
    };
  } else if (diffHours <= 72) {
    return {
      base: "bg-gradient-to-b from-green-500 to-green-600 shadow-[0_0_12px_rgba(34,197,94,0.2)]",
      hover: "hover:shadow-[0_0_16px_rgba(34,197,94,0.35)] hover:translate-y-[-1px] hover:from-green-400 hover:to-green-600",
      active: "active:shadow-[0_0_8px_rgba(34,197,94,0.3)] active:translate-y-[1px] active:from-green-600 active:to-green-700"
    };
  } else {
    return {
      base: "bg-gradient-to-b from-green-600 to-green-700 shadow-[0_0_12px_rgba(22,163,74,0.2)]",
      hover: "hover:shadow-[0_0_16px_rgba(22,163,74,0.35)] hover:translate-y-[-1px] hover:from-green-500 hover:to-green-700",
      active: "active:shadow-[0_0_8px_rgba(22,163,74,0.3)] active:translate-y-[1px] active:from-green-700 active:to-green-800"
    };
  }
};

const GoogleCalendarCard = ({ event }: GoogleCalendarCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Determine join link (prioritize hangoutLink for Google Meet)
  const joinUrl = event.hangoutLink

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

  console.log(event)

  return (
    <div
      className="group relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`backdrop-blur-sm bg-white/95 dark:bg-[#131316]/95 rounded-[14px] shadow-[0px_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0px_8px_40px_rgba(0,0,0,0.35)] border border-black/[0.04] dark:border-white/[0.06] backdrop-filter overflow-hidden transition-colors duration-200 relative
      before:absolute before:inset-0 before:rounded-[14px] before:border before:border-white/[0.12] dark:before:border-white/[0.04] before:z-[-1]
      after:absolute after:inset-0 after:rounded-[14px] after:bg-[url('/noise-light.png')] after:opacity-[0.03] after:z-[-1] dark:after:opacity-[0.07]`}
      >
        <div className={`${getStatusStyle(event.startTime)}`}>
          <div className="p-4">
          <div className="flex flex-col gap-1">
            {/* Event title */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 flex items-center">
                <h3 className="text-[15px] font-medium text-gray-900 dark:text-white truncate">
                  {event.title}
                </h3>
              </div>
              {isHovered && (
                <a 
                  href={event.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 dark:text-white/50 dark:hover:text-white/80 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Time and duration */}
            <div className="flex items-center mt-1 text-[13px] text-gray-700 dark:text-gray-300">
              <Clock className="w-3.5 h-3.5 mr-1 text-gray-500 dark:text-gray-400" />
              <span className={getTimeColor(event.startTime)}>{formatTimeRange(event.startTime, event.endTime)}</span>
              <span className="mx-1.5 text-gray-400 dark:text-gray-500">•</span>
              <span className="text-gray-500 dark:text-gray-400">{formatDuration()}</span>
              {event.isRecurring && (
                <span className="ml-1 text-[#7c5aff] dark:text-[#7c5aff] font-medium">↻</span>
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
              <div 
                className="mt-2 text-[13px] text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{ 
                  __html: useMemo(
                    () => DOMPurify.sanitize(event.description || '', {
                      USE_PROFILES: { html: true },
                      ALLOWED_TAGS: [
                        'a', 'b', 'br', 'div', 'em', 'i', 'li', 'ol', 'p', 'span',
                        'strong', 'u', 'ul', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
                      ],
                      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
                    }),
                    [event.description]
                  )
                }}
              />
            )}
            
            {/* Join meeting button - only shown for Google Meet links */}
            {event.hangoutLink && (
              <div className="mt-3">
                <Button 
                  asChild 
                  className={`h-8 text-[13px] transition-all duration-300 ease-in-out text-white scale-100 
                  ${getButtonStyle(event.startTime).base} 
                  ${getButtonStyle(event.startTime).hover} 
                  ${getButtonStyle(event.startTime).active}`}
                >
                  <a
                    href={event.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover:scale-110 group-active:scale-95" />
                    Join Google Meet
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
                <div className="text-xs text-[#7c5aff] dark:text-[#7c5aff] font-medium hover:text-[#8f71ff] dark:hover:text-[#8f71ff] transition-colors drop-shadow-[0_0_5px_rgba(124,90,255,0.3)]">
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
                        <span className="truncate max-w-[180px]">{attendee.name}</span>
                      </div>
                      <div className="flex-shrink-0">
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