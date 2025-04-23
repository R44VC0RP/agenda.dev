"use client"

import { useState, useEffect } from "react"
import TodoInput from "@/components/todo-input"
import TodoList from "@/components/todo-list"
import TodoTable from "@/components/todo-table"
import ThemeToggle from "@/components/theme-toggle"
import CompletedToggle from "@/components/completed-toggle"
import ViewToggle from "@/components/view-toggle"
import LoginButton from "@/components/LoginButton"
import FeedbackWidget from "@/components/feedback-widget"
import type { Todo, Comment } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "@/lib/auth-client"
import { convertOldTodoFormat } from "@/lib/utils"
import PWAInstall from '@/components/pwa-install'

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
    console.log(`💾 Saving ${key} to localStorage:`, value)
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

export default function Home() {
  const [todos, setTodos] = usePersistentState<Todo[]>('todos', [])
  const [showCompleted, setShowCompleted] = usePersistentState('showCompleted', false)
  const [isTableView, setIsTableView] = usePersistentState('isTableView', false)
  const { data: session } = useSession()

  // Sync with server if logged in
  useEffect(() => {
    if (!session?.user) return

    const syncWithServer = async () => {
      try {
        const res = await fetch('/api/todos')
        const remoteTodos = await res.json()
        
        // Find local-only todos
        const remoteMap = new Map(remoteTodos.map((todo: Todo) => [todo.id, todo]))
        const localOnlyTodos = todos.filter(todo => !remoteMap.has(todo.id))
        
        // Sync local-only todos to server
        const syncPromises = localOnlyTodos.map(todo => 
          fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: todo.title,
              dueDate: todo.dueDate,
              urgency: todo.urgency,
              completed: todo.completed
            }),
          }).then(res => res.json())
        )

        const syncedTodos = await Promise.all(syncPromises)
        const mergedTodos = [...remoteTodos, ...syncedTodos]
        setTodos(mergedTodos)
      } catch (error) {
        console.error('Failed to sync with server:', error)
      }
    }

    syncWithServer()
  }, [session])

  const addTodo = async (todo: Todo) => {
    const newTodo = {
      ...todo,
      comments: [],
      userId: session?.user?.id || 'local',
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
            urgency: todo.urgency
          }),
        })
        const serverTodo = await res.json()
        setTodos(prev => prev.map(t => t.id === newTodo.id ? { ...serverTodo, comments: [] } : t))
      } catch (error) {
        console.error('Failed to add todo:', error)
        // Revert on error
        setTodos(prev => prev.filter(t => t.id !== newTodo.id))
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
      console.log('❌ Todo not found:', id)
      return
    }

    console.log('🎯 Starting reschedule flow:', { id, newDate })
    console.log('📅 Previous due date:', todoToUpdate.dueDate)

    // Optimistic update
    console.log('🔄 Applying optimistic update...')
    setTodos(prev => {
      const updated = prev.map(todo => 
        todo.id === id ? { ...todo, dueDate: newDate, updatedAt: new Date() } : todo
      )
      console.log('📝 New todos state after optimistic update:', updated)
      return updated
    })

    if (session?.user) {
      console.log('👤 User is logged in, syncing with server...')
      try {
        console.log('📤 Sending update to server:', { id, dueDate: newDate })
        const res = await fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, dueDate: newDate }),
        })
        const updatedTodo = await res.json()
        console.log('📥 Server response:', updatedTodo)
        
        // Only update if the server response includes the new date
        if (updatedTodo.dueDate === newDate) {
          console.log('✅ Server update successful, updating state with server response')
          setTodos(prev => {
            const updated = prev.map(todo => todo.id === id ? updatedTodo : todo)
            console.log('📝 Final todos state:', updated)
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
        console.log('⏮️ Reverting to previous state...')
        
        // Revert on error
        setTodos(prev => {
          const reverted = prev.map(todo =>
            todo.id === id ? { ...todo, dueDate: todoToUpdate.dueDate } : todo
          )
          console.log('📝 Reverted todos state:', reverted)
          return reverted
        })
      }
    } else {
      console.log('👤 User not logged in, skipping server sync')
    }
    console.log('✨ Reschedule flow complete')
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

  // Filter todos based on showCompleted state
  const filteredTodos = showCompleted ? todos : todos.filter(todo => !todo.completed)

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-[#09090B] text-gray-900 dark:text-white p-4 transition-colors duration-200">
      <div className="relative mx-auto mb-4 flex items-center space-x-2 justify-center md:absolute md:top-4 md:right-4 md:mb-0 md:mx-0 md:justify-start">
        <CompletedToggle showCompleted={showCompleted} setShowCompleted={setShowCompleted} />
        <ViewToggle isTableView={isTableView} setIsTableView={setIsTableView} />
        <ThemeToggle />
        <FeedbackWidget />
        <LoginButton />
      </div>

      <motion.div
        layout
        className="flex-1 flex flex-col w-full max-w-[1200px] mx-auto"
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <motion.div
          initial={false}
          className="w-full mt-1 md:mt-12"
        >
          <motion.div
            initial={false}
            className="w-full sticky top-4 z-10 mb-8"
          >
            <TodoInput onAddTodo={addTodo} />
          </motion.div>
        </motion.div>

        <AnimatePresence mode="popLayout">
          {filteredTodos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {isTableView ? (
                <TodoTable
                  todos={filteredTodos}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                  onAddComment={addComment}
                  onDeleteComment={deleteComment}
                  onReschedule={rescheduleTodo}
                />
              ) : (
                <TodoList
                  todos={filteredTodos}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                  onAddComment={addComment}
                  onDeleteComment={deleteComment}
                  onReschedule={rescheduleTodo}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <PWAInstall />
    </div>
  )
}
