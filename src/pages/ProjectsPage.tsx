import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { ProjectsTable } from '@/components/projects/ProjectsTable';
import { createProject, listProjects } from '@/features/projects/projectService';
import { DockProject } from '@/types/dock';

function buildNewProject(): DockProject {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    shorelinePoints: [],
    objects: [],
  };
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<DockProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const effectiveUserId = user?.uid ?? 'local-test-user';

  useEffect(() => {
    listProjects(effectiveUserId).then((projectList) => {
      setProjects(projectList);
      if (projectList.length > 0) {
        setSelectedProjectId(projectList[0].id);
      }
    });
  }, [effectiveUserId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const handleCreateProject = async () => {
    const newProject = buildNewProject();

    await createProject(effectiveUserId, newProject);

    setProjects((prev) => [newProject, ...prev]);
    setSelectedProjectId(newProject.id);
    navigate(`/editor/${newProject.id}`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
            <p className="text-sm text-slate-600">Manage and open dock planning projects</p>
          </div>
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => {
              logout().then(() => navigate('/login'));
            }}
          >
            Log Out
          </button>
        </header>

        <ProjectsTable
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
        />

        <div className="mt-4 flex gap-3">
          <button
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            onClick={handleCreateProject}
          >
            New Project
          </button>
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedProject}
            onClick={() => selectedProject && navigate(`/editor/${selectedProject.id}`)}
          >
            Open Project
          </button>
          <button
            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedProject}
          >
            Delete Project
          </button>
        </div>
      </div>
    </AppShell>
  );
}