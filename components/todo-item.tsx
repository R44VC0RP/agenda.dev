'use client';

import { useState, useRef, type KeyboardEvent, useEffect, useLayoutEffect } from 'react';
import {
  Trash2,
  _ChevronDown,
  _ChevronUp,
  ChevronRight,
  MessageSquare,
  User,
  ArrowRight,
  RotateCcw,
  Check,
} from 'lucide-react';
import type { Todo, Comment } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import RescheduleDialog from './reschedule-dialog';
import { ShineBorder } from '@/components/magicui/shine-border';
import ReminderComment from './ReminderComment';
import { useSession } from '@/lib/auth-client';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddComment: (todoId: string, comment: Comment) => void;
  onDeleteComment: (todoId: string, commentId: string) => void;
  onReschedule: (id: string, newDate: string) => void;
}

const getTimeColor = (dateStr: string) => {
  const dueDate = new Date(dateStr);
  const now = new Date();
  const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return 'text-red-600 dark:text-red-300'; // Overdue
  } else if (diffHours <= 6) {
    return 'text-yellow-600 dark:text-yellow-300'; // Very soon
  } else if (diffHours <= 24) {
    return 'text-yellow-500 dark:text-yellow-200'; // Within 24 hours
  } else if (diffHours <= 72) {
    return 'text-green-600 dark:text-green-300'; // Within 3 days
  } else {
    return 'text-green-700 dark:text-green-400'; // More than 3 days
  }
};

const _getStatusStyle = (_dateStr: string) => {
  return 'relative';
};

const getStatusColors = (dateStr: string) => {
  const dueDate = new Date(dateStr);
  const now = new Date();
  const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return '#ef4444'; // Red
  } else if (diffHours <= 6) {
    return '#f59e0b'; // Amber
  } else if (diffHours <= 24) {
    return '#facc15'; // Yellow
  } else if (diffHours <= 72) {
    return '#4ade80'; // Light green
  } else {
    return '#22c55e'; // Green
  }
};

const _getStatusBorder = (_dateStr: string) => {
  // Return empty border to remove the colored border
  return 'none';
};

const _isPastDue = (dateStr: string): boolean => {
  const dueDate = new Date(dateStr);
  const now = new Date();
  return dueDate.getTime() < now.getTime();
};

const formatCommentDate = (dateInput: Date | string) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(date.toISOString());
};

// Animation hook that calculates content height for smoother animations
const useExpandableAnimation = (isOpen: boolean, ref: React.RefObject<HTMLDivElement>) => {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Function to calculate and set height
    const updateHeight = () => {
      // First remove any height constraints
      element.style.height = 'auto';
      element.style.position = 'absolute';
      element.style.visibility = 'hidden';
      element.style.display = 'block';

      // Get the natural content height
      const contentHeight = element.scrollHeight + 16; // Add extra padding

      // Reset element
      element.style.position = '';
      element.style.visibility = '';
      element.style.display = '';

      // Set the variable for animation to use
      element.style.setProperty('--auto-height', `${contentHeight}px`);

      return contentHeight;
    };

    if (isOpen) {
      // Let the browser calculate the real content height
      requestAnimationFrame(() => {
        updateHeight();
        // Height is now properly set for the animation
      });
    }
  }, [isOpen, ref]);
};

// Add new helper function to detect reminder commands
const detectReminderCommand = (text: string): { isCommand: boolean; command: string | null } => {
  const reminderRegex = /^(!remindme|!rmd)\s/i;
  const match = text.match(reminderRegex);
  return {
    isCommand: !!match,
    command: match ? match[1] : null,
  };
};

const TimeDisplay = ({ dueDate }: { dueDate: string }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimeLeft = () => {
      const due = new Date(dueDate);
      const now = new Date();
      const diffMs = due.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours <= 0) {
        setTimeLeft(formatDate(dueDate));
      } else if (diffHours <= 1) {
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${minutes}m left`);
      } else {
        setTimeLeft(formatDate(dueDate));
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000 * 30); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [dueDate]);

  return <span className={`${getTimeColor(dueDate)} font-medium`}>{timeLeft}</span>;
};

export default function TodoItem({
  todo,
  onToggle,
  onDelete,
  onAddComment,
  onDeleteComment,
  onReschedule,
}: TodoItemProps) {
  const { data: session } = useSession();
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const expandedContentRef = useRef<HTMLDivElement>(null);
  const [isReminderCommand, setIsReminderCommand] = useState(false);
  const [_reminderCommandType, setReminderCommandType] = useState<string | null>(null);
  const [isProcessingReminder, setIsProcessingReminder] = useState(false);

  // Use our animation hook
  useExpandableAnimation(isExpanded, expandedContentRef);

  const handleReminderCommand = async (text: string) => {
    setIsProcessingReminder(true);
    const reminderData = {
      todoId: todo.id,
      todoTitle: todo.title,
      comments: todo.comments,
      message: text,
    };

    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reminderData),
      });

      if (!response.ok) {
        throw new Error('Failed to create reminder');
      }

      const reminder = await response.json();

      // Add a comment to show the reminder was created
      const newComment: Comment = {
        id: uuidv4(),
        text: reminder.summary + '||' + reminder.id + '||' + reminder.reminderTime,
        todoId: todo.id,
        userId: todo.userId,
        createdAt: new Date(),
      };
      onAddComment(todo.id, newComment);
      setIsReminderCommand(false); // Remove shine border after success
    } catch (error) {
      console.error('Error creating reminder:', error);
      // Add an error comment
      const newComment: Comment = {
        id: uuidv4(),
        text: '❌ Failed to create reminder. Please try again.',
        todoId: todo.id,
        userId: todo.userId,
        createdAt: new Date(),
      };
      onAddComment(todo.id, newComment);
    } finally {
      setIsProcessingReminder(false);
    }
  };

  const handleAddComment = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
      e.preventDefault();
      const trimmedText = commentText.trim();

      // Check if this is a reminder command and user is authenticated
      const { isCommand } = detectReminderCommand(trimmedText);

      if (isCommand && session?.user) {
        await handleReminderCommand(trimmedText);
      } else {
        const newComment: Comment = {
          id: uuidv4(),
          text: trimmedText,
          todoId: todo.id,
          userId: todo.userId,
          createdAt: new Date(),
        };
        onAddComment(todo.id, newComment);
      }
      setCommentText('');
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);

    // Focus the comment input when expanding after animation completes
    if (!isExpanded) {
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 250);
    }
  };

  // Modify handleTextareaInput to detect reminder commands only for authenticated users
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    setCommentText(textarea.value);

    // Only detect reminder commands for authenticated users
    if (session?.user) {
      const { isCommand, command } = detectReminderCommand(textarea.value);
      setIsReminderCommand(isCommand);
      setReminderCommandType(command);
    }
  };

  return (
    <div
      id={`todo-${todo.id}`}
      className={`bg-white dark:bg-card rounded-[12px] transition-all duration-300 ease-in-out border border-gray-100 dark:border-gray-800 overflow-hidden relative w-full`}
      style={{
        boxShadow: isHovered
          ? '0 8px 20px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -5px rgba(0, 0, 0, 0.05)'
          : '0 1px 3px -1px rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        margin: '2px 4px 4px 4px',
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden',
        perspective: '1000px',
        maxWidth: 'calc(100% - 8px)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col relative">
        <div className="w-full h-full relative">
          {todo.dueDate && (
            <div
              className="absolute inset-0 z-0"
              style={{
                backgroundImage: `linear-gradient(to right, ${getStatusColors(todo.dueDate)}18 0%, ${getStatusColors(todo.dueDate)}03 80%, transparent 100%)`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'left top',
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}

          <div className="absolute top-2 right-2 z-10">
            <RescheduleDialog
              isOpen={showRescheduleDialog}
              onClose={() => setShowRescheduleDialog(false)}
              onConfirm={(newDate) => {
                onReschedule(todo.id, newDate);
                setShowRescheduleDialog(false);
              }}
              currentDate={todo.dueDate}
            />
          </div>

          <div className="p-4 cursor-pointer relative z-1" onClick={toggleExpand}>
            <div className="flex items-start gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(todo.id);
                }}
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border ${
                  todo.completed
                    ? 'bg-[#7c5aff]/20 border-[#7c5aff]/30'
                    : 'border-gray-300 dark:border-white/30'
                } flex items-center justify-center transition-colors`}
              >
                {todo.completed && <Check className="w-3 h-3 text-[#7c5aff]" />}
              </button>

              <div className="flex-1 min-w-0 relative z-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center w-[85%]">
                    <p
                      className={`text-[15px] font-normal ${
                        todo.completed
                          ? 'line-through text-gray-400 dark:text-white/50'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {todo.title}
                    </p>

                    {todo.comments.length > 0 && (
                      <div className="ml-2 flex items-center text-gray-400 dark:text-white/50 relative z-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="ml-1 text-xs">{todo.comments.length}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center relative">
                    {isHovered && (
                      <div
                        className="absolute right-0 h-full w-32 bg-gradient-to-l from-white/90 via-white/80 to-transparent dark:from-[#131316]/95 dark:via-[#131316]/70 dark:to-transparent z-[1] top-0 -mt-3 rounded-r-[12px] transition-opacity duration-200"
                        style={{
                          width: '40%',
                          right: '-16px',
                        }}
                      />
                    )}
                    {isHovered && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRescheduleDialog(true);
                        }}
                        className="absolute right-12 text-[#7c5aff] hover:text-[#8f71ff] transition-colors z-[2]"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    {isHovered && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(todo.id);
                        }}
                        className="absolute right-6 text-gray-400 hover:text-gray-600 dark:text-white/50 dark:hover:text-white/80 transition-colors z-[2]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <ChevronRight
                      className={`w-4 h-4 text-gray-400 dark:text-white/50 chevron-rotate ${isExpanded ? 'open' : ''}`}
                    />
                  </div>
                </div>

                <div className="flex items-center mt-1 text-[13px] space-x-1 relative z-1">
                  {todo.dueDate && <TimeDisplay dueDate={todo.dueDate} />}

                  <div className="flex items-center">
                    <span className="mr-1 text-gray-400 dark:text-white/50">Urgency:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-400 dark:text-white/50">
                        {todo.urgency.toFixed(1)}
                      </span>
                      <div className="w-8 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${(todo.urgency / 5) * 100}%`,
                            height: '100%',
                            background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='100%25' y1='0' y2='0'%3E%3Cstop offset='0' stop-color='%237c5aff'/%3E%3Cstop offset='50%25' stop-color='%237152ff'/%3E%3Cstop offset='100%25' stop-color='%236c47ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23a)'/%3E%3C/svg%3E")`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={expandedContentRef}
          className={`relative rounded-b-[12px] expand-content ${isExpanded ? 'open' : ''}`}
        >
          {isReminderCommand && !isProcessingReminder && (
            <ShineBorder
              borderWidth={1}
              duration={2}
              shineColor={['#7c5aff', '#7c5aff']}
              className="rounded-b-[12px]"
              style={
                {
                  '--border-radius': '12px',
                } as React.CSSProperties
              }
            />
          )}
          {isProcessingReminder && (
            <div className="absolute inset-0 bg-[#7c5aff]/5 dark:bg-[#7c5aff]/10 rounded-b-[12px] flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#7c5aff] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {isExpanded && (
            <div className="pt-3 pb-2 px-4">
              {/* Comments list */}
              {todo.comments.length > 0 && (
                <div className="mb-3 space-y-3 animate-in fade-in duration-200">
                  {todo.comments.map((comment, index) => (
                    <div
                      key={comment.id}
                      onMouseEnter={() => setHoveredCommentId(comment.id)}
                      onMouseLeave={() => setHoveredCommentId(null)}
                      className="group animate-in fade-in duration-200"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-1.5">
                          <User className="w-4 h-4 text-gray-400 dark:text-white/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <ReminderComment text={comment.text} createdAt={comment.createdAt} />
                              <div className="flex items-center gap-2 mt-1">
                                <div className="text-xs text-gray-400 dark:text-white/40">
                                  {comment.user?.name || 'Local User'}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-white/40">•</div>
                                <div className="text-xs text-gray-400 dark:text-white/40">
                                  {formatCommentDate(comment.createdAt)}
                                </div>
                                {comment.text.startsWith('!!RMD!!') && (
                                  <>
                                    <div className="text-xs text-gray-400 dark:text-white/40">
                                      •
                                    </div>
                                    <div className="text-xs text-[#7c5aff] dark:text-[#7c5aff] font-medium">
                                      Reminder Set
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                              {hoveredCommentId === comment.id && (
                                <button
                                  onClick={() => onDeleteComment(todo.id, comment.id)}
                                  className="text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/60 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment input */}
              <div className="flex items-start gap-3 pt-1">
                <div className="flex-shrink-0 pt-0.5">
                  <User className="w-4 h-4 text-gray-400 dark:text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <textarea
                    ref={commentInputRef}
                    value={commentText}
                    onChange={handleTextareaInput}
                    onKeyDown={handleAddComment}
                    placeholder={
                      session?.user
                        ? 'Add a comment... (Use !remindme or !rmd for reminders)'
                        : 'Add a comment...'
                    }
                    rows={1}
                    className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 text-[15px] transition-colors duration-200 resize-none overflow-hidden"
                    style={{ margin: 0, padding: 0, lineHeight: '1.5' }}
                  />
                </div>
                {commentText.trim() && (
                  <div className="flex-shrink-0 pt-0.5">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (commentText.trim()) {
                          const newComment: Comment = {
                            id: uuidv4(),
                            text: commentText.trim(),
                            todoId: todo.id,
                            userId: todo.userId,
                            createdAt: new Date(),
                          };
                          onAddComment(todo.id, newComment);
                          setCommentText('');
                        }
                      }}
                      className="md:hidden"
                    >
                      <ArrowRight className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/60 transition-colors" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
