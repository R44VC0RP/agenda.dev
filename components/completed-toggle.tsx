'use client';

import { CheckSquare } from 'lucide-react';

interface CompletedToggleProps {
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
}

export default function CompletedToggle({ showCompleted, setShowCompleted }: CompletedToggleProps) {
  return (
    <button
      onClick={() => setShowCompleted(!showCompleted)}
      className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors duration-200 ${
        showCompleted
          ? 'bg-[#7c5aff] text-white'
          : 'bg-white dark:bg-[#131316] text-gray-500 dark:text-gray-400'
      } shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24),0px_0px_0px_1px_rgba(0,0,0,1.00),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)]`}
      aria-label={showCompleted ? 'Hide completed todos' : 'Show completed todos'}
      title={showCompleted ? 'Hide completed todos' : 'Show completed todos'}
    >
      <CheckSquare className="h-4 w-4" />
    </button>
  );
}
