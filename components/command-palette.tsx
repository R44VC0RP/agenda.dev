'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Calendar,
  ArrowUpRight,
  MessageSquare,
  Plus,
  ChevronRight,
  User,
  Check,
  Trash2,
} from 'lucide-react';
import type { Todo, Comment, Workspace } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { IOSpinner } from './spinner';

interface CommandPaletteProps {
  todos: Todo[];
  workspaces: Workspace[];
  currentWorkspace: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onTodoSelect: (todo: Todo) => void;
  onWorkspaceSwitch: (workspaceId: string) => void;
  onWorkspaceCreate: (name: string) => void;
  onAddComment: (todoId: string, comment: Comment) => void;
  onAddTodo: (todo: Todo) => void;
  onMarkCompleted: (todoId: string) => void;
  onWorkspaceDelete: (workspaceId: string) => void;
  session: { user: any } | null;
}

type _Page =
  | 'root'
  | 'todo-details'
  | 'workspace-confirm'
  | 'workspace-create'
  | 'add-comment'
  | 'create-todo-title'
  | 'create-todo-date'
  | 'create-todo-urgency'
  | 'mark-completed'
  | 'mark-completed-confirm'
  | 'delete-workspace-confirm';

// Define types and master command registry for dynamic submenu flow
interface CommandStep {
  id: string;
  placeholder: string;
  validate?: (value: string) => boolean;
}
interface CommandConfig {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  steps: CommandStep[];
  handler: (inputs: Record<string, string>) => void;
}

export default function CommandPalette({
  todos,
  workspaces,
  currentWorkspace,
  isOpen,
  setIsOpen,
  onTodoSelect,
  onWorkspaceSwitch,
  onWorkspaceCreate,
  onAddComment,
  onAddTodo,
  onMarkCompleted,
  onWorkspaceDelete,
  session,
}: CommandPaletteProps) {
  const [search, setSearch] = React.useState('');
  const [activeCommand, setActiveCommand] = React.useState<string>('root');
  const [_stepIndex, setStepIndex] = React.useState<number>(0);
  const [_commandInputs, setCommandInputs] = React.useState<Record<string, string>>({});
  const [selectedTodo, setSelectedTodo] = React.useState<Todo | null>(null);
  const [_selectedWorkspace, setSelectedWorkspace] = React.useState<Workspace | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState('');
  const [newComment, setNewComment] = React.useState('');
  const [newTodoTitle, setNewTodoTitle] = React.useState('');
  const [newTodoDate, setNewTodoDate] = React.useState('');
  const [newTodoUrgency, setNewTodoUrgency] = React.useState(3);
  const [isDateLoading, setIsDateLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Add new state for mark completed flow
  const [todoToComplete, setTodoToComplete] = React.useState<Todo | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = React.useState<Workspace | null>(null);

  // Add helper function to check if workspace can be deleted
  const canDeleteWorkspace = (workspace: Workspace) => {
    return !todos.some((todo) => todo.workspaceId === workspace.id && !todo.completed);
  };

  // Determine if we're in a text-input submode (hiding the command list)
  const inputModes = [
    'add-comment',
    'create-todo-title',
    'create-todo-date',
    'create-todo-urgency',
    'workspace-create',
  ] as const;
  const isInputMode = activeCommand
    ? inputModes.includes(activeCommand as (typeof inputModes)[number])
    : false;

  // Pick the right value for the input based on mode
  const inputValue = (() => {
    switch (activeCommand) {
      case 'add-comment':
        return newComment;
      case 'create-todo-title':
        return newTodoTitle;
      case 'create-todo-date':
        return newTodoDate;
      case 'create-todo-urgency':
        return newTodoUrgency.toFixed(1);
      case 'workspace-create':
        return newWorkspaceName;
      default:
        return search;
    }
  })();

  // Handle input changes
  const handleInputChange = (val: string) => {
    switch (activeCommand) {
      case 'add-comment':
        setNewComment(val);
        break;
      case 'create-todo-title':
        setNewTodoTitle(val);
        break;
      case 'create-todo-date':
        setNewTodoDate(val);
        break;
      case 'workspace-create':
        setNewWorkspaceName(val);
        break;
      default:
        setSearch(val);
    }
  };

  // Dynamic placeholder
  const placeholderText = (() => {
    switch (activeCommand) {
      case 'add-comment':
        return 'Type a comment and press Enter...';
      case 'create-todo-title':
        return 'What needs to be done?';
      case 'create-todo-date':
        return 'When is it due? (e.g., tomorrow)';
      case 'create-todo-urgency':
        return 'Set urgency (use ↑↓)';
      case 'workspace-create':
        return 'Workspace name';
      case 'mark-completed':
        return 'Filter todos to mark as completed...';
      case 'mark-completed-confirm':
        return 'Press Enter again to confirm...';
      default:
        return 'Search todos and workspaces...';
    }
  })();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeCommand !== 'root') {
          setActiveCommand('root');
          setStepIndex(0);
          setCommandInputs({});
        } else {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen, setIsOpen, activeCommand]);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
      setActiveCommand('root');
      setStepIndex(0);
      setCommandInputs({});
      setSelectedTodo(null);
      setSelectedWorkspace(null);
      setNewWorkspaceName('');
      setNewComment('');
      resetCreateTodoState();
    }
  }, [isOpen]);

  // Focus management for different pages
  React.useEffect(() => {
    if (
      activeCommand === 'create-todo-title' ||
      activeCommand === 'create-todo-date' ||
      activeCommand === 'workspace-create'
    ) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [activeCommand]);

  const filteredTodos = React.useMemo(() => {
    if (!search) return todos;
    const searchLower = search.toLowerCase();
    return todos.filter((todo) => todo.title.toLowerCase().includes(searchLower));
  }, [todos, search]);

  // Filter incomplete todos for mark completed page
  const incompleteTodos = React.useMemo(() => {
    const filtered = todos.filter((todo) => !todo.completed);
    if (!search) return filtered;
    const searchLower = search.toLowerCase();
    return filtered.filter((todo) => todo.title.toLowerCase().includes(searchLower));
  }, [todos, search]);

  const handleCreateTodoSubmit = async () => {
    if (activeCommand === 'create-todo-title' && newTodoTitle.trim()) {
      setActiveCommand('create-todo-date');
    } else if (activeCommand === 'create-todo-date' && newTodoDate.trim()) {
      setIsDateLoading(true);
      try {
        const result = await fetch('/api/convert-date', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newTodoDate.trim() }),
        }).then((res) => res.json());
        setNewTodoDate(result.formattedDateTime);
        setActiveCommand('create-todo-urgency');
      } catch (error) {
        console.error('Failed to convert date:', error);
      } finally {
        setIsDateLoading(false);
      }
    } else if (activeCommand === 'create-todo-urgency') {
      onAddTodo({
        id: uuidv4(),
        title: newTodoTitle,
        dueDate: newTodoDate || undefined,
        urgency: Number(newTodoUrgency.toFixed(1)),
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: '',
        comments: [],
      });
      setIsOpen(false);
      resetCreateTodoState();
    }
  };

  const resetCreateTodoState = () => {
    setNewTodoTitle('');
    setNewTodoDate('');
    setNewTodoUrgency(3);
    setActiveCommand('root');
  };

  const handleUrgencyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTodoSubmit();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (e.shiftKey) {
        setNewTodoUrgency((prev) => Math.min(5, +(prev + 0.1).toFixed(1)));
      } else {
        setNewTodoUrgency((prev) => Math.min(5, Math.floor(prev) + 1));
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (e.shiftKey) {
        setNewTodoUrgency((prev) => Math.max(1, +(prev - 0.1).toFixed(1)));
      } else {
        setNewTodoUrgency((prev) => Math.max(1, Math.floor(prev) - 1));
      }
      return;
    }
  };

  const _COMMANDS: Record<string, CommandConfig> = {
    'create-todo': {
      id: 'create-todo',
      icon: Plus,
      steps: [
        {
          id: 'title',
          placeholder: 'What needs to be done?',
          validate: (val) => val.trim() !== '',
        },
        { id: 'date', placeholder: 'When is it due? (e.g., tomorrow)' },
        { id: 'urgency', placeholder: 'Set urgency (use ↑↓, hold Shift for fine-tuning)' },
      ],
      handler: (inputs) => {
        onAddTodo({
          id: uuidv4(),
          title: inputs.title,
          dueDate: inputs.date || undefined,
          urgency: parseFloat(inputs.urgency),
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: '',
          comments: [],
        });
        setIsOpen(false);
      },
    },
    'create-workspace': {
      id: 'create-workspace',
      icon: Plus,
      steps: [{ id: 'name', placeholder: 'Workspace name', validate: (val) => val.trim() !== '' }],
      handler: (inputs) => {
        onWorkspaceCreate(inputs.name);
        setIsOpen(false);
      },
    },
    // add other commands (mark-completed, add-comment, delete-workspace, etc.)
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-[640px] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <Command
                className="w-full bg-white dark:bg-[#131316] rounded-[12px] overflow-hidden shadow-[0px_32px_64px_-16px_rgba(0,0,0,0.30)] dark:shadow-[0px_32px_64px_-16px_rgba(0,0,0,0.30)] dark:shadow-[0px_16px_32px_-8px_rgba(0,0,0,0.30)] dark:shadow-[0px_8px_16px_-4px_rgba(0,0,0,0.24)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24)] dark:shadow-[0px_-8px_16px_-1px_rgba(0,0,0,0.16)] dark:shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.24)] dark:shadow-[0px_0px_0px_1px_rgba(0,0,0,1.00)] dark:shadow-[inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] dark:shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.20)]"
                shouldFilter={false}
                loop
                defaultValue={
                  activeCommand === 'mark-completed-confirm' ? 'confirm-completion' : undefined
                }
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    if (activeCommand !== 'root') {
                      setActiveCommand('root');
                      setStepIndex(0);
                      setCommandInputs({});
                    } else {
                      setIsOpen(false);
                    }
                  }
                }}
              >
                <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-white/10">
                  <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <Command.Input
                    ref={inputRef}
                    value={inputValue}
                    onValueChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (activeCommand === 'add-comment' && e.key === 'Enter') {
                        e.preventDefault();
                        if (newComment.trim() && selectedTodo) {
                          onAddComment(selectedTodo.id, {
                            id: uuidv4(),
                            text: newComment.trim(),
                            todoId: selectedTodo.id,
                            userId: selectedTodo.userId,
                            createdAt: new Date(),
                          });
                          setNewComment('');
                          setActiveCommand('todo-details');
                        }
                        return;
                      }
                      if (
                        (activeCommand === 'create-todo-title' ||
                          activeCommand === 'create-todo-date') &&
                        e.key === 'Enter'
                      ) {
                        e.preventDefault();
                        handleCreateTodoSubmit();
                        return;
                      }
                      if (activeCommand === 'create-todo-urgency') {
                        handleUrgencyKeyDown(e);
                      }
                    }}
                    placeholder={placeholderText}
                    className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-[15px]"
                  />
                  <kbd className="hidden md:inline-flex items-center gap-1 px-2 h-6 bg-gray-100 dark:bg-white/10 rounded text-[12px] font-medium text-gray-500 dark:text-gray-400">
                    {activeCommand !== 'root' ? 'esc' : 'esc to close'}
                  </kbd>
                </div>

                {!isInputMode && (
                  <Command.List className="max-h-[300px] overflow-y-auto overscroll-contain py-2">
                    {activeCommand === 'root' && (
                      <>
                        {search.toLowerCase().startsWith('m') && (
                          <Command.Group
                            heading="Actions"
                            className="px-2 mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500 dark:[&_[cmdk-group-heading]]:text-gray-400"
                          >
                            <Command.Item
                              value="mark-completed"
                              onSelect={() => {
                                setActiveCommand('mark-completed');
                                setSearch('');
                              }}
                              role="option"
                              className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                            >
                              <Check className="w-3.5 h-3.5 text-[#7c5aff]" />
                              <span>Mark as completed</span>
                            </Command.Item>
                          </Command.Group>
                        )}

                        {(search.toLowerCase().startsWith('c') ||
                          search.toLowerCase().startsWith('a') ||
                          search.toLowerCase().startsWith('m') ||
                          search.toLowerCase().startsWith('n') ||
                          search.toLowerCase().startsWith('t')) && (
                          <Command.Group
                            heading="Create"
                            className="px-2 mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500 dark:[&_[cmdk-group-heading]]:text-gray-400"
                          >
                            <Command.Item
                              value="create-todo add-todo make-todo new-todo task-todo"
                              onSelect={() => {
                                setActiveCommand('create-todo');
                                setSearch('');
                              }}
                              role="option"
                              className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#7c5aff]" />
                              <span>Create a todo</span>
                            </Command.Item>
                            <Command.Item
                              value="create-workspace"
                              onSelect={() => setActiveCommand('create-workspace')}
                              role="option"
                              className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#7c5aff]" />
                              <span>Create new workspace</span>
                            </Command.Item>
                          </Command.Group>
                        )}

                        {session?.user && (
                          <Command.Group
                            heading="Workspaces"
                            className="px-2 mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500 dark:[&_[cmdk-group-heading]]:text-gray-400"
                          >
                            {workspaces
                              .filter((workspace) => workspace.id !== currentWorkspace)
                              .map((workspace) => (
                                <Command.Item
                                  key={workspace.id}
                                  value={`workspace-${workspace.id}`}
                                  onSelect={() => {
                                    onWorkspaceSwitch(workspace.id);
                                    setIsOpen(false);
                                  }}
                                  role="option"
                                  className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                                >
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full ${workspace.id === currentWorkspace ? 'bg-[#7c5aff]' : 'bg-gray-400'}`}
                                  />
                                  <span className="flex-1 truncate">{workspace.name}</span>
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                                </Command.Item>
                              ))}
                          </Command.Group>
                        )}

                        {session?.user &&
                          (search.toLowerCase().startsWith('d') ||
                            search.toLowerCase().startsWith('r')) && (
                            <Command.Group
                              heading="Actions"
                              className="px-2 mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500 dark:[&_[cmdk-group-heading]]:text-gray-400"
                            >
                              {workspaces.map((workspace) => {
                                if (!canDeleteWorkspace(workspace)) return null;
                                return (
                                  <Command.Item
                                    key={workspace.id}
                                    value={`delete-workspace-${workspace.id} remove-workspace-${workspace.id}`}
                                    onSelect={() => {
                                      setWorkspaceToDelete(workspace);
                                      setActiveCommand('delete-workspace-confirm');
                                    }}
                                    role="option"
                                    className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    <span>Delete workspace &quot;{workspace.name}&quot;</span>
                                  </Command.Item>
                                );
                              })}
                            </Command.Group>
                          )}

                        <Command.Group
                          heading="Todos"
                          className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500 dark:[&_[cmdk-group-heading]]:text-gray-400"
                        >
                          {filteredTodos.map((todo) => (
                            <Command.Item
                              key={todo.id}
                              value={todo.title}
                              onSelect={() => {
                                setSelectedTodo(todo);
                                setNewComment('');
                                setActiveCommand('add-comment');
                              }}
                              role="option"
                              className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none group"
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${todo.completed ? 'bg-green-500' : 'bg-[#7c5aff]'}`}
                              />
                              <span className="flex-1 truncate">{todo.title}</span>
                              <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                                {todo.dueDate && (
                                  <div className="flex items-center gap-1.5 min-w-[100px] justify-end">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{new Date(todo.dueDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {todo.comments.length > 0 && (
                                  <div className="flex items-center gap-1.5 min-w-[40px] justify-end">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>{todo.comments.length}</span>
                                  </div>
                                )}
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 group-aria-selected:opacity-100 transition-opacity" />
                              </div>
                            </Command.Item>
                          ))}
                        </Command.Group>
                      </>
                    )}

                    {activeCommand === 'workspace-create' && (
                      <div className="px-4 py-2">
                        <Command.Item
                          value="confirm-create-workspace"
                          onSelect={() => {
                            if (newWorkspaceName.trim()) {
                              onWorkspaceCreate(newWorkspaceName.trim());
                              setIsOpen(false);
                            }
                          }}
                          role="option"
                          className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#7c5aff]" />
                          <span>Create &quot;{newWorkspaceName || 'unnamed'}&quot; workspace</span>
                        </Command.Item>
                      </div>
                    )}

                    {activeCommand === 'todo-details' && selectedTodo && (
                      <>
                        <div className="px-6 py-2 mb-2">
                          <h3 className="text-[13px] font-medium text-gray-900 dark:text-white mb-1">
                            {selectedTodo.title}
                          </h3>
                          <div className="flex items-center gap-4 text-[13px] text-gray-500 dark:text-gray-400">
                            {selectedTodo.dueDate && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{new Date(selectedTodo.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{selectedTodo.comments.length} comments</span>
                            </div>
                          </div>
                        </div>

                        <Command.Group heading="Actions" className="px-2 mb-2">
                          <Command.Item
                            value="add-comment"
                            onSelect={() => setActiveCommand('add-comment')}
                            role="option"
                            className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#7c5aff]" />
                            <span>Add comment</span>
                          </Command.Item>
                          <Command.Item
                            value="view-todo"
                            onSelect={() => {
                              onTodoSelect(selectedTodo);
                              setIsOpen(false);
                            }}
                            role="option"
                            className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                            <span>View in list</span>
                          </Command.Item>
                        </Command.Group>

                        {selectedTodo.comments.length > 0 && (
                          <Command.Group heading="Comments" className="px-2">
                            {selectedTodo.comments.map((comment) => (
                              <div key={comment.id} className="px-4 py-2">
                                <div className="flex items-start gap-2">
                                  <User className="w-3.5 h-3.5 mt-0.5 text-gray-400 dark:text-gray-500" />
                                  <div>
                                    <p className="text-[13px] text-gray-900 dark:text-white">
                                      {comment.text}
                                    </p>
                                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                                      {comment.user?.name || 'Anonymous'} •{' '}
                                      {new Date(comment.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </Command.Group>
                        )}
                      </>
                    )}

                    {/* Custom submenu for adding a comment: show existing comments then actions */}
                    {activeCommand === 'add-comment' && selectedTodo && (
                      <Command.List className="px-2 py-1">
                        {selectedTodo.comments.length > 0 && (
                          <Command.Group
                            heading="Comments"
                            className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500 dark:[&_[cmdk-group-heading]]:text-gray-400"
                          >
                            {selectedTodo.comments.map((comment) => (
                              <div key={comment.id} className="px-4 py-2">
                                <div className="flex items-start gap-2">
                                  <User className="w-3.5 h-3.5 mt-0.5 text-gray-400 dark:text-gray-500" />
                                  <div>
                                    <p className="text-[13px] text-gray-900 dark:text-white">
                                      {comment.text}
                                    </p>
                                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                                      {comment.user?.name || 'Anonymous'} •{' '}
                                      {new Date(comment.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </Command.Group>
                        )}
                        <Command.Group
                          heading="Actions"
                          className="px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500 dark:[&_[cmdk-group-heading]]:text-gray-400"
                        >
                          <Command.Item
                            value="submit-comment"
                            onSelect={() => {
                              if (newComment.trim()) {
                                onAddComment(selectedTodo.id, {
                                  id: uuidv4(),
                                  text: newComment.trim(),
                                  todoId: selectedTodo.id,
                                  userId: selectedTodo.userId,
                                  createdAt: new Date(),
                                });
                                setNewComment('');
                                setActiveCommand('todo-details');
                              }
                            }}
                            role="option"
                            className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#7c5aff]" />
                            <span>Add comment</span>
                          </Command.Item>
                          <Command.Item
                            value="mark-completed"
                            onSelect={() => {
                              onMarkCompleted(selectedTodo.id);
                              setIsOpen(false);
                              setActiveCommand('root');
                            }}
                            role="option"
                            className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-green-100 dark:aria-selected:bg-green-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                          >
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            <span>Mark as completed</span>
                          </Command.Item>
                        </Command.Group>
                      </Command.List>
                    )}

                    {activeCommand === 'create-todo-title' && (
                      <div className="px-4 py-2">
                        <div className="mb-4 text-[13px] text-gray-500 dark:text-gray-400">
                          Enter todo title
                        </div>
                        <Command.Input
                          ref={inputRef}
                          autoFocus
                          value={newTodoTitle}
                          onValueChange={setNewTodoTitle}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTodoTitle.trim()) {
                              e.preventDefault();
                              handleCreateTodoSubmit();
                            }
                          }}
                          placeholder="what's on your agenda?"
                          className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-[15px]"
                        />
                      </div>
                    )}

                    {activeCommand === 'create-todo-date' && (
                      <div className="px-4 py-2">
                        <div className="mb-4 text-[13px] text-gray-500 dark:text-gray-400">
                          When is it due? (e.g., tomorrow, next week)
                        </div>
                        <div className="flex items-center gap-2">
                          <Command.Input
                            ref={inputRef}
                            autoFocus
                            value={newTodoDate}
                            onValueChange={setNewTodoDate}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newTodoDate.trim()) {
                                e.preventDefault();
                                handleCreateTodoSubmit();
                              }
                            }}
                            placeholder="tomorrow, next week, etc."
                            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-[15px]"
                            disabled={isDateLoading}
                          />
                          {isDateLoading && <IOSpinner />}
                        </div>
                      </div>
                    )}

                    {activeCommand === 'create-todo-urgency' && (
                      <div className="px-4 py-2">
                        <div className="mb-4 text-[13px] text-gray-500 dark:text-gray-400">
                          Set urgency (use ↑↓, hold Shift for fine-tuning)
                        </div>
                        <div className="flex items-center gap-4">
                          <Command.Input
                            ref={inputRef}
                            autoFocus
                            value={newTodoUrgency.toFixed(1)}
                            onValueChange={() => {}}
                            onKeyDown={handleUrgencyKeyDown}
                            className="w-12 bg-transparent border-none outline-none text-gray-900 dark:text-white text-[15px]"
                          />
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-[#7c5aff] to-[#6c47ff]"
                              style={{ width: `${(newTodoUrgency / 5) * 100}%` }}
                              initial={false}
                              animate={{ width: `${(newTodoUrgency / 5) * 100}%` }}
                              transition={{ duration: 0.1 }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Press Enter to create todo</div>
                      </div>
                    )}

                    {activeCommand === 'mark-completed' && (
                      <Command.Group heading="Select todo to mark as completed" className="px-2">
                        {incompleteTodos.map((todo) => (
                          <Command.Item
                            key={todo.id}
                            value={todo.title}
                            onSelect={() => {
                              setTodoToComplete(todo);
                              setActiveCommand('mark-completed-confirm');
                            }}
                            role="option"
                            className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#7c5aff]" />
                            <span className="flex-1 truncate">{todo.title}</span>
                            {todo.dueDate && (
                              <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{new Date(todo.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}

                    {activeCommand === 'mark-completed-confirm' && todoToComplete && (
                      <Command.Group heading="Confirm completion" className="px-2">
                        <Command.Item
                          value="confirm-completion"
                          onSelect={() => {
                            onMarkCompleted(todoToComplete.id);
                            setIsOpen(false);
                            setTodoToComplete(null);
                            setActiveCommand('root');
                          }}
                          role="option"
                          className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                        >
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span>Mark &quot;{todoToComplete.title}&quot; as completed</span>
                        </Command.Item>
                      </Command.Group>
                    )}

                    {activeCommand === 'delete-workspace-confirm' && workspaceToDelete && (
                      <Command.Group heading="Confirm deletion" className="px-2">
                        <Command.Item
                          value="confirm-delete-workspace"
                          onSelect={() => {
                            onWorkspaceDelete(workspaceToDelete.id);
                            setIsOpen(false);
                            setWorkspaceToDelete(null);
                            setActiveCommand('root');
                          }}
                          role="option"
                          className="px-4 py-2 flex items-center gap-3 text-[13px] text-gray-900 dark:text-white cursor-pointer rounded-[6px] aria-selected:bg-[#7c5aff]/10 dark:aria-selected:bg-[#7c5aff]/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 outline-none"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Confirm delete &quot;{workspaceToDelete.name}&quot; workspace</span>
                        </Command.Item>
                      </Command.Group>
                    )}
                  </Command.List>
                )}
              </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
