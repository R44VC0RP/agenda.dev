import type { Todo } from '@/lib/types';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    // Format time
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // If it's today or tomorrow, show that instead of the date
    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;

    // For other dates, show the full format
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

interface OldTodoFormat {
  id: string;
  text: string;
  date: string;
  urgency: number;
  completed: boolean;
  createdAt: string;
  comments: any[];
}

export function convertOldTodoFormat(oldTodo: OldTodoFormat): Todo {
  return {
    id: oldTodo.id,
    title: oldTodo.text,
    completed: oldTodo.completed,
    userId: 'local', // Default to local for old todos
    createdAt: new Date(oldTodo.createdAt),
    updatedAt: new Date(oldTodo.createdAt), // Use createdAt as updatedAt since it wasn't tracked before
    comments: oldTodo.comments,
    dueDate: oldTodo.date,
    urgency: oldTodo.urgency,
  };
}
