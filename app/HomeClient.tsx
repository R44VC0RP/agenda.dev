"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import TodoInput from "@/components/todo-input"
import AITodoInput from "@/components/ai-todo-input"
import TodoList from "@/components/todo-list"
import TodoTable from "@/components/todo-table"
import ThemeToggle from "@/components/theme-toggle"
import CompletedToggle from "@/components/completed-toggle"
import ViewToggle from "@/components/view-toggle"
import LoginButton from "@/components/LoginButton"
import FeedbackWidget from "@/components/feedback-widget"
import AgendaIcon from "@/components/AgendaIcon"
import type { Todo, Comment, Workspace } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"
import { useSession, subscription } from "@/lib/auth-client"
import WorkspaceSwitcher from "@/components/workspace-switcher"
import NewWorkspaceDialog from "@/components/new-workspace-dialog"
import { toast } from 'sonner'
import { addTimezoneHeader } from "@/lib/timezone-utils"
import { DropResult } from '@hello-pangea/dnd'
import SettingsDialog from "@/components/SettingsDialog"
import { useSearchParams, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import LandingHero from "@/components/LandingHero"

interface HomeClientProps {
  initialTodos: Todo[]
  usersCount: number
  todosCount: number
}

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
    // console.log(`💾 Saving ${key} to localStorage:`, value)
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

// Add a custom hook to detect mobile screen size
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window is defined (to avoid SSR issues)
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768); // md breakpoint in Tailwind
      };

      // Initial check
      checkMobile();

      // Add event listener for resize
      window.addEventListener('resize', checkMobile);

      // Clean up
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  return isMobile;
};

export default function HomeClient({ initialTodos, usersCount, todosCount }: HomeClientProps) {
  const [hasLocalData, setHasLocalData] = useState(false);
  const [todos, setTodos] = usePersistentState<Todo[]>('todos', initialTodos)
  const [showCompleted, setShowCompleted] = usePersistentState('showCompleted', false)
  const [isTableView, setIsTableView] = usePersistentState('isTableView', false)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = usePersistentState<string>('currentWorkspace', 'personal')
  const [isNewWorkspaceDialogOpen, setIsNewWorkspaceDialogOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { data: session } = useSession()
  const isMobile = useIsMobile();
  const searchParams = useSearchParams()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  // Track active subscription plan for workspace limits
  const [activePlan, setActivePlan] = useState<string | null>(null)
  // Loading state to prevent UI flashing
  const [isLoading, setIsLoading] = useState(true)
  const [showInputAtBottom, setShowInputAtBottom] = useState(false)

  // Check for local todos, but only on the client side
  useEffect(() => {
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos !== null) {
      try {
        const parsedTodos = JSON.parse(storedTodos);
        if (Array.isArray(parsedTodos) && parsedTodos.length > 0) {
          setHasLocalData(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to parse stored todos:', error);
      }
    }
  }, []);

  // 2. Ref for drag-end timeout to avoid stale callbacks
  const dragTimeoutRef = useRef<number | null>(null);

  // 3. Clean up any pending drag timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current !== null) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  // 4. Centralize due-date calculation
  const computeNewDueDate = (columnIndex: number, columns: number): Date => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (columns === 3) {
      if (columnIndex === 0) return today;
      if (columnIndex === 1) {
        const mid = new Date(today);
        mid.setDate(today.getDate() + 3);
        return mid;
      }
      const beyond = new Date(today);
      beyond.setDate(today.getDate() + 14);
      return beyond;
    } else if (columns === 2) {
      if (columnIndex === 0) return today;
      const mid = new Date(today);
      mid.setDate(today.getDate() + 7);
      return mid;
    }
    return today;
  };

  // Initialize user settings on first load: if no DB record exists, seed with defaults (browser timezone)
  useEffect(() => {
    if (!session?.user) return
    const initSettings = async () => {
      try {
        const res = await fetch('/api/user/settings', { headers: addTimezoneHeader() })
        if (!res.ok) return
        const data = await res.json() as Record<string, any>
        // If no userId field, the GET returned defaults
        if (!('userId' in data)) {
          await fetch('/api/user/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...addTimezoneHeader() },
            body: JSON.stringify({
              reminderMinutes: data.reminderMinutes,
              aiSuggestedReminders: data.aiSuggestedReminders,
              weeklyReview: data.weeklyReview,
              timezone: data.timezone,
            }),
          })
        }
      } catch (error) {
        console.error('Failed to initialize user settings:', error)
      }
    }
    initSettings()
  }, [session?.user])

  // Clear todos and localStorage on signout
  useEffect(() => {
    if (!session?.user) {
      // Clear todos state
      setTodos([])
      setWorkspaces([])
      setCurrentWorkspace('personal')

      // Clear localStorage
      localStorage.removeItem('todos')
      localStorage.removeItem('currentWorkspace')

      // Optional: Clear other localStorage items if needed
      localStorage.removeItem('showCompleted')
      localStorage.removeItem('isTableView')
    }
  }, [session?.user, setTodos, setCurrentWorkspace])

  // Add keyboard shortcut handler for workspace switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.metaKey && !e.altKey && !e.shiftKey) {
        const num = parseInt(e.key)
        if (!isNaN(num) && num >= 1 && num <= 9) {
          e.preventDefault()
          const targetWorkspace = workspaces[num - 1]
          // Only switch if target workspace exists and is different from current
          if (targetWorkspace && targetWorkspace.id !== currentWorkspace) {
            setCurrentWorkspace(targetWorkspace.id)
            toast.success(`Switched to workspace: ${targetWorkspace.name}`)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [workspaces, setCurrentWorkspace, currentWorkspace])

  // Add this effect to fetch the setting
  useEffect(() => {
    const fetchInputPosition = async () => {
      if (!session?.user) return
      try {
        const response = await fetch("/api/user/settings", {
          headers: addTimezoneHeader()
        })
        if (!response.ok) return
        const data = await response.json()
        setShowInputAtBottom(data.showInputAtBottom)
      } catch (error) {
        console.error("Error fetching input position setting:", error)
      }
    }
    fetchInputPosition()
  }, [session?.user])

  // Define the sync function outside the effects so it can be reused
  const syncWithServer = async () => {
    if (!session?.user) return;
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('📡 Syncing todos with server...');
      }

      const res = await fetch('/api/todos');
      const remoteTodos = await res.json() as Todo[];

      // Helper to generate content hash
      const getContentHash = (todo: Todo) =>
        `${todo.title?.toLowerCase().trim() || ''}_${todo.dueDate || ''}_${todo.urgency || 1}`;

      // Map remote todos by ID
      const remoteMap = new Map(remoteTodos.map(todo => [todo.id, todo]));

      // Determine which todos to update vs create
      const todosToPut: { id: string; updates: Partial<{ completed: boolean; dueDate: string | null; workspaceId: string | null }> }[] = [];
      const todosToPost: Todo[] = [];

      todos.forEach(localTodo => {
        const remoteTodo = remoteMap.get(localTodo.id);
        if (remoteTodo) {
          const updates: any = {};
          if (remoteTodo.completed !== localTodo.completed) updates.completed = localTodo.completed;
          if (remoteTodo.dueDate !== localTodo.dueDate) updates.dueDate = localTodo.dueDate;
          if (remoteTodo.workspaceId !== localTodo.workspaceId) updates.workspaceId = localTodo.workspaceId;
          if (Object.keys(updates).length > 0) {
            todosToPut.push({ id: localTodo.id, updates });
          }
        } else {
          todosToPost.push(localTodo);
        }
      });

      // Send all PUT and POST requests
      await Promise.all([
        ...todosToPut.map(({ id, updates }) =>
          fetch('/api/todos', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          })
        ),
        ...todosToPost.map(todo =>
          fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: todo.title,
              dueDate: todo.dueDate,
              urgency: todo.urgency,
              completed: todo.completed,
              workspaceId: todo.workspaceId,
            }),
          })
        ),
      ]);

      // Fetch the latest state from server after all syncs and updates
      const finalRes = await fetch('/api/todos');
      const finalTodos = (await finalRes.json()) as Todo[];

      // Dedupe todos by content hash before setting state
      const uniqueTodos = Array.from(
        new Map(
          finalTodos.map(todo => [
            getContentHash(todo),
            todo
          ])
        ).values()
      )

      setTodos(uniqueTodos)

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Sync completed successfully');
      }

    } catch (error) {
      console.error('Failed to sync with server:', error)
    }
  }

  // Initial sync with server when logged in
  useEffect(() => {
    if (!session?.user) {
      setIsLoading(false);
      return;
    }
    syncWithServer().finally(() => {
      setIsLoading(false);
    });
  }, [session?.user]); // Only re-run when user session changes

  // Periodic sync with server every minute when logged in
  useEffect(() => {
    if (!session?.user) return;

    // Set up periodic sync
    const syncInterval = setInterval(() => {
      syncWithServer();
    }, 300000); // Sync every 5 minutes

    // Clean up interval on unmount
    return () => clearInterval(syncInterval);
  }, [session?.user]); // Re-establish interval when todos change

  // Load workspaces when session changes
  useEffect(() => {
    if (!session?.user) return;

    setIsLoading(true); // Set loading when fetching workspaces

    const fetchWorkspaces = async () => {
      try {
        // Ensure we have at least a personal workspace
        await fetch('/api/workspaces/personal', { method: 'POST' });

        // Fetch all workspaces
        const res = await fetch('/api/workspaces');
        if (res.ok) {
          const workspacesData = await res.json();
          setWorkspaces(workspacesData);

          // If no current workspace is selected, or it doesn't exist in fetched workspaces,
          // default to first workspace or 'personal'
          if (
            currentWorkspace === 'personal' ||
            !workspacesData.some((w: Workspace) => w.id === currentWorkspace)
          ) {
            const personalWorkspace = workspacesData.find((w: Workspace) => w.name === 'Personal');
            if (personalWorkspace) {
              setCurrentWorkspace(personalWorkspace.id);
            } else if (workspacesData.length > 0) {
              setCurrentWorkspace(workspacesData[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch workspaces:', error);
      } finally {
        setIsLoading(false); // Clear loading state regardless of success/failure
      }
    };

    fetchWorkspaces();
  }, [session?.user]);

  // Track active subscription plan for workspace limits
  useEffect(() => {
    if (!session?.user) {
      setActivePlan(null)
      return
    }
    ; (async () => {
      try {
        // Fetch subscriptions and default to empty array if null
        const resp = await subscription.list()
        const subs = resp.data ?? []
        const activeSub = subs.find(
          s => s.status === "active" || s.status === "trialing"
        )
        setActivePlan(activeSub?.plan ?? null)
      } catch (error) {
        console.error("Failed to fetch subscriptions:", error)
        // Don't show error toast for the known date error
        if (error instanceof RangeError && error.message.includes("Invalid time value")) {
          console.log("Handling known date error in subscription data")
          setActivePlan(null) // Default to null (free plan) when there's a date parsing error
        }
      }
    })()
  }, [session?.user])

  // Determine workspace creation limit (free: 3, pro: 5)
  const workspaceLimit = activePlan === "pro" ? 5 : 3
  const canCreateWorkspace = workspaces.length < workspaceLimit

  const addTodo = async (todo: Todo) => {
    // Create a temporary client-side ID for optimistic updates using UUID when available
    const tempId = `temp-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}`;

    const newTodo = {
      ...todo,
      id: tempId, // Override with our guaranteed unique temp ID
      comments: [],
      userId: session?.user?.id || 'local',
      workspaceId: currentWorkspace,
    }

    // Optimistic update
    setTodos(prev => [...prev, newTodo])

    if (session?.user) {
      try {
        const res = await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: todo.title,
            dueDate: todo.dueDate,
            urgency: todo.urgency,
            workspaceId: currentWorkspace
          }),
        })
        const serverTodo = await res.json()

        // Replace the temporary todo with the server response
        setTodos(prev => prev.map(t =>
          t.id === tempId ? { ...serverTodo, comments: [] } : t
        ))
      } catch (error) {
        console.error('Failed to add todo:', error)
        // Revert on error
        setTodos(prev => prev.filter(t => t.id !== tempId))
      }
    }
  }

  const toggleTodo = async (id: string) => {
    const todoToUpdate = todos.find(t => t.id === id)
    if (!todoToUpdate) return

    // Optimistic update
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed, updatedAt: new Date() } : todo
    ))

    if (session?.user) {
      try {
        const res = await fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, completed: !todoToUpdate.completed }),
        })
        const updatedTodo = await res.json()
        setTodos(prev => prev.map(todo => todo.id === id ? updatedTodo : todo))
      } catch (error) {
        console.error('Failed to toggle todo:', error)
        // Revert on error
        setTodos(prev => prev.map(todo =>
          todo.id === id ? { ...todo, completed: todoToUpdate.completed } : todo
        ))
      }
    }
  }

  const rescheduleTodo = async (id: string, newDate: string) => {
    const todoToUpdate = todos.find(t => t.id === id)
    if (!todoToUpdate) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('❌ Todo not found:', id)
      }
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('🎯 Starting reschedule flow:', { id, newDate })
      console.log('📅 Previous due date:', todoToUpdate.dueDate)
    }

    // Optimistic update
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 Applying optimistic update...')
    }

    setTodos(prev => {
      const updated = prev.map(todo =>
        todo.id === id ? { ...todo, dueDate: newDate, updatedAt: new Date() } : todo
      )

      if (process.env.NODE_ENV !== 'production') {
        console.log('📝 New todos state after optimistic update:', updated)
      }

      return updated
    })

    if (session?.user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('👤 User is logged in, syncing with server...')
      }

      try {
        if (process.env.NODE_ENV !== 'production') {
          console.log('📤 Sending update to server:', { id, dueDate: newDate })
        }

        const res = await fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, dueDate: newDate }),
        })
        const updatedTodo = await res.json()

        if (process.env.NODE_ENV !== 'production') {
          console.log('📥 Server response:', updatedTodo)
        }

        // Only update if the server response includes the new date
        if (updatedTodo.dueDate === newDate) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('✅ Server update successful, updating state with server response')
          }

          setTodos(prev => {
            const updated = prev.map(todo => todo.id === id ? updatedTodo : todo)

            if (process.env.NODE_ENV !== 'production') {
              console.log('📝 Final todos state:', updated)
            }

            return updated
          })
        } else {
          console.warn('⚠️ Server response dueDate does not match requested date', {
            requested: newDate,
            received: updatedTodo.dueDate
          })
        }
      } catch (error) {
        console.error('❌ Failed to reschedule todo:', error)

        if (process.env.NODE_ENV !== 'production') {
          console.log('⏮️ Reverting to previous state...')
        }

        // Revert on error
        setTodos(prev => {
          const reverted = prev.map(todo =>
            todo.id === id ? { ...todo, dueDate: todoToUpdate.dueDate } : todo
          )

          if (process.env.NODE_ENV !== 'production') {
            console.log('📝 Reverted todos state:', reverted)
          }

          return reverted
        })
      }
    } else if (process.env.NODE_ENV !== 'production') {
      console.log('👤 User not logged in, skipping server sync')
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('✨ Reschedule flow complete')
    }
  }

  const deleteTodo = async (id: string) => {
    // Optimistic update
    const deletedTodo = todos.find(t => t.id === id)
    setTodos(prev => prev.filter(todo => todo.id !== id))

    if (session?.user) {
      try {
        await fetch('/api/todos', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
      } catch (error) {
        console.error('Failed to delete todo:', error)
        // Revert on error
        if (deletedTodo) {
          setTodos(prev => [...prev, deletedTodo])
        }
      }
    }
  }

  const addComment = async (todoId: string, comment: Comment) => {
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

    if (session?.user) {
      try {
        const res = await fetch('/api/todos/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ todoId, text: comment.text }),
        })
        const serverComment = await res.json()
        setTodos(prev =>
          prev.map(todo => todo.id === todoId ? {
            ...todo,
            comments: todo.comments.map(c =>
              c.id === newComment.id ? { ...serverComment, createdAt: new Date(serverComment.createdAt) } : c
            )
          } : todo)
        )
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
  }

  const deleteComment = async (todoId: string, commentId: string) => {
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

    if (session?.user) {
      try {
        await fetch('/api/todos/comments', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ todoId, commentId }),
        })
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
  }

  // Filter todos based on showCompleted state and current workspace
  const filteredTodos = todos
    .filter(todo => todo.workspaceId === currentWorkspace || (!todo.workspaceId && currentWorkspace === 'personal'))
    .filter(todo => showCompleted ? true : !todo.completed);

  const deleteWorkspace = async (workspaceId: string) => {
    // Don't delete if there are incomplete todos
    const hasIncompleteTodos = todos.some(todo =>
      todo.workspaceId === workspaceId && !todo.completed
    )
    if (hasIncompleteTodos) {
      toast.error("Cannot delete workspace with incomplete todos")
      return
    }

    // Store workspace for potential revert
    const workspaceToDelete = workspaces.find(w => w.id === workspaceId)
    const workspaceName = workspaceToDelete?.name || 'Workspace'

    // Optimistic update
    setWorkspaces(prev => prev.filter(w => w.id !== workspaceId))

    // If this was the current workspace, switch to another one
    if (workspaceId === currentWorkspace) {
      const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceId)
      if (remainingWorkspaces.length > 0) {
        setCurrentWorkspace(remainingWorkspaces[0].id)
      }
    }

    if (session?.user) {
      try {
        const res = await fetch('/api/workspaces', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: workspaceId }),
        })
        if (!res.ok) throw new Error('Failed to delete workspace')

        toast(`${workspaceName} deleted`)
      } catch (error) {
        console.error('Failed to delete workspace:', error)
        toast.error(`Failed to delete ${workspaceName}`)

        // Revert on error
        if (workspaceToDelete) {
          setWorkspaces(prev => [...prev, workspaceToDelete])
          if (workspaceId === currentWorkspace) {
            setCurrentWorkspace(workspaceId)
          }
        }
      }
    } else {
      toast(`${workspaceName} deleted`)
    }
  }

  const handleDragEnd = useCallback((result: DropResult) => {
    if (isMobile) return; // Prevent drag end handling on mobile

    const { destination, source, draggableId } = result;

    // If there's no destination or the item was dropped in its original position
    if (!destination ||
      (destination.droppableId === source.droppableId &&
        destination.index === source.index)) {
      return;
    }

    // Find the todo that was dragged
    const todo = todos.find(t => t.id === draggableId);
    if (!todo) return;

    // Compute new due date based on destination column
    const isDesktop = destination.droppableId.startsWith('desktop');
    const isTablet = destination.droppableId.startsWith('tablet');
    const cols = isDesktop ? 3 : isTablet ? 2 : 1;
    const parts = destination.droppableId.split('-');
    const colIdx = parseInt(parts[parts.length - 1]!, 10);
    if (Number.isNaN(colIdx)) {
      console.warn('Unhandled droppableId:', destination.droppableId);
      return;
    }
    const newDateObj = computeNewDueDate(colIdx, cols);
    const formattedDate = `${newDateObj.getFullYear()}-${String(newDateObj.getMonth() + 1).padStart(2, '0')}-${String(newDateObj.getDate()).padStart(2, '0')}`;
    const updatedTodo = { ...todo, dueDate: `${formattedDate}T00:00:00.000Z` };

    // Create new array with updated todo
    const newTodos = todos.filter(t => t.id !== draggableId);
    newTodos.splice(destination.index, 0, updatedTodo);

    // Update state
    setTodos(newTodos);

    // Log the update
    console.log(`Todo "${todo.title}" moved to ${destination.droppableId} at index ${destination.index}`);

    // Update the database after animations finish
    if (session?.user) {
      dragTimeoutRef.current = window.setTimeout(async () => {
        try {
          const res = await fetch('/api/todos', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: draggableId, dueDate: updatedTodo.dueDate }),
          });
          if (!res.ok) throw new Error('Failed to update todo via drag-and-drop');
          const serverTodo = await res.json();
          setTodos(prev => prev.map(t => t.id === draggableId ? serverTodo : t));
        } catch (err) {
          console.error('❌ Error updating todo via drag:', err);
        }
      }, 350);
    }
  }, [isMobile, todos, session?.user]);

  // Check for 'settings=true' query param to auto-open settings dialog
  useEffect(() => {
    if (searchParams.get('settings') === 'true' && session?.user) {
      setShowSettings(true)
    }
  }, [searchParams, session?.user])

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-[#09090B] text-gray-900 dark:text-white p-4 transition-colors duration-200">
      <div className="flex flex-row items-center justify-left relative z-10">
        <AgendaIcon className="w-8 h-8 mr-2" />
        <h1 className="text-xl hidden md:block">agenda.dev</h1>
      </div>
      <div className="absolute top-4 right-4 flex items-center space-x-2 justify-center md:mb-0 md:mx-0 md:justify-start z-20">
        {session?.user && (
          <a
            href="/new"
            className="h-8 px-3 rounded-full bg-white dark:bg-[#131316] flex items-center gap-2 shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24),0px_0px_0px_1px_rgba(0,0,0,1.00),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] transition-colors duration-200"
          >
            <span className="text-sm text-gray-900 dark:text-white flex items-center">
              New Tab
            </span>
          </a>
        )}
        {session?.user && activePlan !== "pro" && !isMobile && (
          <button
            onClick={() => setShowSettings(true)}
            className="h-8 px-3 rounded-full bg-white dark:bg-[#131316] flex items-center gap-2 shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24),0px_0px_0px_1px_rgba(0,0,0,1.00),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] transition-colors duration-200"
          >
            <span className="text-sm text-gray-900 dark:text-white flex items-center">
              <span className="text-violet-500 dark:text-violet-400 mr-1 text-xs">✨</span>
              Upgrade
            </span>
          </button>
        )}
        {session?.user && (
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            onSwitch={setCurrentWorkspace}
            onCreateNew={() => setIsNewWorkspaceDialogOpen(true)}
            onDelete={deleteWorkspace}
            todos={todos}
            canCreateNew={canCreateWorkspace}
          />
        )}
        {session?.user && (
          <CompletedToggle showCompleted={showCompleted} setShowCompleted={setShowCompleted} />
        )}
        {/* <ViewToggle isTableView={isTableView} setIsTableView={setIsTableView} /> */}
        <ThemeToggle />
        {!isMobile && <FeedbackWidget />}
        <LoginButton />
      </div>

      {isLoading && !hasLocalData ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2"></div>
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
          </div>
        </div>
      ) : (!session?.user && !hasLocalData) ? (
        <LandingHero usersCount={usersCount} todosCount={todosCount} />
      ) : (
        <motion.div
          layout
          className="flex-1 flex flex-col w-full max-w-[1200px] mx-auto"
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* Mobile Input (at bottom) */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-100 dark:bg-[#09090B] border-t border-gray-200 dark:border-white/10">
            <AITodoInput onAddTodo={addTodo} />
          </div>

          {/* Desktop Input (at top) */}
          {!showInputAtBottom && (
          <motion.div
            initial={false}
            className={`w-full ${filteredTodos.length === 0 ? 'flex-1 flex items-center justify-center' : 'mt-1 md:mt-10'} hidden md:flex`}
          >
            <motion.div
              initial={false}
              className={`${filteredTodos.length === 0 ? 'w-[600px]' : 'w-full'} sticky top-4 z-10`}
            >
              <AITodoInput onAddTodo={addTodo} />
            </motion.div>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {filteredTodos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`md:pb-0 mt-4 md:mt-0 ${showInputAtBottom ? 'pt-3' : 'pt-0'}`} // Adjusted padding and added top margin for mobile
              >
                <TodoList
                  todos={filteredTodos}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                  onAddComment={addComment}
                  onDeleteComment={deleteComment}
                  onReschedule={rescheduleTodo}
                  onDragEnd={handleDragEnd}
                  disableDrag={isMobile} // Pass the isMobile flag to disable drag on mobile
                />
              </motion.div>
            )}
          </AnimatePresence>
          {showInputAtBottom && (
            <motion.div
              initial={false}
              className={`w-full ${filteredTodos.length === 0 ? 'flex-1 flex items-center justify-center' : 'mt-0'} hidden md:flex`}
          >
            <motion.div
              initial={false}
              className={`${filteredTodos.length === 0 ? 'w-[600px]' : 'w-full'} sticky  z-10`}
            >
              <AITodoInput onAddTodo={addTodo} />
            </motion.div>
          </motion.div>
          )}
        </motion.div>
      )}

      {session?.user && (
        <>
          <NewWorkspaceDialog
            isOpen={isNewWorkspaceDialogOpen}
            onClose={() => setIsNewWorkspaceDialogOpen(false)}
            onSubmit={async (name) => {
              try {
                const res = await fetch('/api/workspaces', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name }),
                });
                if (res.ok) {
                  const workspace = await res.json();
                  setWorkspaces(prev => [...prev, workspace]);
                  setCurrentWorkspace(workspace.id);
                }
              } catch (error) {
                console.error('Failed to create workspace:', error);
              }
            }}
          />

          <SettingsDialog
            open={showSettings}
            onOpenChange={(open) => {
              setShowSettings(open);
              if (!open) {
                // Remove the settings query parameter when dialog is closed
                const url = new URL(window.location.href);
                url.searchParams.delete('settings');
                window.history.replaceState({}, '', url);
              }
            }}
          />
        </>
      )}

      {/* 
        TODO: Implement command palette feature
        Tracking issue: #123 - Command Palette Implementation
        Priority: Medium - Planned for next sprint
      */}
    </div>
  )
} 