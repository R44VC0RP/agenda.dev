"use client"

import { useState } from "react"
import { ExternalLink, Clock, GitBranch, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

interface VercelBuildCardProps {
  build: {
    id: string
    projectName: string
    branch: string
    commitMessage: string
    status: 'building' | 'completed' | 'failed' | 'cancelled'
    startTime: string
    endTime?: string
    url: string
    deploymentUrl?: string
    creator: {
      name: string
      avatar?: string
    }
  }
}

const VercelBuildCard = ({ build }: VercelBuildCardProps) => {
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

  // Get status styles
  const getStatusStyles = () => {
    switch (build.status) {
      case 'building':
        return {
          bg: 'bg-gradient-to-r from-yellow-400/10 to-transparent dark:from-yellow-900/30 dark:to-transparent',
          border: 'border-yellow-400/50 dark:border-yellow-400/30',
          text: 'text-yellow-600 dark:text-yellow-400',
          icon: <AlertCircle className="w-4 h-4 text-yellow-500" />
        }
      case 'completed':
        return {
          bg: 'bg-gradient-to-r from-green-400/10 to-transparent dark:from-green-900/30 dark:to-transparent',
          border: 'border-green-400/50 dark:border-green-400/30',
          text: 'text-green-600 dark:text-green-400',
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
        }
      case 'failed':
        return {
          bg: 'bg-gradient-to-r from-red-400/10 to-transparent dark:from-red-900/30 dark:to-transparent',
          border: 'border-red-400/50 dark:border-red-400/30',
          text: 'text-red-600 dark:text-red-400',
          icon: <XCircle className="w-4 h-4 text-red-500" />
        }
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-400/10 to-transparent dark:from-gray-800/30 dark:to-transparent',
          border: 'border-gray-400/50 dark:border-gray-400/30',
          text: 'text-gray-600 dark:text-gray-400',
          icon: <AlertCircle className="w-4 h-4 text-gray-500" />
        }
    }
  }

  const statusStyles = getStatusStyles()

  return (
    <div
      className="backdrop-blur-sm bg-white/95 dark:bg-[#131316]/95 rounded-[14px] shadow-[0px_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0px_8px_40px_rgba(0,0,0,0.35)] border border-black/[0.04] dark:border-white/[0.06] backdrop-filter overflow-hidden transition-colors duration-200 relative
      before:absolute before:inset-0 before:rounded-[14px] before:border before:border-white/[0.12] dark:before:border-white/[0.04] before:z-[-1]
      after:absolute after:inset-0 after:rounded-[14px] after:bg-[url('/noise-light.png')] after:opacity-[0.03] after:z-[-1] dark:after:opacity-[0.07]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col relative">
        <div className={`${statusStyles.bg} border-l-2 ${statusStyles.border}`}>
          <div className="p-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {build.creator.avatar ? (
                  <img 
                    src={build.creator.avatar} 
                    alt={build.creator.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor"/></svg>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center w-[85%]">
                    <p className="text-[15px] font-medium text-gray-900 dark:text-white">
                      {build.projectName}
                    </p>
                    <span className="ml-2 flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400">
                      <GitBranch className="w-3.5 h-3.5" />
                      {build.branch}
                    </span>
                  </div>

                  {isHovered && (
                    <a 
                      href={build.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600 dark:text-white/50 dark:hover:text-white/80 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <div className="mt-1 text-[14px] text-gray-700 dark:text-gray-300">
                  {build.commitMessage}
                </div>

                {build.deploymentUrl && (
                  <a 
                    href={build.deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="mt-2 inline-flex items-center text-[12px] text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <span>View Deployment</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}

                <div className="flex items-center mt-2 text-[12px]">
                  <div className="flex items-center gap-1">
                    {statusStyles.icon}
                    <span className={statusStyles.text}>
                      {build.status.charAt(0).toUpperCase() + build.status.slice(1)}
                    </span>
                  </div>
                  <span className="mx-1 text-gray-400 dark:text-gray-500">•</span>
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    <span>{formatTime(build.startTime)}</span>
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

export default VercelBuildCard 