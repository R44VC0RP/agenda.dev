'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown, FaPlus, FaTrash } from 'react-icons/fa';
import type { Workspace, Todo } from '@/lib/types';

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspace: string;
  onSwitch: (id: string) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
  todos: Todo[];
}

export default function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  onSwitch,
  onCreateNew,
  onDelete,
  todos,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const current = workspaces.find((w) => w.id === currentWorkspace);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper function to check if workspace can be deleted
  const canDeleteWorkspace = (workspace: Workspace) => {
    return !todos.some((todo) => todo.workspaceId === workspace.id && !todo.completed);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-3 rounded-full bg-white dark:bg-[#131316] flex items-center gap-2 shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24),0px_0px_0px_1px_rgba(0,0,0,1.00),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] transition-colors duration-200"
      >
        <span className="text-sm text-gray-900 dark:text-white">{current?.name || 'Personal'}</span>
        <FaChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 mt-2 w-48 py-1 bg-white dark:bg-[#131316] rounded-lg shadow-lg dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24),0px_0px_0px_1px_rgba(0,0,0,1.00),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] z-50"
          >
            {workspaces.map((workspace, index) => (
              <div key={workspace.id} className="flex items-center">
                <button
                  onClick={() => {
                    onSwitch(workspace.id);
                    setIsOpen(false);
                  }}
                  className="flex-1 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-white transition-colors duration-200 flex items-center justify-between"
                >
                  <span>{workspace.name}</span>
                  {index < 9 && (
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-white/10 rounded text-gray-500 dark:text-gray-400 font-mono">
                      ⌃⌘{index + 1}
                    </kbd>
                  )}
                </button>
                {canDeleteWorkspace(workspace) && (
                  <button
                    onClick={() => {
                      onDelete(workspace.id);
                      setIsOpen(false);
                    }}
                    className="px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-200"
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                onCreateNew();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-white transition-colors duration-200 flex items-center gap-2"
            >
              <FaPlus className="w-3 h-3" />
              <span>New Workspace</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
