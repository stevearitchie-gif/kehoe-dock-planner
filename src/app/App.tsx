import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { EditorPage } from '@/pages/EditorPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProjectsPage } from '@/pages/ProjectsPage';

const DockRender3DPage = lazy(() =>
  import('@/pages/DockRender3DPage').then((module) => ({ default: module.DockRender3DPage })),
);

function Render3DLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-medium text-slate-700">
      Loading 3D dock render...
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/editor/:projectId"
        element={
          <ProtectedRoute>
            <EditorPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/render3d/:projectId"
        element={
          <ProtectedRoute>
            <Suspense fallback={<Render3DLoadingFallback />}>
              <DockRender3DPage />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}
