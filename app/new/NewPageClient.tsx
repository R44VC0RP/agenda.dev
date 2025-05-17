"use client"

import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { useRouter, usePathname } from "next/navigation"
import { FaSearch, FaCalendar } from "react-icons/fa"
import { motion } from "framer-motion"
import TodoItem from "@/components/todo-item"
import type { Todo, Comment } from "@/lib/types"
import { useSession } from "@/lib/auth-client"
import AgendaIcon from "@/components/AgendaIcon"
import ThemeToggle from "@/components/theme-toggle"
import GithubIssueCard from "@/components/new/GithubIssueCard"
import GithubPRCard from "@/components/new/GithubPRCard"
import GoogleCalendarCard from "@/components/new/GoogleCalendarCard"
import TwitterDMCard from "@/components/new/TwitterDMCard"
import VercelBuildCard from "@/components/new/VercelBuildCard"
import PostHogCard from "@/components/new/PostHogCard"
import SlackMessageCard from "@/components/new/SlackMessageCard"
import { getCalendarEvents } from "@/lib/google-calendar"
import { FaChevronDown } from 'react-icons/fa'
import { useScroll, useTransform } from 'framer-motion'

type ViewOption = "today" | "week" | "month"

// Type guard function to validate ViewOption
const isValidViewOption = (value: string): value is ViewOption => {
  return ["today", "week", "month"].includes(value)
}

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  hangoutLink?: string
  htmlLink?: string
  recurringEventId?: string
  creator?: {
    email: string
  }
  attendees?: Array<{
    email: string
    responseStatus?: 'accepted' | 'tentative' | 'declined' | 'needsAction'
  }>
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
}

// Function to determine event urgency color and label
const getEventUrgency = (eventStart: string | undefined, theme: string | undefined): { color: string; label?: string } => {
  if (!eventStart) return { color: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100' }
  
  const now = new Date()
  const start = new Date(eventStart)
  const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  if (hoursUntil < 0) return { 
    color: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
    label: 'Past'
  }
  if (hoursUntil <= 1) return { 
    color: theme === 'dark' ? 'bg-red-900/50' : 'bg-red-100',
    label: 'Starting soon'
  }
  if (hoursUntil <= 3) return { 
    color: theme === 'dark' ? 'bg-orange-900/50' : 'bg-orange-100',
    label: 'In a few hours'
  }
  if (hoursUntil <= 24) return { 
    color: theme === 'dark' ? 'bg-yellow-900/50' : 'bg-yellow-100',
    label: 'Today'
  }
  return { 
    color: theme === 'dark' ? 'bg-emerald-900/50' : 'bg-emerald-100'
  }
}

// Transform Google Calendar event to GoogleCalendarCard format
const transformCalendarEvent = (event: CalendarEvent) => {
  return {
    id: event.id,
    title: event.summary,
    description: event.description,
    location: event.location,
    startTime: event.start.dateTime!,
    endTime: event.end.dateTime!,
    organizer: event.creator?.email || '',
    attendees: (event.attendees || []).map(a => ({
      name: a.email.split('@')[0],
      email: a.email,
      responseStatus: a.responseStatus
    })),
    url: event.htmlLink || '',
    isRecurring: !!event.recurringEventId
  }
}

interface NewPageClientProps {
  initialTodos: Todo[]
  initialViewOption: string
}

// Custom hook to persist state in localStorage and sync with props
const usePersistentState = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue)

  // Load initial value from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(key)
    if (stored !== null) {
      try {
        setValue(JSON.parse(stored))
        console.log(`📥 Loaded ${key} from localStorage:`, JSON.parse(stored))
      } catch (error) {
        console.error(`❌ Failed to parse stored value for key "${key}":`, error)
      }
    }
  }, [key])

  // Save to localStorage whenever value changes
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

// Component to provide gradient fades and scroll indicator
function ScrollableSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const { scrollYProgress } = useScroll({ container: ref })
  const opacity = useTransform(scrollYProgress, [0.95, 1], [1, 0])
  useEffect(() => {
    const el = ref.current
    if (el) {
      const check = () => setHasOverflow(el.scrollHeight > el.clientHeight)
      check()
      el.addEventListener('scroll', check)
      window.addEventListener('resize', check)
      return () => {
        el.removeEventListener('scroll', check)
        window.removeEventListener('resize', check)
      }
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-[300px] min-h-0 relative">
      <div
        ref={ref}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        className="flex-1 overflow-y-auto overflow-x-hidden pr-1 scroll-smooth relative scrollbar-hide"
      >
        {/* Hide webkit scrollbar */}
        <style jsx>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
        {/* Top gradient */}
        <div className="sticky top-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-100 dark:from-[#09090B] to-transparent z-5 pointer-events-none" />
        <div className="relative z-1 space-y-4 p-1">{children}</div>
        {/* Bottom gradient */}
        <div className="sticky bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-100 dark:from-[#09090B] to-transparent z-5 pointer-events-none" />
      </div>
      {hasOverflow && (
        <motion.div
          style={{ opacity }}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 animate-bounce text-gray-400 z-10 pointer-events-none"
        >
          <FaChevronDown className="h-4 w-4" />
        </motion.div>
      )}
    </div>
  )
}

export default function NewPageClient({ initialTodos, initialViewOption }: NewPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const { resolvedTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewOption, setViewOption] = useState<ViewOption>(
    isValidViewOption(initialViewOption) ? initialViewOption : "today"
  )
  const [todos, setTodos] = usePersistentState<Todo[]>('new_todos', initialTodos)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [columnCount, setColumnCount] = useState(4)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Handle window resize to adjust column count based on screen width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width >= 1536) { // 2xl
        setColumnCount(4)
      } else if (width >= 1280) { // xl
        setColumnCount(3)
      } else if (width >= 768) { // md
        setColumnCount(2)
      } else {
        setColumnCount(1)
      }
    }
    
    handleResize() // Initial check
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  
  // Focus search input on page load
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])
  
  // Update URL and fetch calendar events when view option changes
  useEffect(() => {
    const newUrl = `${pathname}?view=${viewOption}`
    router.push(newUrl, { scroll: false })

    // Fetch calendar events
    const fetchEvents = async () => {
      if (!session?.user?.id) return
      try {
        const response = await fetch(`/api/development/google-calendar?period=${viewOption}`)
        if (!response.ok) throw new Error('Failed to fetch calendar events')
        const data = await response.json()
        setCalendarEvents(data.events || [])
      } catch (error) {
        console.error('Error fetching calendar events:', error)
      }
    }

    fetchEvents()
  }, [viewOption, pathname, router, session?.user?.id])
  
  // Clear todos and localStorage on signout
  useEffect(() => {
    if (!session?.user) {
      // Clear todos state
      setTodos([])
      
      // Clear localStorage
      localStorage.removeItem('new_todos')
    }
  }, [session?.user, setTodos])
  
  // Define the sync function to reuse
  const syncWithServer = async () => {
    if (!session?.user) return
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('📡 Syncing todos with server...')
      }

      // Fetch the date range based on current view option
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      let queryParam = `view=${viewOption}`
      
      const res = await fetch(`/api/todos?${queryParam}`)
      const remoteTodos = await res.json() as Todo[]

      // Helper to generate content hash
      const getContentHash = (todo: Todo) =>
        `${todo.title?.toLowerCase().trim() || ''}_${todo.dueDate || ''}_${todo.urgency || 1}`

      // Dedupe todos by content hash before setting state
      const uniqueTodos = Array.from(
        new Map(
          remoteTodos.map(todo => [
            getContentHash(todo),
            todo
          ])
        ).values()
      )
      
      // Sort todos by due date
      uniqueTodos.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })

      setTodos(uniqueTodos)

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Sync completed successfully with', uniqueTodos.length, 'todos')
      }

    } catch (error) {
      console.error('Failed to sync with server:', error)
    }
  }
  
  // Initial sync with server when logged in
  useEffect(() => {
    if (!session?.user) {
      setIsLoading(false)
      return
    }
    syncWithServer().finally(() => {
      setIsLoading(false)
    })
  }, [session?.user, viewOption]) // Re-run when user session or view option changes
  
  // Periodic sync with server
  useEffect(() => {
    if (!session?.user) return

    // Set up periodic sync
    const syncInterval = setInterval(() => {
      syncWithServer()
    }, 300000) // Sync every 5 minutes

    // Clean up interval on unmount
    return () => clearInterval(syncInterval)
  }, [session?.user, viewOption]) // Re-establish interval when view option changes
  
  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    const searchUrl = `https://unduck.link?q=${encodeURIComponent(searchQuery)}`
    window.open(searchUrl, "_blank")
    setSearchQuery("") // Clear search after submit
  }
  
  // Handle todo actions
  const handleToggleTodo = async (id: string) => {
    const todoToUpdate = todos.find(t => t.id === id)
    if (!todoToUpdate) return

    // Optimistic update
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed, updatedAt: new Date() } : todo
    ))

    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: !todoToUpdate.completed }),
      })
      if (!res.ok) throw new Error('Failed to toggle todo')
      
      // Sync with server to get updated data
      syncWithServer()
    } catch (error) {
      console.error('Failed to toggle todo:', error)
      // Revert on error
      setTodos(prev => prev.map(todo =>
        todo.id === id ? { ...todo, completed: todoToUpdate.completed } : todo
      ))
    }
  }
  
  const handleDeleteTodo = async (id: string) => {
    // Optimistic update
    const deletedTodo = todos.find(t => t.id === id)
    setTodos(prev => prev.filter(todo => todo.id !== id))

    try {
      const res = await fetch('/api/todos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Failed to delete todo')
    } catch (error) {
      console.error('Failed to delete todo:', error)
      // Revert on error
      if (deletedTodo) {
        setTodos(prev => [...prev, deletedTodo])
      }
    }
  }
  
  const handleAddComment = async (todoId: string, comment: Comment) => {
    const newComment = {
      ...comment,
      user: session?.user ? {
        name: session.user.name || 'User',
        image: null
      } : {
        name: 'Local User',
        image: null
      }
    }

    // Optimistic update
    setTodos(prev =>
      prev.map(todo => todo.id === todoId ? {
        ...todo,
        comments: [...todo.comments, newComment]
      } : todo)
    )

    try {
      const res = await fetch('/api/todos/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todoId, text: comment.text }),
      })
      if (!res.ok) throw new Error('Failed to add comment')
      
      // Sync to get server comment
      syncWithServer()
    } catch (error) {
      console.error('Failed to add comment:', error)
      // Revert on error
      setTodos(prev =>
        prev.map(todo => todo.id === todoId ? {
          ...todo,
          comments: todo.comments.filter(c => c.id !== newComment.id)
        } : todo)
      )
    }
  }
  
  const handleDeleteComment = async (todoId: string, commentId: string) => {
    // Store comment for potential revert
    const todoToUpdate = todos.find(t => t.id === todoId)
    const commentToDelete = todoToUpdate?.comments.find(c => c.id === commentId)

    // Optimistic update
    setTodos(prev =>
      prev.map(todo => todo.id === todoId ? {
        ...todo,
        comments: todo.comments.filter(c => c.id !== commentId)
      } : todo)
    )

    try {
      const res = await fetch('/api/todos/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todoId, commentId }),
      })
      if (!res.ok) throw new Error('Failed to delete comment')
    } catch (error) {
      console.error('Failed to delete comment:', error)
      // Revert on error
      if (commentToDelete) {
        setTodos(prev =>
          prev.map(todo => todo.id === todoId ? {
            ...todo,
            comments: [...todo.comments, commentToDelete]
          } : todo)
        )
      }
    }
  }
  
  const handleRescheduleTodo = async (id: string, newDate: string) => {
    const todoToUpdate = todos.find(t => t.id === id)
    if (!todoToUpdate) return

    // Optimistic update
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, dueDate: newDate, updatedAt: new Date() } : todo
    ))

    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, dueDate: newDate }),
      })
      if (!res.ok) throw new Error('Failed to reschedule todo')
      
      // Sync with server
      syncWithServer()
    } catch (error) {
      console.error('Failed to reschedule todo:', error)
      // Revert on error
      setTodos(prev => prev.map(todo =>
        todo.id === id ? { ...todo, dueDate: todoToUpdate.dueDate } : todo
      ))
    }
  }
  
  // Filter out completed todos
  const filteredTodos = todos.filter(todo => !todo.completed)
  
  // Create the sample integration cards
  const integrationCards = [
    <GithubIssueCard 
      key="github-issue-1"
      issue={{
        id: 'sample-issue-1',
        title: 'Fix layout bug in mobile view',
        number: 423,
        state: 'open',
        repository: 'agenda/web',
        url: 'https://github.com',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        author: {
          login: 'johnsmith',
          avatarUrl: 'https://github.com/github.png'
        },
        labels: [
          { name: 'bug', color: 'E11D48' },
          { name: 'mobile', color: '60A5FA' }
        ],
        comments: 3
      }} 
    />,
    <VercelBuildCard
      key="vercel-build-1"
      build={{
        id: 'build-1',
        projectName: 'agenda.dev',
        branch: 'main',
        commitMessage: 'Add dark mode support and fix mobile responsiveness',
        status: 'building',
        startTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        url: 'https://vercel.com',
        deploymentUrl: 'https://agenda-git-main.vercel.app',
        creator: {
          name: 'Sarah Dev',
          avatar: 'https://github.com/github.png'
        }
      }}
    />,
    <PostHogCard
      key="posthog-stats-1"
      stats={{
        id: 'stats-1',
        projectName: 'Agenda Analytics',
        url: 'https://app.posthog.com',
        metrics: {
          activeUsers: 12500,
          activeUsersChange: 15,
          events: 250000,
          eventsChange: 8,
          conversions: 1250,
          conversionsChange: 12,
          timeframe: '24h'
        }
      }}
    />,
    <SlackMessageCard
      key="slack-message-1"
      message={{
        id: 'msg-1',
        content: 'Hey team! Just deployed the new analytics dashboard. Check it out and let me know what you think! 📊',
        sender: {
          name: 'Alex Chen',
          avatar: 'https://github.com/github.png'
        },
        channel: {
          name: 'product-updates',
          isPrivate: false
        },
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        url: 'https://slack.com',
        threadCount: 5,
        reactions: [
          { emoji: '👍', count: 3 },
          { emoji: '🚀', count: 2 }
        ],
        attachments: [
          { type: 'image', name: 'dashboard-preview.png', url: 'https://example.com/image' }
        ]
      }}
    />,
    <GithubPRCard 
      key="github-pr-1"
      pr={{
        id: 'sample-pr-1',
        title: 'Add dark mode support to settings page',
        number: 156,
        state: 'open',
        repository: 'agenda/web',
        url: 'https://github.com',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        author: {
          login: 'sarahdev',
          avatarUrl: 'https://github.com/github.png'
        },
        labels: [
          { name: 'enhancement', color: '8B5CF6' },
          { name: 'UI', color: 'F59E0B' }
        ],
        comments: 5,
        additions: 342,
        deletions: 122
      }} 
    />,
    <GoogleCalendarCard 
      key="google-calendar-1"
      event={{
        id: 'sample-event-1',
        title: 'Weekly Team Standup',
        description: 'Review progress and discuss roadblocks',
        location: 'Meeting Room 3 / Google Meet',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
        organizer: 'Alex Moreno',
        attendees: [
          { name: 'Sarah Johnson', email: 'sarah@example.com', responseStatus: 'accepted' },
          { name: 'Michael Lee', email: 'michael@example.com', responseStatus: 'tentative' },
          { name: 'Jessica Taylor', email: 'jessica@example.com', responseStatus: 'declined' },
          { name: 'Omar Hassan', email: 'omar@example.com' }
        ],
        url: 'https://calendar.google.com',
        isRecurring: true
      }} 
    />,
    <TwitterDMCard 
      key="twitter-dm-1"
      message={{
        id: 'sample-dm-1',
        content: 'Hey, I really like your new agenda app! Would love to collaborate on adding new features. Are you available for a quick call next week?',
        sender: {
          id: 'user123',
          name: 'Sarah Connor',
          handle: 'techsarah',
          verified: true
        },
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        isRead: false,
        url: 'https://twitter.com',
        attachments: [
          { type: 'image', url: 'https://picsum.photos/200', previewUrl: 'https://picsum.photos/200' }
        ]
      }} 
    />
  ];

  // Stable hash function to assign items to columns consistently
  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  // Combine todos and integration cards into a list with IDs for stable column assignment
  const itemsWithIds: { id: string; node: React.ReactNode }[] = [
    ...filteredTodos.map(todo => ({
      id: todo.id,
      node: (
        <TodoItem
          key={`todo-${todo.id}`}
          todo={todo}
          onToggle={handleToggleTodo}
          onDelete={handleDeleteTodo}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onReschedule={handleRescheduleTodo}
        />
      )
    })),
    ...integrationCards.map(card => {
      const element = card as React.ReactElement;
      return { id: String(element.key), node: element };
    })
  ];

  // Create columns and assign items based on stable hash
  const columns: React.ReactNode[][] = Array.from({ length: columnCount }, () => []);
  itemsWithIds.forEach(({ id, node }) => {
    const colIndex = getHash(id) % columnCount;
    columns[colIndex].push(node);
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-[#09090B] text-gray-900 dark:text-white p-4 transition-colors duration-200">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2"></div>
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100 dark:bg-[#09090B] text-gray-900 dark:text-white p-4 transition-colors duration-200">
      {/* Small header with logo in top corner */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <AgendaIcon className="w-8 h-8" />
          </a>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Options - Small pill selector (only filters todos) */}
          <div className="bg-white dark:bg-[#131316] rounded-full p-1 inline-flex mr-2 shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24),0px_0px_0px_1px_rgba(0,0,0,1.00),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] transition-colors duration-200">
            {["today", "week", "month"].map((option) => (
              <button
                key={option}
                onClick={() => setViewOption(option as ViewOption)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  viewOption === option
                    ? "bg-gray-100 dark:bg-[#2a2a2f] text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          <ThemeToggle />
          <a href="/" className="h-8 px-3 rounded-full bg-white dark:bg-[#131316] flex items-center text-sm text-gray-900 dark:text-white shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24),0px_0px_0px_1px_rgba(0,0,0,1.00),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] transition-colors duration-200">
            Home
          </a>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="mb-8 mt-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl mx-auto"
        >
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search using unduck"
              className="block w-full pl-10 pr-3 py-3 bg-white dark:bg-[#131316] border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24),0px_0px_0px_1px_rgba(0,0,0,1.00),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] transition-colors duration-200"
            />
          </form>
        </motion.div>
      </div>
      
      {/* Main content area with fixed height and scrollable columns */}
      <div className="flex-1 flex flex-col min-h-0 gap-4">
        {/* Responsive grid for content columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 h-full">
          {/* Column 1: Todos */}
          <ScrollableSection>
            {todos.filter(todo => !todo.completed).map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggleTodo}
                onDelete={handleDeleteTodo}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
                onReschedule={handleRescheduleTodo}
              />
            ))}
          </ScrollableSection>

          {/* Column 2: Calendar Events */}
          <ScrollableSection>
            {calendarEvents
              .filter(event => event.start.dateTime) // Filter out all-day events
              .map(event => (
                <GoogleCalendarCard
                  key={event.id}
                  event={transformCalendarEvent(event)}
                />
              ))}
          </ScrollableSection>

          {/* Columns 3-4: Other Items */}
          {Array.from({ length: columnCount - 2 }).map((_, idx) => (
            <ScrollableSection key={`other-column-${idx}`}>
              {columns[idx + 2]?.map((item, itemIndex) => (
                <div key={`item-${idx}-${itemIndex}`} className="w-full">
                  {item}
                </div>
              ))}
            </ScrollableSection>
          ))}
        </div>
      </div>
    </div>
  )
} 