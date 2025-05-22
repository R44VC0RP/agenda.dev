"use client"

import { useState } from "react"
import { GitPullRequest, MessageSquare, User, ExternalLink, Tag } from "lucide-react"

interface GithubPRCardProps {
  pr: {
    id: string
    title: string
    number: number
    state: 'open' | 'closed' | 'merged'
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
    additions: number
    deletions: number
  }
}

const GithubPRCard = ({ pr }: GithubPRCardProps) => {
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

  const getStateColor = (state: string) => {
    switch (state) {
      case 'open':
        return 'text-green-500'
      case 'closed':
        return 'text-red-500'
      case 'merged':
        return 'text-purple-500'
      default:
        return 'text-gray-500'
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
        <div className="bg-gradient-to-r from-purple-500/10 to-transparent dark:from-purple-900/30 dark:to-transparent border-l-2 border-purple-500/50 dark:border-purple-500/30">
          <div className="p-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <GitPullRequest className={`w-5 h-5 ${getStateColor(pr.state)}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center w-[85%]">
                    <p className="text-[15px] font-medium text-gray-900 dark:text-white">
                      {pr.title}
                    </p>
                  </div>

                  {isHovered && (
                    <a 
                      href={pr.url} 
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
                    {pr.repository} #{pr.number}
                  </span>
                  
                  <span className="text-gray-400 dark:text-gray-500">•</span>
                  
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatDate(pr.updatedAt)}
                  </span>

                  {pr.comments > 0 && (
                    <>
                      <span className="text-gray-400 dark:text-gray-500">•</span>
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        <span>{pr.comments}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Additions and Deletions stat */}
                <div className="flex items-center mt-2 text-xs">
                  <span className="text-green-500">+{pr.additions}</span>
                  <span className="mx-1">/</span>
                  <span className="text-red-500">-{pr.deletions}</span>
                </div>

                {pr.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pr.labels.map((label) => (
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
                    <span className="text-gray-500 dark:text-gray-400">{pr.author.login}</span>
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

export default GithubPRCard 