"use client"

import { useState } from "react"
import { AlertCircle, MessageSquare, User, ExternalLink, Tag, Github } from "lucide-react"

interface GithubIssueCardProps {
  issue: {
    id: string
    title: string
    number: number
    state: 'open' | 'closed'
    repository: string
    url: string
    createdAt: string
    updatedAt: string
    author: {
      login: string
      avatarUrl?: string
    }
    labels: Array<{
      name: string
      color: string
    }>
    comments: number
  }
}

const GithubIssueCard = ({ issue }: GithubIssueCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  // Format date to relative time (e.g. "2 days ago")
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
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
        <div className="bg-gradient-to-r from-blue-500/10 to-transparent dark:from-blue-900/30 dark:to-transparent border-l-2 border-blue-500/50 dark:border-blue-500/30">
          <div className="p-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <Github className="w-5 h-5 text-blue-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center w-[85%]">
                    <p className="text-[15px] font-medium text-gray-900 dark:text-white">
                      {issue.title}
                    </p>
                  </div>

                  {isHovered && (
                    <a 
                      href={issue.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600 dark:text-white/50 dark:hover:text-white/80 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <div className="flex items-center mt-1 text-[13px] space-x-2">
                  <span className="text-gray-500 dark:text-gray-400">
                    {issue.repository} #{issue.number}
                  </span>
                  
                  <span className="text-gray-400 dark:text-gray-500">•</span>
                  
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatDate(issue.updatedAt)}
                  </span>

                  {issue.comments > 0 && (
                    <>
                      <span className="text-gray-400 dark:text-gray-500">•</span>
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        <span>{issue.comments}</span>
                      </div>
                    </>
                  )}
                </div>

                {issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {issue.labels.map((label) => (
                      <div 
                        key={label.name}
                        className="px-2 py-0.5 text-xs rounded-full flex items-center"
                        style={{ 
                          backgroundColor: `#${label.color}33`,
                          color: `#${label.color}` 
                        }}
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {label.name}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center mt-2 text-[13px]">
                  <div className="flex items-center">
                    <User className="w-3.5 h-3.5 mr-1 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400">{issue.author.login}</span>
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

export default GithubIssueCard 