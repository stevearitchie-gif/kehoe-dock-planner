import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { EditorPage } from '@/pages/EditorPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProjectsPage } from '@/pages/ProjectsPage';

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

      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}
