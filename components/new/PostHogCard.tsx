"use client"

import { useState } from "react"
import { ExternalLink, Users, TrendingUp, Activity, Clock } from "lucide-react"

interface PostHogCardProps {
  stats: {
    id: string
    projectName: string
    url: string
    metrics: {
      activeUsers: number
      activeUsersChange: number
      events: number
      eventsChange: number
      conversions: number
      conversionsChange: number
      timeframe: '24h' | '7d' | '30d'
    }
  }
}

const PostHogCard = ({ stats }: PostHogCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const formatChange = (change: number) => {
    const prefix = change > 0 ? '+' : ''
    return `${prefix}${change}%`
  }

  const getChangeColor = (change: number) => {
    if (change > 0) {
      return 'text-green-600 dark:text-green-400'
    }
    if (change < 0) {
      return 'text-red-600 dark:text-red-400'
    }
    return 'text-gray-600 dark:text-gray-400'
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
        <div className="bg-gradient-to-r from-purple-400/10 to-transparent dark:from-purple-900/30 dark:to-transparent border-l-2 border-purple-400/50 dark:border-purple-400/30">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-medium text-gray-900 dark:text-white">
                    {stats.projectName}
                  </h3>
                  <div className="flex items-center text-[13px] text-gray-500 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    <span>Last {stats.metrics.timeframe}</span>
                  </div>
                </div>
              </div>

              {isHovered && (
                <a 
                  href={stats.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 dark:text-white/50 dark:hover:text-white/80 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>Active Users</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                    {formatNumber(stats.metrics.activeUsers)}
                  </span>
                  <span className={`text-[12px] ${getChangeColor(stats.metrics.activeUsersChange)}`}>
                    {formatChange(stats.metrics.activeUsersChange)}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Events</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                    {formatNumber(stats.metrics.events)}
                  </span>
                  <span className={`text-[12px] ${getChangeColor(stats.metrics.eventsChange)}`}>
                    {formatChange(stats.metrics.eventsChange)}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Conversions</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                    {formatNumber(stats.metrics.conversions)}
                  </span>
                  <span className={`text-[12px] ${getChangeColor(stats.metrics.conversionsChange)}`}>
                    {formatChange(stats.metrics.conversionsChange)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostHogCard 