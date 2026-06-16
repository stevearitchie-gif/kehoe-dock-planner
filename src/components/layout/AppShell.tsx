import { PropsWithChildren, useEffect, useState } from 'react';

interface AppShellProps extends PropsWithChildren {
  className?: string;
}

function getCurrentOnlineStatus(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

export function AppShell({ children, className = '' }: AppShellProps) {
  const [isOnline, setIsOnline] = useState(getCurrentOnlineStatus);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={`relative min-h-screen bg-slate-100 text-slate-900 ${className}`}>
      {children}

      <div
        className={`fixed right-4 top-4 z-[9999] rounded-full border px-3 py-1.5 text-xs font-bold shadow-md ${
          isOnline
            ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
            : 'border-amber-300 bg-amber-100 text-amber-900'
        }`}
      >
        {isOnline ? 'Online' : 'Offline Mode'}
      </div>
    </div>
  );
}
