'use client';

import { LayoutGrid, Table } from 'lucide-react';

interface ViewToggleProps {
  isTableView: boolean;
  setIsTableView: (show: boolean) => void;
}

export default function ViewToggle({ isTableView, setIsTableView }: ViewToggleProps) {
  return (
    <button
      onClick={() => setIsTableView(!isTableView)}
      className={`hidden md:flex h-8 w-8 rounded-full items-center justify-center transition-colors duration-200 ${
        isTableView
          ? 'bg-[#7c5aff] text-white'
          : 'bg-white dark:bg-[#131316] text-gray-500 dark:text-gray-400'
      } shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24),0px_0px_0px_1px_rgba(0,0,0,1.00),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)]`}
      aria-label={isTableView ? 'Show card view' : 'Show table view'}
      title={isTableView ? 'Show card view' : 'Show table view'}
    >
      {isTableView ? <LayoutGrid className="h-4 w-4" /> : <Table className="h-4 w-4" />}
    </button>
  );
}
