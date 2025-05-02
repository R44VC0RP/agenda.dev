'use client';

import { useEffect, useState } from 'react';
import HomeClient from '../HomeClient';
import { useTauri } from '@/components/ui/tauri-provider';
import { Todo } from '@/lib/types';

export default function DesktopApp() {
  const { isTauri } = useTauri();
  const [initialTodos, setInitialTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load todos from localStorage on mount
  useEffect(() => {
    if (isTauri) {
      try {
        const stored = localStorage.getItem('todos');
        if (stored !== null) {
          setInitialTodos(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load stored todos:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isTauri]);

  // For desktop builds, always assume we're in Tauri
  // The app is built specifically for desktop in this case
  useEffect(() => {
    // In dev or if specifically not a desktop build, redirect
    if (
      !isTauri &&
      process.env.NODE_ENV !== 'development' &&
      process.env.NEXT_PUBLIC_IS_DESKTOP !== 'true'
    ) {
      window.location.href = '/';
    }
  }, [isTauri]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <HomeClient initialTodos={initialTodos} />
    </main>
  );
}
