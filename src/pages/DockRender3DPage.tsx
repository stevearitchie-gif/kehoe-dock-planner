import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { CameraPresetControls } from '@/components/render3d/CameraPresetControls';
import { DockScene, type DockSceneHandle } from '@/components/render3d/DockScene';
import { RenderControlPanel } from '@/components/render3d/RenderControlPanel';
import type { CameraPreset, DockRenderSettings } from '@/components/render3d/types';

const defaultRenderSettings: DockRenderSettings = {
  dockLength: 24,
  dockWidth: 8,
  dockHeight: 1,
  rampEnabled: true,
  rampLength: 12,
  rampWidth: 4,
  railingsEnabled: true,
  deckFinish: 'pressure-treated',
};

export function DockRender3DPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const sceneRef = useRef<DockSceneHandle | null>(null);
  const [settings, setSettings] = useState<DockRenderSettings>(defaultRenderSettings);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');

  return (
    <AppShell className="h-screen overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Project {projectId ?? 'local'}
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-900">3D Dock Render</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CameraPresetControls activePreset={cameraPreset} onPresetChange={setCameraPreset} />
            <Link
              to={`/editor/${projectId ?? 'local'}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Editor
            </Link>
            <Link
              to="/projects"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Projects
            </Link>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <section className="relative min-h-[420px] flex-1 bg-sky-50">
            <DockScene ref={sceneRef} settings={settings} cameraPreset={cameraPreset} />
          </section>
          <RenderControlPanel
            settings={settings}
            onSettingsChange={setSettings}
            onExportPng={() => sceneRef.current?.exportPng()}
          />
        </main>
      </div>
    </AppShell>
  );
}
