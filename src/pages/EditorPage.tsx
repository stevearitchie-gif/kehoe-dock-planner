import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import editorTools from '@/features/editor/toolDefinitions';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const projectName = useMemo(() => {
    if (!projectId) {
      return 'Untitled Project';
    }

    return `Project ${projectId}`;
  }, [projectId]);

  return (
    <AppShell className="h-screen overflow-hidden">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Kehoe Dock Planner</p>
            <h1 className="text-lg font-semibold text-slate-900">{projectName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">Save</button>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
              Export PDF
            </button>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">-</button>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">100%</button>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">+</button>
            <Link to="/projects" className="rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700">
              Back to Projects
            </Link>
          </div>
        </header>

        <main className="grid h-full grid-cols-[240px_1fr_280px]">
          <aside className="border-r border-slate-200 bg-white p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tools</p>
            <div className="grid grid-cols-1 gap-2">
              {editorTools.map((tool) => (
                <button
                  key={tool}
                  className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  {tool}
                </button>
              ))}
            </div>
          </aside>

          <section className="flex items-center justify-center bg-slate-50 p-4">
            <div className="flex h-full w-full max-w-5xl items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Canvas area coming next</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Dock drawing and Konva tools will be implemented in upcoming tickets.
                </p>
              </div>
            </div>
          </section>

          <aside className="border-l border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Properties</p>
            <div className="mt-3 space-y-3">
              <div className="rounded-md border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-800">Selected Object</h3>
                <p className="mt-1 text-sm text-slate-600">No object selected.</p>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-800">Project Settings</h3>
                <p className="mt-1 text-sm text-slate-600">Scale, export options, and notes panel placeholders.</p>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </AppShell>
  );
}
