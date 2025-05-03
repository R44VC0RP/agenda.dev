"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import TodoInput from "@/components/todo-input"
import AITodoInput from "@/components/ai-todo-input"
import TodoList from "@/components/todo-list"
import TodoTable from "@/components/todo-table"
import ThemeToggle from "@/components/theme-toggle"
import CompletedToggle from "@/components/completed-toggle"
import ViewToggle from "@/components/view-toggle"
import LoginButton from "@/components/LoginButton"
import FeedbackWidget from "@/components/feedback-widget"
import type { Todo, Comment, Workspace } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "@/lib/auth-client"
import WorkspaceSwitcher from "@/components/workspace-switcher"
import NewWorkspaceDialog from "@/components/new-workspace-dialog"
import CommandPalette from "@/components/command-palette"
import { toast } from 'sonner'
import { addTimezoneHeader } from "@/lib/timezone-utils"
import { DropResult } from '@hello-pangea/dnd'

interface HomeClientProps {
    initialTodos: Todo[]
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
        console.log(`💾 Saving ${key} to localStorage:`, value)
        localStorage.setItem(key, JSON.stringify(value))
    }, [key, value])

    return [value, setValue] as const
}

export default function HomeClient({ initialTodos }: HomeClientProps) {
    const [todos, setTodos] = usePersistentState<Todo[]>('todos', initialTodos)
    const [showCompleted, setShowCompleted] = usePersistentState('showCompleted', false)
    const [isTableView, setIsTableView] = usePersistentState('isTableView', false)
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [currentWorkspace, setCurrentWorkspace] = usePersistentState<string>('currentWorkspace', 'personal')
    const [isNewWorkspaceDialogOpen, setIsNewWorkspaceDialogOpen] = useState(false)
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
    const { data: session } = useSession()

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

    // Sync with server if logged in
    useEffect(() => {
        if (!session?.user) return

        const syncWithServer = async () => {
            try {
                const res = await fetch('/api/todos')
                const remoteTodos = await res.json() as Todo[]

                // Helper function to generate a content hash for comparison
                const getContentHash = (todo: Todo) => {
                    return `${todo.title?.toLowerCase().trim() || ''}_${todo.dueDate || ''}_${todo.urgency || 1}`
                }

                // Helper function to update a remote todo
                const updateRemoteTodo = async (todoId: string, updates: { completed: boolean }) => {
                    try {
                        await fetch('/api/todos', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: todoId, ...updates }),
                        })
                    } catch (error) {
                        console.error('Failed to update remote todo:', error)
                    }
                }

                // Create maps of remote todos
                const remoteMap = new Map(remoteTodos.map((todo: Todo) => [todo.id, todo]))
                const remoteContentMap = new Map(remoteTodos.map((todo: Todo) => [
                    getContentHash(todo),
                    todo
                ]))

                // Find local-only todos that don't exist on server by content
                const localOnlyTodos = todos.filter(todo => {
                    const contentHash = getContentHash(todo)
                    const matchingRemoteTodo = remoteContentMap.get(contentHash)

                    // If no content match found, or if content matches but completion status differs
                    if (!matchingRemoteTodo) {
                        return true // Truly new todo
                    }

                    // If content matches but completion status is different, update the remote todo
                    if (matchingRemoteTodo.completed !== todo.completed) {
                        updateRemoteTodo(matchingRemoteTodo.id, { completed: todo.completed })
                        return false
                    }

                    return false // Skip if content matches and no updates needed
                })

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

                // Fetch the latest state from server after all syncs and updates
                const finalRes = await fetch('/api/todos')
                const finalTodos = (await finalRes.json()) as Todo[]

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

            } catch (error) {
                console.error('Failed to sync with server:', error)
            }
        }

        syncWithServer()
    }, [session?.user]) // Only re-run when user session changes

    // Load workspaces when session changes
    useEffect(() => {
        if (!session?.user) return;

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
            }
        };

        fetchWorkspaces();
    }, [session?.user]);

    const addTodo = async (todo: Todo) => {
        const newTodo = {
            ...todo,
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

    const handleDragEnd = (result: DropResult) => {
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

        // Calculate new due date based on destination column
        let newDueDate = new Date();
        if (destination.droppableId.startsWith('desktop')) {
            const columnIndex = parseInt(destination.droppableId.split('-')[2]);
            if (columnIndex === 0) {
                // Today's column - keep current date
                newDueDate = new Date();
            } else if (columnIndex === 1) {
                // Next 7 days column - set to tomorrow
                newDueDate.setDate(newDueDate.getDate() + 1);
            } else {
                // Upcoming column - set to next week
                newDueDate.setDate(newDueDate.getDate() + 8);
            }
        } else if (destination.droppableId.startsWith('tablet')) {
            const columnIndex = parseInt(destination.droppableId.split('-')[2]);
            if (columnIndex === 0) {
                // Today's column
                newDueDate = new Date();
            } else {
                // Upcoming column
                newDueDate.setDate(newDueDate.getDate() + 1);
            }
        }

        // Update the todo's due date
        const updatedTodo = {
            ...todo,
            dueDate: newDueDate.toISOString()
        };

        // Create new array with updated todo
        const newTodos = todos.filter(t => t.id !== draggableId);
        newTodos.splice(destination.index, 0, updatedTodo);
        
        // Update state
        setTodos(newTodos);

        // Log the update
        console.log(`Todo "${todo.title}" moved to ${destination.droppableId} at index ${destination.index}`);

        // Update the database after animations finish
        if (session?.user) {
            setTimeout(async () => {
                try {
                    const res = await fetch('/api/todos', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: draggableId, dueDate: updatedTodo.dueDate }),
                    });
                    if (!res.ok) throw new Error('Failed to update todo via drag-and-drop');
                    const serverTodo = await res.json();
                    // Sync state with server response
                    setTodos(prev => prev.map(t => t.id === draggableId ? serverTodo : t));
                    console.log('✅ Todo dueDate updated on server via drag:', serverTodo);
                } catch (error) {
                    console.error('❌ Error updating todo via drag:', error);
                }
            }, 350);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-[#09090B] text-gray-900 dark:text-white p-4 transition-colors duration-200">
            <div className="flex flex-row items-center justify-left">
                <Image src="/logo.png" alt="agenda.dev" width={32} height={32} className="mr-2" />
                <h1 className="text-xl">agenda.dev</h1>
            </div>
            <div className="relative mx-auto mb-4 flex items-center space-x-2 justify-center md:absolute md:top-4 md:right-4 md:mb-0 md:mx-0 md:justify-start">
                {session?.user && (
                    <WorkspaceSwitcher
                        workspaces={workspaces}
                        currentWorkspace={currentWorkspace}
                        onSwitch={setCurrentWorkspace}
                        onCreateNew={() => setIsNewWorkspaceDialogOpen(true)}
                        onDelete={deleteWorkspace}
                        todos={todos}
                    />
                )}
                <CompletedToggle showCompleted={showCompleted} setShowCompleted={setShowCompleted} />
                {/* <ViewToggle isTableView={isTableView} setIsTableView={setIsTableView} /> */}
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
                        <AITodoInput onAddTodo={addTodo} />
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
                            <TodoList
                                todos={filteredTodos}
                                onToggle={toggleTodo}
                                onDelete={deleteTodo}
                                onAddComment={addComment}
                                onDeleteComment={deleteComment}
                                onReschedule={rescheduleTodo}
                                onDragEnd={handleDragEnd}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {session?.user && (
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
            )}

            {/* <CommandPalette
        todos={filteredTodos}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        isOpen={isCommandPaletteOpen}
        setIsOpen={setIsCommandPaletteOpen}
        onTodoSelect={(todo) => {
          const element = document.getElementById(`todo-${todo.id}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.classList.add('highlight')
            setTimeout(() => element.classList.remove('highlight'), 2000)
          }
        }}
        onWorkspaceSwitch={setCurrentWorkspace}
        onWorkspaceCreate={async (name) => {
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
        onAddComment={addComment}
        onAddTodo={addTodo}
        onMarkCompleted={(todoId) => {
          setTodos(prev => prev.map(todo => 
            todo.id === todoId 
              ? { ...todo, completed: true, updatedAt: new Date() }
              : todo
          ))
        }}
        onWorkspaceDelete={deleteWorkspace}
        session={session}
      /> 
      {/* Will add in later */}
        </div>
    )
} 