'use client';

import { FaComments } from 'react-icons/fa';

export default function FeedbackWidget() {
  return (
    <a
      href="https://exontodo.featurebase.app"
      target="_blank"
      rel="noopener noreferrer"
      className="h-8 w-8 rounded-full bg-white dark:bg-[#131316] text-gray-500 dark:text-gray-400 shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0px_4px_8px_-2px_rgba(0,0,0,0.24),0px_0px_0px_1px_rgba(0,0,0,1.00),inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] flex items-center justify-center transition-colors duration-200"
      aria-label="Send feedback"
      title="Send feedback"
    >
      <FaComments className="h-4 w-4" />
    </a>
  );
}
