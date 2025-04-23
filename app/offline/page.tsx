'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-[#09090B] text-gray-900 dark:text-white p-4">
      <h1 className="text-4xl font-bold mb-4">You're Offline</h1>
      <p className="text-lg mb-8">Please check your internet connection and try again.</p>
      <button 
        onClick={() => window.location.reload()} 
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Retry
      </button>
    </div>
  );
} 