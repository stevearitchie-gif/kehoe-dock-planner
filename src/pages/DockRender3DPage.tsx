import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useMatch, useParams } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { CameraPresetControls } from '@/components/render3d/CameraPresetControls';
import { DockScene, type DockSceneHandle } from '@/components/render3d/DockScene';
import { RenderControlPanel } from '@/components/render3d/RenderControlPanel';
import { buildProductConfigurationRenderModel } from '@/components/render3d/productConfigAdapter';
import { buildProjectRenderModel } from '@/components/render3d/projectModelAdapter';
import { sampleQuoteProductConfigurations } from '@/components/render3d/sampleQuoteProductConfig';
import { getProject } from '@/features/projects/projectService';
import type { CameraPreset, DockRenderSettings, ProjectRenderModel, RenderViewMode } from '@/components/render3d/types';
import type { DockProject } from '@/types/dock';

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
  const quotePreviewMatch = useMatch('/render3d/quote-preview/:previewId');
  const previewId = quotePreviewMatch?.params.previewId;
  const isQuotePreview = previewId === 'local-test';
  const { user } = useAuth();
  const sceneRef = useRef<DockSceneHandle | null>(null);
  const [settings, setSettings] = useState<DockRenderSettings>(defaultRenderSettings);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [viewMode, setViewMode] = useState<RenderViewMode>('customer');
  const [project, setProject] = useState<DockProject | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const canReturnToEditor = Boolean(projectId && projectId !== 'local-test' && !isQuotePreview);

  useEffect(() => {
    let isActive = true;

    setProject(null);
    setLoadMessage(null);

    if (isQuotePreview || !projectId || projectId === 'local-test') {
      return () => {
        isActive = false;
      };
    }

    if (!user?.uid) {
      setLoadMessage('Project data unavailable. Showing local proof-of-concept fallback.');
      return () => {
        isActive = false;
      };
    }

    setIsLoadingProject(true);

    getProject(user.uid, projectId)
      .then((loadedProject) => {
        if (!isActive) {
          return;
        }

        if (!loadedProject) {
          setLoadMessage('Project not found. Showing local proof-of-concept fallback.');
          return;
        }

        setProject(loadedProject);
      })
      .catch((error) => {
        console.error('Failed to load project for 3D render', error);
        if (isActive) {
          setLoadMessage('Project load failed. Showing local proof-of-concept fallback.');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingProject(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isQuotePreview, projectId, user?.uid]);

  const projectModel = useMemo<ProjectRenderModel | null>(() => {
    if (!project) {
      return null;
    }

    return buildProjectRenderModel(project);
  }, [project]);

  const quotePreviewModel = useMemo<ProjectRenderModel | null>(() => {
    if (!isQuotePreview) {
      return null;
    }

    return buildProductConfigurationRenderModel(sampleQuoteProductConfigurations);
  }, [isQuotePreview]);

  const activeModel = quotePreviewModel ?? projectModel;
  const isModelFromQuote = Boolean(quotePreviewModel);
  const sourceNotice =
    isModelFromQuote
      ? 'Rendering from quote ProductConfiguration sample'
      : projectModel
        ? `Rendering from project data: ${projectModel.projectName}`
      : 'Rendering local proof-of-concept fallback';
  const detailNotice =
    activeModel
      ? `${isModelFromQuote ? 'Standalone quote preview. ' : ''}${
          activeModel.hasProjectScale ? '' : 'Project scale not found, using approximate fallback scale. '
        }${activeModel.elements.length} supported element${activeModel.elements.length === 1 ? '' : 's'} using ${
          activeModel.sourceUnitLabel
        }${
          activeModel.unsupportedCount > 0
            ? `; skipped ${activeModel.unsupportedCount} unsupported element${activeModel.unsupportedCount === 1 ? '' : 's'}${
                activeModel.unsupportedTypes.length > 0 ? ` (${activeModel.unsupportedTypes.join(', ')})` : ''
              }`
            : ''
        }`
      : loadMessage;
  const showTechnicalNotice = viewMode === 'internal' && (isLoadingProject || detailNotice);

  return (
    <AppShell className="h-screen overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {isModelFromQuote ? `Quote Preview ${previewId ?? ''}` : `Project ${projectId ?? 'local'}`}
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-900">
              {isModelFromQuote ? 'Quote 3D Product Preview' : '3D Dock Render'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{sourceNotice}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex rounded-md border border-slate-300 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('customer')}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'customer' ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Customer View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('internal')}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'internal' ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Internal View
              </button>
            </div>
            <CameraPresetControls activePreset={cameraPreset} onPresetChange={setCameraPreset} />
            {canReturnToEditor ? (
              <Link
                to={`/editor/${projectId}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back to Editor
              </Link>
            ) : isModelFromQuote ? (
              <Link
                to="/projects"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400"
              >
                Back to Editor
              </button>
            )}
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
            <DockScene
              ref={sceneRef}
              settings={settings}
              cameraPreset={cameraPreset}
              projectModel={activeModel}
              viewMode={viewMode}
            />
            {showTechnicalNotice && (
              <div className="absolute left-4 top-4 max-w-md rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm">
                {isLoadingProject ? 'Loading saved project data...' : detailNotice}
              </div>
            )}
          </section>
          {activeModel ? (
            <aside className="w-full border-t border-slate-200 bg-white p-4 lg:w-80 lg:border-l lg:border-t-0">
              <h2 className="text-base font-semibold text-slate-900">{isModelFromQuote ? 'Quote Preview' : 'Project Render'}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isModelFromQuote
                  ? 'Standalone product geometry generated from sample quote configuration.'
                  : 'Basic geometry generated from the saved 2D drawing.'}
              </p>
              <dl className="mt-5 grid gap-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</dt>
                  <dd className="mt-1 text-slate-800">{activeModel.projectName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Elements</dt>
                  <dd className="mt-1 text-slate-800">{activeModel.elements.length}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Scale</dt>
                  <dd className="mt-1 text-slate-800">{activeModel.sourceUnitLabel}</dd>
                </div>
                {!activeModel.hasProjectScale && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                    Project scale not found, using approximate fallback scale.
                  </div>
                )}
                {viewMode === 'internal' && activeModel.unsupportedTypes.length > 0 && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Skipped Types</dt>
                    <dd className="mt-1 text-slate-800">{activeModel.unsupportedTypes.join(', ')}</dd>
                  </div>
                )}
              </dl>
              <button
                type="button"
                onClick={() => sceneRef.current?.exportPng()}
                className="mt-5 w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Export PNG
              </button>
            </aside>
          ) : (
            <RenderControlPanel
              settings={settings}
              onSettingsChange={setSettings}
              onExportPng={() => sceneRef.current?.exportPng()}
            />
          )}
        </main>
      </div>
    </AppShell>
  );
}
