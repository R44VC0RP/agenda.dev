'use client';

import { useEffect, useState } from 'react';
import { FaDownload } from 'react-icons/fa';

let deferredPrompt: any;

export default function PWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if on iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setIsInstallable(true);
    });

    // Reset installable state after installation
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      deferredPrompt = null;
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      deferredPrompt = null;
      setIsInstallable(false);
    }
  };

  if (!isInstallable && !isIOS) return null;

  return (
    <div className="fixed bottom-4 right-4">
      {isInstallable && (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
        >
          <FaDownload />
          Install App
        </button>
      )}
      {isIOS && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm">
            To install this app on your iPhone: tap the share button
            <span role="img" aria-label="share"> ⎋ </span>
            and then "Add to Home Screen"
            <span role="img" aria-label="plus"> ➕ </span>
          </p>
        </div>
      )}
    </div>
  );
} 