import { DockProject } from '@/types/dock';

interface ProjectsTableProps {
  projects: DockProject[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
}

export function ProjectsTable({ projects, selectedProjectId, onSelectProject }: ProjectsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Project</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {projects.map((project) => {
            const isSelected = selectedProjectId === project.id;
            return (
              <tr
                key={project.id}
                className={`cursor-pointer hover:bg-slate-50 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                onClick={() => onSelectProject(project.id)}
              >
                <td className="px-4 py-3 font-medium text-slate-900">{project.name}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(project.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(project.updatedAt).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
