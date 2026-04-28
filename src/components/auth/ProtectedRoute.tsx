import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        Loading Kehoe Dock Planner...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
