import { Navigate, Route, Routes } from 'react-router-dom';
import { EditorPage } from '@/pages/EditorPage';
import { ProjectsPage } from '@/pages/ProjectsPage';

export function App() {
  return (
    <Routes>
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/editor/:projectId" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}