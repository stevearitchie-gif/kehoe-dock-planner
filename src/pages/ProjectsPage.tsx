import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { ProjectsTable } from '@/components/projects/ProjectsTable';
import { createProject, listProjects, removeProject } from '@/features/projects/projectService';
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
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userId = user?.uid;

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      if (!userId) {
        setProjects([]);
        setSelectedProjectId(null);
        return;
      }

      try {
        setErrorMessage(null);
        const projectList = await listProjects(userId);

        if (!isMounted) {
          return;
        }

        setProjects(projectList);
        if (projectList.length > 0) {
          setSelectedProjectId(projectList[0].id);
        } else {
          setSelectedProjectId(null);
        }
      } catch (error) {
        console.error('Failed to load projects', error);

        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Unknown error while loading projects';
        setErrorMessage(`Load failed: ${message}`);
        setProjects([]);
        setSelectedProjectId(null);
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const handleCreateProject = async () => {
    if (!userId) {
      setErrorMessage('Create failed: You must be logged in to create a project.');
      return;
    }

    const newProject = buildNewProject();

    setIsCreatingProject(true);
    setErrorMessage(null);

    try {
      await createProject(userId, newProject);
      setProjects((prev) => [newProject, ...prev]);
      setSelectedProjectId(newProject.id);
      navigate(`/editor/${newProject.id}`);
    } catch (error) {
      console.error('Failed to create project', error);
      const message =
        error instanceof Error ? error.message : 'Unknown error while creating project';
      setErrorMessage(`Create failed: ${message}`);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!userId) {
      setErrorMessage('Delete failed: You must be logged in to delete a project.');
      return;
    }

    if (!selectedProject) {
      return;
    }

    const shouldDelete = window.confirm(`Delete "${selectedProject.name}"?`);
    if (!shouldDelete) {
      return;
    }

    setIsDeletingProject(true);
    setErrorMessage(null);

    try {
      await removeProject(userId, selectedProject.id);

      const nextProjects = projects.filter((project) => project.id !== selectedProject.id);
      setProjects(nextProjects);
      setSelectedProjectId(nextProjects[0]?.id ?? null);
    } catch (error) {
      console.error('Failed to delete project', error);
      const message =
        error instanceof Error ? error.message : 'Unknown error while deleting project';
      setErrorMessage(`Delete failed: ${message}`);
    } finally {
      setIsDeletingProject(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-36 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <img
                src="/kehoe-header-logo.png"
                alt="Kehoe Marine Construction"
                className="max-h-10 w-auto object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
              <p className="text-sm text-slate-600">Manage and open dock planning projects</p>
            </div>
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

        {errorMessage && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <ProjectsTable
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
        />

        <div className="mt-4 flex gap-3">
          <button
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleCreateProject}
            disabled={!userId || isCreatingProject}
          >
            {isCreatingProject ? 'Creating...' : 'New Project'}
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
            disabled={!userId || !selectedProject || isDeletingProject}
            onClick={handleDeleteProject}
          >
            {isDeletingProject ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
