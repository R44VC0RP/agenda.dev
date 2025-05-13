"use client"

import { useState } from "react"
import { ExternalLink, MessageSquare, Clock, Hash } from "lucide-react"
import { FaSlack } from "react-icons/fa6"

interface SlackMessageCardProps {
  message: {
    id: string
    content: string
    sender: {
      name: string
      avatar?: string
    }
    channel: {
      name: string
      isPrivate: boolean
    }
    timestamp: string
    url: string
    threadCount?: number
    reactions?: Array<{
      emoji: string
      count: number
    }>
    attachments?: Array<{
      type: 'image' | 'file'
      name: string
      url: string
    }>
  }
}

const SlackMessageCard = ({ message }: SlackMessageCardProps) => {
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
        <div className="bg-gradient-to-r from-[#4A154B]/10 to-transparent dark:from-[#4A154B]/30 dark:to-transparent border-l-2 border-[#4A154B]/50 dark:border-[#4A154B]/30">
          <div className="p-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {message.sender.avatar ? (
                  <img 
                    src={message.sender.avatar} 
                    alt={message.sender.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#4A154B] flex items-center justify-center">
                    <FaSlack className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center w-[85%]">
                    <p className="text-[15px] font-medium text-gray-900 dark:text-white">
                      {message.sender.name}
                    </p>
                    <span className="ml-2 flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400">
                      <Hash className="w-3.5 h-3.5" />
                      {message.channel.name}
                      {message.channel.isPrivate && (
                        <span className="text-[11px] bg-gray-100 dark:bg-white/10 rounded px-1">private</span>
                      )}
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
                  <div className="mt-2 flex items-center gap-2">
                    {message.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                      >
                        <span>{attachment.name}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-3 text-[12px]">
                  {message.threadCount && message.threadCount > 0 && (
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <MessageSquare className="w-3.5 h-3.5 mr-1" />
                      <span>{message.threadCount} replies</span>
                    </div>
                  )}
                  
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex items-center gap-1">
                      {message.reactions.map((reaction, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-[11px] text-gray-700 dark:text-gray-300"
                        >
                          {reaction.emoji} {reaction.count}
                        </span>
                      ))}
                    </div>
                  )}

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

export default SlackMessageCard 