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
        className={`fixed bottom-3 right-3 z-50 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${
          isOnline
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        {isOnline ? 'Online' : 'Offline - saved locally when available'}
      </div>
    </div>
  );
}
