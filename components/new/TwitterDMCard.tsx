"use client"

import { useState } from "react"
import { MessageCircle, User, Clock, ExternalLink } from "lucide-react"
import { FaXTwitter } from "react-icons/fa6"

interface TwitterDMCardProps {
  message: {
    id: string
    content: string
    sender: {
      id: string
      name: string
      handle: string
      avatarUrl?: string
      verified?: boolean
    }
    timestamp: string
    isRead: boolean
    url: string
    attachments?: Array<{
      type: 'image' | 'video' | 'link'
      url: string
      previewUrl?: string
    }>
  }
}

const TwitterDMCard = ({ message }: TwitterDMCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  // Format time (e.g. "2h ago")
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 60) {
      return `${diffMins}m`
    }
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) {
      return `${diffHours}h`
    }
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) {
      return `${diffDays}d`
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Truncate message content if too long
  const truncateMessage = (content: string, maxLength = 120) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div
      className="backdrop-blur-sm bg-white/95 dark:bg-[#131316]/95 rounded-[14px] shadow-[0px_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0px_8px_40px_rgba(0,0,0,0.35)] border border-black/[0.04] dark:border-white/[0.06] backdrop-filter overflow-hidden transition-colors duration-200 relative
      before:absolute before:inset-0 before:rounded-[14px] before:border before:border-white/[0.12] dark:before:border-white/[0.04] before:z-[-1]
      after:absolute after:inset-0 after:rounded-[14px] after:bg-[url('/noise-light.png')] after:opacity-[0.03] after:z-[-1] dark:after:opacity-[0.07]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col relative">
        <div className={`${
          message.isRead 
            ? "bg-gradient-to-r from-gray-100/40 to-transparent dark:from-gray-800/30 dark:to-transparent border-l-2 border-gray-300/50 dark:border-gray-600/30"
            : "bg-gradient-to-r from-blue-400/10 to-transparent dark:from-blue-900/30 dark:to-transparent border-l-2 border-blue-400/50 dark:border-blue-400/30"
        }`}>
          <div className="p-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {message.sender.avatarUrl ? (
                  <img 
                    src={message.sender.avatarUrl} 
                    alt={message.sender.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                    <FaXTwitter className="text-white w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center w-[85%]">
                    <p className="text-[15px] font-medium text-gray-900 dark:text-white">
                      {message.sender.name}
                      {message.sender.verified && (
                        <span className="ml-1 text-blue-400">✓</span>
                      )}
                    </p>
                    <span className="ml-1 text-gray-500 dark:text-gray-400 text-[13px]">
                      @{message.sender.handle}
                    </span>
                  </div>

                  {isHovered && (
                    <a 
                      href={message.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600 dark:text-white/50 dark:hover:text-white/80 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <div className="mt-1 text-[14px] text-gray-700 dark:text-gray-300">
                  {truncateMessage(message.content)}
                </div>

                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 flex items-center text-[12px] text-blue-400">
                    <span>
                      {message.attachments.length} {message.attachments.length === 1 ? 'attachment' : 'attachments'}
                    </span>
                  </div>
                )}

                <div className="flex items-center mt-2 text-[12px]">
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    <span>Direct Message</span>
                  </div>
                  <span className="mx-1 text-gray-400 dark:text-gray-500">•</span>
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    <span>{formatTime(message.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TwitterDMCard 