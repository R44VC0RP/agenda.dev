'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Todo, Comment } from '@/lib/types';
import { format } from 'date-fns';
import { Trash2, Calendar, MessageSquare, Send, User, Check } from 'lucide-react';
import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// Delete confirmation removed
import RescheduleDialog from './reschedule-dialog';
import { formatDate } from '@/lib/utils';

interface TodoTableProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddComment: (todoId: string, comment: Comment) => void;
  onDeleteComment: (todoId: string, commentId: string) => void;
  onReschedule: (id: string, newDate: string) => void;
}

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

export default function TodoTable({
  todos,
  onToggle,
  onDelete,
  onAddComment,
  onDeleteComment,
  onReschedule,
}: TodoTableProps) {
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  // Removed delete confirmation
  const [showRescheduleDialog, setShowRescheduleDialog] = useState<string | null>(null);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const handleAddComment = (todoId: string) => {
    if (newComment.trim()) {
      onAddComment(todoId, {
        id: uuidv4(),
        todoId,
        text: newComment.trim(),
        userId: '',
        createdAt: new Date(),
      });
      setNewComment('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, todoId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment(todoId);
    }
  };

  return (
    <div className="overflow-hidden rounded-[12px] bg-[#131316] shadow-[0px_32px_64px_-16px_rgba(0,0,0,0.30)] shadow-[0px_16px_32px_-8px_rgba(0,0,0,0.30)] shadow-[0px_8px_16px_-4px_rgba(0,0,0,0.24)] shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24)] shadow-[0px_-8px_16px_-1px_rgba(0,0,0,0.16)] shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.24)] shadow-[0px_0px_0px_1px_rgba(0,0,0,1.00)] shadow-[inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.20)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Task</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Due Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Urgency</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Comments</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {todos.map((todo) => (
            <React.Fragment key={todo.id}>
              <motion.tr
                key={`row-${todo.id}`}
                id={`todo-${todo.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={() => {
                  setSelectedTodoId(selectedTodoId === todo.id ? null : todo.id);
                  if (selectedTodoId !== todo.id) {
                    setTimeout(() => {
                      commentInputRef.current?.focus();
                    }, 100);
                  }
                }}
                className={`border-b border-white/10 hover:bg-white/5 transition-colors duration-200 cursor-pointer ${
                  selectedTodoId === todo.id ? 'bg-white/5' : ''
                }`}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggle(todo.id)}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border ${
                      todo.completed ? 'bg-[#7c5aff]/20 border-[#7c5aff]/30' : 'border-white/30'
                    } flex items-center justify-center transition-colors`}
                  >
                    {todo.completed && <Check className="w-3 h-3 text-[#7c5aff]" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-sm ${todo.completed ? 'line-through text-gray-500' : 'text-white'}`}
                  >
                    {todo.title}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-400">
                    {todo.dueDate ? format(new Date(todo.dueDate), 'MMM d, yyyy') : '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#7c5aff] to-[#6c47ff]"
                        style={{ width: `${(todo.urgency / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400">{todo.urgency}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-400">
                    {todo.comments.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {todo.comments.length}
                      </div>
                    ) : (
                      '-'
                    )}
                  </span>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDelete(todo.id)}
                      className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowRescheduleDialog(todo.id)}
                      className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Delete confirmation removed */}
                  <RescheduleDialog
                    isOpen={showRescheduleDialog === todo.id}
                    onClose={() => setShowRescheduleDialog(null)}
                    onConfirm={(newDate) => {
                      onReschedule(todo.id, newDate);
                      setShowRescheduleDialog(null);
                    }}
                    currentDate={todo.dueDate}
                  />
                </td>
              </motion.tr>
              <AnimatePresence>
                {selectedTodoId === todo.id && (
                  <motion.tr
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 40,
                      opacity: { duration: 0.2 },
                    }}
                    className="border-b border-white/10 bg-white/5"
                  >
                    <td colSpan={6} className="px-4 py-4">
                      <motion.div
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        className="space-y-3"
                      >
                        {/* Existing comments */}
                        {todo.comments.length > 0 && (
                          <motion.div className="mb-6 space-y-4" layout>
                            {todo.comments.map((comment) => (
                              <motion.div
                                key={comment.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                onMouseEnter={() => setHoveredCommentId(comment.id)}
                                onMouseLeave={() => setHoveredCommentId(null)}
                                className="group"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 mt-0.5">
                                    <User className="w-4 h-4 text-white/40" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <div className="text-[15px] text-white/80 whitespace-pre-wrap break-words">
                                          {comment.text}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="text-xs text-white/40">
                                            {comment.user?.name || 'Local User'}
                                          </div>
                                          <div className="text-xs text-white/40">•</div>
                                          <div className="text-xs text-white/40">
                                            {formatCommentDate(comment.createdAt)}
                                          </div>
                                        </div>
                                      </div>
                                      <AnimatePresence>
                                        {hoveredCommentId === comment.id && (
                                          <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.15 }}
                                            onClick={() => onDeleteComment(todo.id, comment.id)}
                                            className="text-white/40 hover:text-white/60 transition-colors flex-shrink-0"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </motion.button>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}

                        {/* New comment input */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="flex items-start gap-3"
                        >
                          <div className="flex-shrink-0 mt-2">
                            <User className="w-4 h-4 text-white/40" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <input
                                ref={commentInputRef}
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, todo.id)}
                                placeholder="Add a comment..."
                                className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 border border-white/10 focus:outline-none focus:border-[#7c5aff] transition-colors duration-200"
                              />
                              <button
                                onClick={() => handleAddComment(todo.id)}
                                disabled={!newComment.trim()}
                                className={`p-2 rounded-full ${
                                  newComment.trim()
                                    ? 'text-[#7c5aff] hover:bg-[#7c5aff]/10'
                                    : 'text-gray-500'
                                } transition-colors duration-200`}
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
