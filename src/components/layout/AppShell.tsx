import { PropsWithChildren, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

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
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

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

      {needRefresh && (
        <div className="fixed right-4 top-14 z-[9999] max-w-xs rounded-lg border border-brand-200 bg-white p-3 text-sm text-slate-800 shadow-lg">
          <p className="font-semibold text-slate-900">Update available</p>
          <p className="mt-1 text-xs text-slate-600">A newer version of Dock Planner is ready.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Reload app
            </button>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {offlineReady && !needRefresh && (
        <div className="fixed right-4 top-14 z-[9999] max-w-xs rounded-lg border border-emerald-200 bg-white p-3 text-sm text-slate-800 shadow-lg">
          <p className="font-semibold text-slate-900">Offline app ready</p>
          <p className="mt-1 text-xs text-slate-600">Dock Planner can now open from this device without internet.</p>
          <button
            type="button"
            onClick={() => setOfflineReady(false)}
            className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
