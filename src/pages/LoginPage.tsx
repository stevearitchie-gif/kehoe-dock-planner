import { LoginForm } from '@/components/auth/LoginForm';
import { AppShell } from '@/components/layout/AppShell';

export function LoginPage() {
  return (
    <AppShell className="flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Kehoe Dock Planner</h1>
        <p className="mb-6 text-sm text-slate-600">Internal planning workspace access</p>
        <LoginForm />
      </div>
    </AppShell>
  );
}
