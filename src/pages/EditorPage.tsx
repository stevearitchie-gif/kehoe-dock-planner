import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import editorTools, { coreToolModes, objectToolModes, toolLabels, type ToolMode } from '@/features/editor/toolDefinitions';
import { EditorCanvas } from '@/features/editor/components/EditorCanvas';
import type { DockObject, DockProject, Point, ProjectScale, UnitType } from '@/types/dock';

function buildEditorProject(projectId: string | undefined): DockProject {
  return {
    id: projectId ?? 'local-editor-project',
    name: projectId ? `Project ${projectId}` : 'Untitled Project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    shorelinePoints: [],
    objects: [],
  };
}

function getPixelsFromPoints(points: Point[]): number {
  if (points.length < 2) {
    return 0;
  }

  return Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
}

function getPolylineLength(points: Point[]): number {
  if (points.length < 2) {
    return 0;
  }

  let totalLength = 0;
  for (let index = 1; index < points.length; index += 1) {
    totalLength += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }

  return totalLength;
}

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<DockProject>(() => buildEditorProject(projectId));
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [scalePoints, setScalePoints] = useState<Point[]>([]);
  const [zoom, setZoom] = useState(1);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const isCoreTool = (tool: ToolMode): tool is (typeof coreToolModes)[number] => coreToolModes.includes(tool as (typeof coreToolModes)[number]);
  const isObjectTool = (tool: ToolMode): tool is (typeof objectToolModes)[number] =>
    objectToolModes.includes(tool as (typeof objectToolModes)[number]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const projectName = project.name;

  const measuredPixels = useMemo(() => getPixelsFromPoints(scalePoints), [scalePoints]);

  const currentScale: ProjectScale = useMemo(
    () => ({
      pixels: measuredPixels,
      realLength: project.scale?.realLength ?? 0,
      unit: project.scale?.unit ?? 'ft',
    }),
    [measuredPixels, project.scale?.realLength, project.scale?.unit],
  );

  const shorelineLengthPixels = useMemo(() => getPolylineLength(project.shorelinePoints), [project.shorelinePoints]);

  const estimatedShorelineLength = useMemo(() => {
    if (project.scale && project.scale.pixels > 0 && project.scale.realLength > 0) {
      return (shorelineLengthPixels / project.scale.pixels) * project.scale.realLength;
    }

    return null;
  }, [project.scale, shorelineLengthPixels]);

  const setProjectScale = (nextScale: ProjectScale) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      scale: nextScale,
    }));
  };

  const handleToolClick = (toolLabel: string) => {
    if (!editorTools.includes(toolLabel as ToolMode)) {
      return;
    }

    setActiveTool(toolLabel as ToolMode);
  };

  const handleCanvasPointClick = (point: Point) => {
    if (activeTool === 'scale') {
      setScalePoints((prev) => {
        const nextPoints = prev.length < 2 ? [...prev, point] : [point];
        const nextPixels = getPixelsFromPoints(nextPoints);

        setProjectScale({
          pixels: nextPixels,
          realLength: project.scale?.realLength ?? 0,
          unit: project.scale?.unit ?? 'ft',
        });

        return nextPoints;
      });
      return;
    }

    if (activeTool === 'shoreline') {
      setProject((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        shorelinePoints: [...prev.shorelinePoints, point],
      }));
      return;
    }

    if (activeTool === 'floating_dock' || activeTool === 'stationary_dock') {
      setProject((prev) => {
        const sameTypeCount = prev.objects.filter((object) => object.type === activeTool).length;
        const objectTypeName = activeTool === 'floating_dock' ? 'Floating Dock' : 'Stationary Dock';
        const nextObject: DockObject = {
          id: crypto.randomUUID(),
          type: activeTool,
          x: point.x,
          y: point.y,
          width: 120,
          height: 40,
          rotation: 0,
          label: `${objectTypeName} ${sameTypeCount + 1}`,
          color: activeTool === 'floating_dock' ? '#86efac' : '#fcd34d',
          zIndex: prev.objects.length + 1,
          locked: false,
        };

        setSelectedObjectId(nextObject.id);

        return {
          ...prev,
          updatedAt: new Date().toISOString(),
          objects: [...prev.objects, nextObject],
        };
      });
    }
  };

  const handleObjectClick = (objectId: string) => {
    if (activeTool !== 'select') {
      return;
    }

    setSelectedObjectId(objectId);
  };

  const selectedObject = useMemo(
    () => project.objects.find((object) => object.id === selectedObjectId) ?? null,
    [project.objects, selectedObjectId],
  );

  const handleDeleteSelectedObject = () => {
    if (!selectedObjectId) {
      return;
    }

    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: prev.objects.filter((object) => object.id !== selectedObjectId),
    }));
    setSelectedObjectId(null);
  };

  const handleScaleLengthChange = (value: string) => {
    const parsedValue = Number(value);

    setProjectScale({
      pixels: currentScale.pixels,
      realLength: Number.isFinite(parsedValue) ? parsedValue : 0,
      unit: currentScale.unit,
    });
  };

  const handleScaleUnitChange = (unit: UnitType) => {
    setProjectScale({
      pixels: currentScale.pixels,
      realLength: currentScale.realLength,
      unit,
    });
  };

  const handleFinishShoreline = () => {
    setActiveTool('select');
  };

  const handleClearShoreline = () => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      shorelinePoints: [],
    }));
  };

  const handleSiteImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    objectUrlRef.current = objectUrl;

    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      backgroundImageUrl: objectUrl,
    }));

    event.target.value = '';
  };

  const handleClearSiteImage = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      backgroundImageUrl: undefined,
    }));
  };

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
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
              {(zoom * 100).toFixed(0)}%
            </button>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">+</button>
            <Link to="/projects" className="rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700">
              Back to Projects
            </Link>
          </div>
        </header>

        <main className="grid h-full grid-cols-[240px_1fr_300px]">
          <aside className="border-r border-slate-200 bg-white p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tools</p>
            <div className="grid grid-cols-1 gap-2">
              {editorTools.map((tool) => {
                const isActive = tool === activeTool;
                const isEnabled = isCoreTool(tool) || isObjectTool(tool);

                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => handleToolClick(tool)}
                    disabled={!isEnabled}
                    className={`rounded-md border px-3 py-2 text-left text-sm ${
                      isActive
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                    } ${!isEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {toolLabels[tool]}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="bg-slate-50 p-4">
            <EditorCanvas
              activeTool={activeTool}
              scalePoints={scalePoints}
              shorelinePoints={project.shorelinePoints}
              objects={project.objects}
              selectedObjectId={selectedObjectId}
              backgroundImageUrl={project.backgroundImageUrl}
              onCanvasPointClick={handleCanvasPointClick}
              onObjectClick={handleObjectClick}
              zoom={zoom}
              onZoomChange={setZoom}
            />
          </section>

          <aside className="border-l border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Properties</p>
            <div className="mt-3 space-y-3">
              <div className="rounded-md border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-800">Site Image</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Upload a single site image to use as the canvas background.
                </p>
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Upload Site Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSiteImageUpload}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleClearSiteImage}
                  disabled={!project.backgroundImageUrl}
                  className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear Site Image
                </button>
              </div>

              <div className="rounded-md border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-800">Selected Object</h3>
                {!selectedObject && <p className="mt-1 text-sm text-slate-600">No object selected.</p>}
                {selectedObject && (
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    <p>Type: {selectedObject.type}</p>
                    <p>Label: {selectedObject.label}</p>
                    <p>X: {selectedObject.x.toFixed(2)}</p>
                    <p>Y: {selectedObject.y.toFixed(2)}</p>
                    <p>Width: {selectedObject.width}</p>
                    <p>Height: {selectedObject.height}</p>
                    <p>Rotation: {selectedObject.rotation}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleDeleteSelectedObject}
                  disabled={!selectedObject}
                  className="mt-3 w-full rounded-md border border-rose-300 px-3 py-2 text-sm text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete Selected Object
                </button>
              </div>

              <div className="rounded-md border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-800">Scale Settings</h3>
                <p className="mt-2 text-xs text-slate-500">
                  Activate the scale tool and click two points in the canvas to calibrate.
                </p>

                <div className="mt-3 grid gap-3">
                  <label className="text-sm text-slate-700">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Measured Pixels</span>
                    <input
                      className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                      value={currentScale.pixels.toFixed(2)}
                      readOnly
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Real Length</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={currentScale.realLength}
                      onChange={(event) => handleScaleLengthChange(event.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Unit</span>
                    <select
                      value={currentScale.unit}
                      onChange={(event) => handleScaleUnitChange(event.target.value as UnitType)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    >
                      <option value="ft">ft</option>
                      <option value="m">m</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-800">Shoreline</h3>
                <p className="mt-1 text-sm text-slate-600">Point count: {project.shorelinePoints.length}</p>
                <p className="mt-1 text-sm text-slate-600">Total length: {shorelineLengthPixels.toFixed(2)} px</p>
                {estimatedShorelineLength !== null && (
                  <p className="mt-1 text-sm text-slate-600">
                    Estimated real length: {estimatedShorelineLength.toFixed(2)} {project.scale?.unit}
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleFinishShoreline}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    Finish Shoreline
                  </button>
                  <button
                    type="button"
                    onClick={handleClearShoreline}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    Clear Shoreline
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </AppShell>
  );
}
