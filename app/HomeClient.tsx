'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import AITodoInput from '@/components/ai-todo-input';
import TodoList from '@/components/todo-list';
import ThemeToggle from '@/components/theme-toggle';
import CompletedToggle from '@/components/completed-toggle';
import ViewToggle from '@/components/view-toggle';
import LoginButton from '@/components/LoginButton';
import FeedbackWidget from '@/components/feedback-widget';
import type { Todo, Comment, Workspace } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/lib/auth-client';
import WorkspaceSwitcher from '@/components/workspace-switcher';
import NewWorkspaceDialog from '@/components/new-workspace-dialog';
import { toast } from 'sonner';
import { addTimezoneHeader } from '@/lib/timezone-utils';
import { DropResult } from '@hello-pangea/dnd';

interface HomeClientProps {
  initialTodos: Todo[];
}

const usePersistentState = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue);

  // Load initial value from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        setValue(JSON.parse(stored));
        console.log(`📥 Loaded ${key} from localStorage:`, JSON.parse(stored));
      } catch (error) {
        console.error(`❌ Failed to parse stored value for key "${key}":`, error);
      }
    }
  }, [key]);

  // Save to localStorage whenever value changes
  useEffect(() => {
    console.log(`💾 Saving ${key} to localStorage:`, value);
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
};

export default function HomeClient({ initialTodos }: HomeClientProps) {
  const [todos, setTodos] = usePersistentState<Todo[]>('todos', initialTodos);
  const [showCompleted, setShowCompleted] = usePersistentState('showCompleted', false);
  const [isTableView, setIsTableView] = usePersistentState('isTableView', false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = usePersistentState<string>(
    'currentWorkspace',
    'personal'
  );
  const [isNewWorkspaceDialogOpen, setIsNewWorkspaceDialogOpen] = useState(false);
  // Command palette will be implemented later
  // const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isInputVisible, setIsInputVisible] = useState(false);
  const { data: session } = useSession();

  // Initialize user settings on first load: if no DB record exists, seed with defaults (browser timezone)
  useEffect(() => {
    if (!session?.user) return;
    const initSettings = async () => {
      try {
        const res = await fetch('/api/user/settings', { headers: addTimezoneHeader() });
        if (!res.ok) return;
        const data = (await res.json()) as Record<string, any>;
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
          });
        }
      } catch (error) {
        console.error('Failed to initialize user settings:', error);
      }
    };
    initSettings();
  }, [session?.user]);

  // Clear todos and localStorage on signout
  useEffect(() => {
    if (!session?.user) {
      // Clear todos state
      setTodos([]);
      setWorkspaces([]);
      setCurrentWorkspace('personal');

      // Clear localStorage
      localStorage.removeItem('todos');
      localStorage.removeItem('currentWorkspace');

      // Optional: Clear other localStorage items if needed
      localStorage.removeItem('showCompleted');
      localStorage.removeItem('isTableView');
    }
  }, [session?.user, setTodos, setCurrentWorkspace]);

  // Add keyboard shortcut handlers for workspace switching and input visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle workspace switching with Ctrl+Cmd+[number]
      if (e.ctrlKey && e.metaKey && !e.altKey && !e.shiftKey) {
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 1 && num <= 9) {
          e.preventDefault();
          const targetWorkspace = workspaces[num - 1];
          // Only switch if target workspace exists and is different from current
          if (targetWorkspace && targetWorkspace.id !== currentWorkspace) {
            setCurrentWorkspace(targetWorkspace.id);
            toast.success(`Switched to workspace: ${targetWorkspace.name}`);
          }
        }
      }

      // Handle 'n' key to show the input dialog
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        // Only trigger if not in an input or textarea
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          setIsInputVisible(true);
        }
      }

      // Handle Escape key to hide the input dialog
      if (e.key === 'Escape' && isInputVisible) {
        e.preventDefault();
        setIsInputVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [workspaces, setCurrentWorkspace, currentWorkspace, isInputVisible]);

  // Sync with server if logged in
  useEffect(() => {
    if (!session?.user) return;

    const syncWithServer = async () => {
      try {
        const res = await fetch('/api/todos');
        const remoteTodos = (await res.json()) as Todo[];

        // Helper function to generate a content hash for comparison
        const getContentHash = (todo: Todo) => {
          return `${todo.title?.toLowerCase().trim() || ''}_${todo.dueDate || ''}_${todo.urgency || 1}`;
        };

        // Helper function to update a remote todo
        const updateRemoteTodo = async (todoId: string, updates: { completed: boolean }) => {
          try {
            await fetch('/api/todos', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: todoId, ...updates }),
            });
          } catch (error) {
            console.error('Failed to update remote todo:', error);
          }
        };

        // Create content map of remote todos for comparison
        const remoteContentMap = new Map(
          remoteTodos.map((todo: Todo) => [getContentHash(todo), todo])
        );

        // Find local-only todos that don't exist on server by content
        const localOnlyTodos = todos.filter((todo) => {
          const contentHash = getContentHash(todo);
          const matchingRemoteTodo = remoteContentMap.get(contentHash);

          // If no content match found, or if content matches but completion status differs
          if (!matchingRemoteTodo) {
            return true; // Truly new todo
          }

          // If content matches but completion status is different, update the remote todo
          if (matchingRemoteTodo.completed !== todo.completed) {
            updateRemoteTodo(matchingRemoteTodo.id, { completed: todo.completed });
            return false;
          }

          return false; // Skip if content matches and no updates needed
        });

        // Sync local-only todos to server
        const syncPromises = localOnlyTodos.map((todo) =>
          fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: todo.title,
              dueDate: todo.dueDate,
              urgency: todo.urgency,
              completed: todo.completed,
            }),
          }).then((res) => res.json())
        );

        await Promise.all(syncPromises);

        // Fetch the latest state from server after all syncs and updates
        const finalRes = await fetch('/api/todos');
        const finalTodos = (await finalRes.json()) as Todo[];

        // Dedupe todos by content hash before setting state
        const uniqueTodos = Array.from(
          new Map(finalTodos.map((todo) => [getContentHash(todo), todo])).values()
        );

        setTodos(uniqueTodos);
      } catch (error) {
        console.error('Failed to sync with server:', error);
      }
    };

    syncWithServer();
  }, [session?.user, todos, setTodos]); // Include todos and setTodos in dependency array

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
  }, [session?.user, currentWorkspace, setCurrentWorkspace]);

  const addTodo = async (todo: Todo) => {
    const newTodo = {
      ...todo,
      comments: [],
      userId: session?.user?.id || 'local',
      workspaceId: currentWorkspace,
    };

    // Optimistic update - add to the beginning of the array
    setTodos((prev) => [newTodo, ...prev]);

    if (session?.user) {
      try {
        const res = await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: todo.title,
            dueDate: todo.dueDate,
            urgency: todo.urgency,
            workspaceId: currentWorkspace,
          }),
        });
        const serverTodo = await res.json();
        setTodos((prev) =>
          prev.map((t) => (t.id === newTodo.id ? { ...serverTodo, comments: [] } : t))
        );
      } catch (error) {
        console.error('Failed to add todo:', error);
        // Revert on error
        setTodos((prev) => prev.filter((t) => t.id !== newTodo.id));
      }
    }
  };

  const toggleTodo = async (id: string) => {
    const todoToUpdate = todos.find((t) => t.id === id);
    if (!todoToUpdate) return;

    // Optimistic update
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed, updatedAt: new Date() } : todo
      )
    );

    if (session?.user) {
      try {
        const res = await fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, completed: !todoToUpdate.completed }),
        });
        const updatedTodo = await res.json();
        setTodos((prev) => prev.map((todo) => (todo.id === id ? updatedTodo : todo)));
      } catch (error) {
        console.error('Failed to toggle todo:', error);
        // Revert on error
        setTodos((prev) =>
          prev.map((todo) =>
            todo.id === id ? { ...todo, completed: todoToUpdate.completed } : todo
          )
        );
      }
    }
  };

  const rescheduleTodo = async (id: string, newDate: string) => {
    const todoToUpdate = todos.find((t) => t.id === id);
    if (!todoToUpdate) {
      console.log('❌ Todo not found:', id);
      return;
    }

    console.log('🎯 Starting reschedule flow:', { id, newDate });
    console.log('📅 Previous due date:', todoToUpdate.dueDate);

    // Optimistic update
    console.log('🔄 Applying optimistic update...');
    setTodos((prev) => {
      const updated = prev.map((todo) =>
        todo.id === id ? { ...todo, dueDate: newDate, updatedAt: new Date() } : todo
      );
      console.log('📝 New todos state after optimistic update:', updated);
      return updated;
    });

    if (session?.user) {
      console.log('👤 User is logged in, syncing with server...');
      try {
        console.log('📤 Sending update to server:', { id, dueDate: newDate });
        const res = await fetch('/api/todos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, dueDate: newDate }),
        });
        const updatedTodo = await res.json();
        console.log('📥 Server response:', updatedTodo);

        // Only update if the server response includes the new date
        if (updatedTodo.dueDate === newDate) {
          console.log('✅ Server update successful, updating state with server response');
          setTodos((prev) => {
            const updated = prev.map((todo) => (todo.id === id ? updatedTodo : todo));
            console.log('📝 Final todos state:', updated);
            return updated;
          });
        } else {
          console.warn('⚠️ Server response dueDate does not match requested date', {
            requested: newDate,
            received: updatedTodo.dueDate,
          });
        }
      } catch (error) {
        console.error('❌ Failed to reschedule todo:', error);
        console.log('⏮️ Reverting to previous state...');

        // Revert on error
        setTodos((prev) => {
          const reverted = prev.map((todo) =>
            todo.id === id ? { ...todo, dueDate: todoToUpdate.dueDate } : todo
          );
          console.log('📝 Reverted todos state:', reverted);
          return reverted;
        });
      }
    } else {
      console.log('👤 User not logged in, skipping server sync');
    }
    console.log('✨ Reschedule flow complete');
  };

  const deleteTodo = async (id: string) => {
    console.log('Deleting todo:', id);

    // Find the todo to delete before removing it (for potential rollback)
    const todoToDelete = todos.find((t) => t.id === id);
    if (!todoToDelete) {
      console.warn('Attempted to delete non-existent todo with id:', id);
      return;
    }

    // Track the delete operation with a unique ID
    const deleteOperationId = `delete_${Date.now()}`;
    todoToDelete._deleteOperationId = deleteOperationId;

    // Create a copy to keep in case we need to restore
    const todoCopy = { ...todoToDelete };

    // Optimistic update - remove from state immediately
    setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id));

    // Notify user
    toast.success('Todo deleted', {
      id: deleteOperationId,
      description: todoToDelete.title,
      action: {
        label: 'Undo',
        onClick: () => {
          // Restore the todo if user clicks undo
          setTodos((currentTodos) => [...currentTodos, todoCopy]);
          // Cancel the server delete if it hasn't completed yet
          todoToDelete._deleteOperationId = null;
        },
      },
    });

    // If logged in, sync with server
    if (session?.user) {
      try {
        // Small delay to allow for undo
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Check if delete was cancelled via undo
        if (todoToDelete._deleteOperationId !== deleteOperationId) {
          console.log('Delete operation was cancelled by user');
          return;
        }

        console.log('Sending delete request to server');
        const response = await fetch('/api/todos', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        console.log('Todo successfully deleted on server');
      } catch (error) {
        console.error('Failed to delete todo on server:', error);

        // Check if the delete was canceled via undo first
        if (todoToDelete._deleteOperationId !== deleteOperationId) {
          return; // Deletion was already canceled, no need to restore
        }

        // Restore the todo if server delete failed
        setTodos((currentTodos) => [...currentTodos, todoCopy]);

        // Notify user of error
        toast.error('Failed to delete todo', {
          description: 'The item has been restored.',
        });
      }
    }
  };

  const addComment = async (todoId: string, comment: Comment) => {
    const newComment = {
      ...comment,
      user: session?.user
        ? {
            name: session.user.name || 'User',
            image: null,
          }
        : {
            name: 'Local User',
            image: null,
          },
    };

    // Optimistic update
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              comments: [...todo.comments, newComment],
            }
          : todo
      )
    );

    if (session?.user) {
      try {
        const res = await fetch('/api/todos/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ todoId, text: comment.text }),
        });
        const serverComment = await res.json();
        setTodos((prev) =>
          prev.map((todo) =>
            todo.id === todoId
              ? {
                  ...todo,
                  comments: todo.comments.map((c) =>
                    c.id === newComment.id
                      ? { ...serverComment, createdAt: new Date(serverComment.createdAt) }
                      : c
                  ),
                }
              : todo
          )
        );
      } catch (error) {
        console.error('Failed to add comment:', error);
        // Revert on error
        setTodos((prev) =>
          prev.map((todo) =>
            todo.id === todoId
              ? {
                  ...todo,
                  comments: todo.comments.filter((c) => c.id !== newComment.id),
                }
              : todo
          )
        );
      }
    }
  };

  const deleteComment = async (todoId: string, commentId: string) => {
    // Store comment for potential revert
    const todoToUpdate = todos.find((t) => t.id === todoId);
    const commentToDelete = todoToUpdate?.comments.find((c) => c.id === commentId);

    // Optimistic update
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              comments: todo.comments.filter((c) => c.id !== commentId),
            }
          : todo
      )
    );

    if (session?.user) {
      try {
        await fetch('/api/todos/comments', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ todoId, commentId }),
        });
      } catch (error) {
        console.error('Failed to delete comment:', error);
        // Revert on error
        if (commentToDelete) {
          setTodos((prev) =>
            prev.map((todo) =>
              todo.id === todoId
                ? {
                    ...todo,
                    comments: [...todo.comments, commentToDelete],
                  }
                : todo
            )
          );
        }
      }
    }
  };

  // Filter todos based on showCompleted state and current workspace
  const filteredTodos = todos
    .filter(
      (todo) =>
        todo.workspaceId === currentWorkspace ||
        (!todo.workspaceId && currentWorkspace === 'personal')
    )
    .filter((todo) => (showCompleted ? true : !todo.completed));

  const deleteWorkspace = async (workspaceId: string) => {
    // Don't delete if there are incomplete todos
    const hasIncompleteTodos = todos.some(
      (todo) => todo.workspaceId === workspaceId && !todo.completed
    );
    if (hasIncompleteTodos) {
      toast.error('Cannot delete workspace with incomplete todos');
      return;
    }

    // Store workspace for potential revert
    const workspaceToDelete = workspaces.find((w) => w.id === workspaceId);
    const workspaceName = workspaceToDelete?.name || 'Workspace';

    // Optimistic update
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));

    // If this was the current workspace, switch to another one
    if (workspaceId === currentWorkspace) {
      const remainingWorkspaces = workspaces.filter((w) => w.id !== workspaceId);
      if (remainingWorkspaces.length > 0) {
        setCurrentWorkspace(remainingWorkspaces[0].id);
      }
    }

    if (session?.user) {
      try {
        const res = await fetch('/api/workspaces', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: workspaceId }),
        });
        if (!res.ok) throw new Error('Failed to delete workspace');

        toast(`${workspaceName} deleted`);
      } catch (error) {
        console.error('Failed to delete workspace:', error);
        toast.error(`Failed to delete ${workspaceName}`);

        // Revert on error
        if (workspaceToDelete) {
          setWorkspaces((prev) => [...prev, workspaceToDelete]);
          if (workspaceId === currentWorkspace) {
            setCurrentWorkspace(workspaceId);
          }
        }
      }
    } else {
      toast(`${workspaceName} deleted`);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If there's no destination or the item was dropped in its original position
    if (!destination) {
      console.log('Drag canceled, no destination');
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      console.log('Item dropped in same position, no action needed');
      return;
    }

    console.log('Processing drag end:', {
      draggableId,
      source: source.droppableId,
      destination: destination.droppableId,
    });

    // Find the dragged todo by ID in our current state
    const draggedTodo = todos.find((t) => t.id === draggableId);
    if (!draggedTodo) {
      console.error('Could not find todo with id:', draggableId);
      return;
    }

    // Store original due date to rollback if needed
    const originalDueDate = draggedTodo.dueDate;

    // Calculate new due date based on destination column
    const today = new Date();
    let newDueDate: Date;

    // Helper function to determine what date to assign based on column
    const getDueDateForColumn = (columnId: string, index: number): Date => {
      const result = new Date();

      // First identify what view we're using - mobile, tablet, or desktop
      if (columnId === 'mobile-column') {
        // On mobile, don't change the date if not needed
        return draggedTodo.dueDate
          ? new Date(draggedTodo.dueDate)
          : new Date(today.setHours(today.getHours() + 1));
      }

      if (columnId.startsWith('tablet')) {
        const columnIndex = parseInt(columnId.split('-')[2]);

        if (columnIndex === 0) {
          // Today column
          return new Date(today.setHours(today.getHours() + 1));
        } else {
          // Upcoming - set to tomorrow + some random hours
          const random = Math.floor(Math.random() * 72); // Up to 3 days
          return new Date(today.setHours(today.getHours() + 24 + random));
        }
      }

      if (columnId.startsWith('desktop')) {
        const columnIndex = parseInt(columnId.split('-')[2]);

        if (columnIndex === 0) {
          // Today column - set to later today with some randomness
          return new Date(today.setHours(today.getHours() + 1 + Math.random() * 4));
        } else if (columnIndex === 1) {
          // This week - set to tomorrow + some random days (1-6)
          const randomDays = 1 + Math.floor(Math.random() * 6);
          const result = new Date(today);
          result.setDate(result.getDate() + randomDays);
          return result;
        } else {
          // Future - set to next week or later with randomness
          const randomDays = 8 + Math.floor(Math.random() * 14);
          const result = new Date(today);
          result.setDate(result.getDate() + randomDays);
          return result;
        }
      }

      // Fallback
      return new Date(today.setHours(today.getHours() + 2));
    };

    // Get new due date from the destination column
    newDueDate = getDueDateForColumn(destination.droppableId, destination.index);

    console.log(`Setting due date for "${draggedTodo.title}":`, {
      from: draggedTodo.dueDate,
      to: newDueDate.toISOString(),
    });

    // Create a unique ID for this update operation to track it
    const updateId = Date.now().toString();

    // Optimistic update: in a single operation to avoid duplicates
    setTodos((currentTodos) => {
      // Make a whole new array - no mutation!
      return currentTodos.map((todo) => {
        if (todo.id === draggableId) {
          // Return a new todo object with the updated due date
          return {
            ...todo,
            dueDate: newDueDate.toISOString(),
            _lastUpdateId: updateId, // Track this update
          };
        }
        return todo;
      });
    });

    // If the user is logged in, persist to the server
    if (session?.user) {
      // Slight delay to let the UI update first
      setTimeout(async () => {
        try {
          // Validate that the todo still exists and that another update hasn't happened
          const currentTodo = todos.find((t) => t.id === draggableId);
          if (
            !currentTodo ||
            (currentTodo._lastUpdateId && currentTodo._lastUpdateId !== updateId)
          ) {
            console.log('Skipping server update - state has changed since operation began');
            return;
          }

          console.log('Persisting todo update to server:', draggableId);
          const res = await fetch('/api/todos', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: draggableId,
              dueDate: newDueDate.toISOString(),
            }),
          });

          if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
          }

          const serverTodo = await res.json();

          // Final update with server data
          setTodos((currentTodos) =>
            currentTodos.map((todo) =>
              todo.id === draggableId ? { ...todo, ...serverTodo } : todo
            )
          );
        } catch (error) {
          console.error('Failed to update todo on server:', error);

          // Rollback on error
          setTodos((currentTodos) =>
            currentTodos.map((todo) =>
              todo.id === draggableId ? { ...todo, dueDate: originalDueDate } : todo
            )
          );

          // Notify user
          toast.error('Failed to update todo. Please try again.');
        }
      }, 100);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100 dark:bg-[#09090B] text-gray-900 dark:text-white transition-colors duration-200">
      <div
        className="fixed top-0 left-0 right-0 z-30 bg-gray-100 dark:bg-[#09090B] py-3 md:py-4 px-4 pt-safe flex-shrink-0"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex flex-row items-center justify-between w-full">
          <div className="flex items-center">
            <Image src="/logo.png" alt="agenda.dev" width={32} height={32} className="mr-2" />
            <h1 className="text-xl">agenda.dev</h1>
          </div>
          <div className="flex items-center space-x-1 md:space-x-2">
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
            <ViewToggle isTableView={isTableView} setIsTableView={setIsTableView} />
            <ThemeToggle />
            <FeedbackWidget />
            <LoginButton />
          </div>
        </div>
      </div>

      <motion.div
        layout
        className="flex-1 flex flex-col w-full max-w-[1200px] mx-auto mt-16 md:mt-20 px-4"
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Input Modal - Shown when 'n' key is pressed */}
        <AnimatePresence>
          {isInputVisible && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/20 backdrop-blur-md z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsInputVisible(false)}
              />
              <motion.div
                className="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="w-full max-w-[600px]"
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.8, y: 20 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <AITodoInput
                    onAddTodo={(todo) => {
                      addTodo(todo);
                      setIsInputVisible(false);
                    }}
                  />
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {/* On mobile, different layouts based on if there are todos */}
        <div className="flex flex-col h-full md:hidden">
          {filteredTodos.length > 0 ? (
            <>
              {/* With todos: list scrolls, input stays at bottom */}
              <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '160px' }}>
                <AnimatePresence mode="popLayout">
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
                </AnimatePresence>
              </div>

              <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-gray-100 dark:bg-[#09090B] z-20 ios-keyboard-support">
                <AITodoInput onAddTodo={addTodo} />
              </div>
            </>
          ) : (
            // No todos: position at bottom on mobile
            <div className="flex-1 flex flex-col justify-end">
              <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-gray-100 dark:bg-[#09090B] z-20 ios-keyboard-support">
                <AITodoInput onAddTodo={addTodo} />
              </div>
            </div>
          )}
        </div>

        {/* On desktop, centered vertically when empty, input at bottom when todos exist */}
        <div className="hidden md:flex flex-col h-full overflow-hidden relative">
          {/* Todo list appears when there are todos */}
          <AnimatePresence>
            {filteredTodos.length > 0 && (
              <motion.div
                className="flex-1 overflow-hidden w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ paddingBottom: '80px' }}
              >
                <div className="h-full overflow-y-auto w-full max-w-[1000px] mx-auto">
                  <AnimatePresence mode="popLayout">
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
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Show input directly when no todos exist, and + button when todos exist */}
          <AnimatePresence mode="wait">
            {filteredTodos.length === 0 ? (
              <motion.div
                key="empty-state-input"
                className="flex-1 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  duration: 0.4,
                  ease: [0.25, 0.1, 0.25, 1.0], // cubic-bezier easing
                  opacity: { duration: 0.5 },
                }}
              >
                <div className="w-full max-w-[600px] px-4">
                  <AITodoInput onAddTodo={addTodo} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="add-button"
                className="hidden md:block fixed bottom-6 right-6"
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 25,
                  opacity: { duration: 0.3 },
                }}
              >
                <button
                  onClick={() => setIsInputVisible(true)}
                  className="bg-gradient-to-b from-[#7c5aff] to-[#6c47ff] p-4 rounded-full shadow-lg hover:from-[#8f71ff] hover:to-[#7c5aff] transition-all duration-300"
                  title="New Todo (Press 'n')"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
                setWorkspaces((prev) => [...prev, workspace]);
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
  );
}
