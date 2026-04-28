import { PropsWithChildren } from 'react';

interface AppShellProps extends PropsWithChildren {
  className?: string;
}

export function AppShell({ children, className = '' }: AppShellProps) {
  return <div className={`min-h-screen bg-slate-100 text-slate-900 ${className}`}>{children}</div>;
}
