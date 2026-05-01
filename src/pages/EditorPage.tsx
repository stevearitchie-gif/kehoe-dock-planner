import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import editorTools, { coreToolModes, objectToolModes, toolLabels, type ToolMode } from '@/features/editor/toolDefinitions';
import { EditorCanvas } from '@/features/editor/components/EditorCanvas';
import type { DockObject, DockProject, Point, ProjectScale, UnitType } from '@/types/dock';

const MIN_OBJECT_SIZE = 10;
const GRID_SIZE = 40;
const DUPLICATE_OFFSET = 40;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

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
  const [isSnapToGridEnabled, setIsSnapToGridEnabled] = useState(true);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false);
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
          x: isSnapToGridEnabled ? snapToGrid(point.x) : point.x,
          y: isSnapToGridEnabled ? snapToGrid(point.y) : point.y,
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

  const handleObjectPositionChange = (objectId: string, point: Point) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: prev.objects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              x: isSnapToGridEnabled ? snapToGrid(point.x) : point.x,
              y: isSnapToGridEnabled ? snapToGrid(point.y) : point.y,
            }
          : object,
      ),
    }));
  };

  const handleObjectSizeChange = (objectId: string, size: { width: number; height: number }) => {
    setSelectedObjectId(objectId);
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: prev.objects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              width: Math.max(MIN_OBJECT_SIZE, size.width),
              height: Math.max(MIN_OBJECT_SIZE, size.height),
            }
          : object,
      ),
    }));
  };

  const handleObjectRotationChange = (objectId: string, rotation: number) => {
    setSelectedObjectId(objectId);
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: prev.objects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              rotation,
            }
          : object,
      ),
    }));
  };

  const selectedObject = useMemo(
    () => project.objects.find((object) => object.id === selectedObjectId) ?? null,
    [project.objects, selectedObjectId],
  );

  useEffect(() => {
    setIsDeleteConfirmationVisible(false);
  }, [selectedObjectId]);

  const handleDuplicateSelectedObject = () => {
    if (!selectedObjectId) {
      return;
    }

    setProject((prev) => {
      const sourceObject = prev.objects.find((object) => object.id === selectedObjectId);
      if (!sourceObject) {
        return prev;
      }

      const duplicatedX = sourceObject.x + DUPLICATE_OFFSET;
      const duplicatedY = sourceObject.y + DUPLICATE_OFFSET;
      const duplicatedObject: DockObject = {
        ...sourceObject,
        id: crypto.randomUUID(),
        x: isSnapToGridEnabled ? snapToGrid(duplicatedX) : duplicatedX,
        y: isSnapToGridEnabled ? snapToGrid(duplicatedY) : duplicatedY,
        zIndex: prev.objects.length + 1,
      };

      setSelectedObjectId(duplicatedObject.id);

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        objects: [...prev.objects, duplicatedObject],
      };
    });
  };

  const handleDeleteSelectedObject = () => {
    if (!selectedObject) {
      return;
    }

    setIsDeleteConfirmationVisible(true);
  };

  const handleConfirmDeleteSelectedObject = () => {
    if (!selectedObjectId) {
      return;
    }

    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: prev.objects.filter((object) => object.id !== selectedObjectId),
    }));
    setIsDeleteConfirmationVisible(false);
    setSelectedObjectId(null);
  };

  const handleCancelDeleteSelectedObject = () => {
    setIsDeleteConfirmationVisible(false);
  };

  const updateSelectedObject = (updater: (object: DockObject) => DockObject) => {
    if (!selectedObjectId) {
      return;
    }

    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: prev.objects.map((object) => (object.id === selectedObjectId ? updater(object) : object)),
    }));
  };

  const handleSelectedObjectWidthChange = (value: string) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    updateSelectedObject((object) => ({
      ...object,
      width: Math.max(MIN_OBJECT_SIZE, parsedValue),
    }));
  };

  const handleSelectedObjectHeightChange = (value: string) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    updateSelectedObject((object) => ({
      ...object,
      height: Math.max(MIN_OBJECT_SIZE, parsedValue),
    }));
  };

  const handleSelectedObjectRotationChange = (value: string) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    updateSelectedObject((object) => ({
      ...object,
      rotation: parsedValue,
    }));
  };

  const handleSelectedObjectLabelChange = (value: string) => {
    updateSelectedObject((object) => ({
      ...object,
      label: value,
    }));
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
              onObjectPositionChange={handleObjectPositionChange}
              onObjectSizeChange={handleObjectSizeChange}
              onObjectRotationChange={handleObjectRotationChange}
              isSnapToGridEnabled={isSnapToGridEnabled}
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
                <h3 className="text-sm font-semibold text-slate-800">Snap to Grid</h3>
                <p className="mt-1 text-sm text-slate-600">Control snapping for dock placement and dragging.</p>
                <div className="mt-3 flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{isSnapToGridEnabled ? 'On' : 'Off'}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isSnapToGridEnabled}
                    onClick={() => setIsSnapToGridEnabled((previous) => !previous)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      isSnapToGridEnabled
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {isSnapToGridEnabled ? 'Turn Off' : 'Turn On'}
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-800">Selected Object</h3>
                {!selectedObject && <p className="mt-1 text-sm text-slate-600">No object selected.</p>}
                {selectedObject && (
                  <div className="mt-2 space-y-3 text-sm text-slate-700">
                    <p>Type: {selectedObject.type}</p>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Label</span>
                      <input
                        type="text"
                        value={selectedObject.label}
                        onChange={(event) => handleSelectedObjectLabelChange(event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">X</span>
                      <input
                        value={selectedObject.x.toFixed(2)}
                        readOnly
                        className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Y</span>
                      <input
                        value={selectedObject.y.toFixed(2)}
                        readOnly
                        className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Width</span>
                      <input
                        type="number"
                        min={MIN_OBJECT_SIZE}
                        step="any"
                        value={selectedObject.width}
                        onChange={(event) => handleSelectedObjectWidthChange(event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Height</span>
                      <input
                        type="number"
                        min={MIN_OBJECT_SIZE}
                        step="any"
                        value={selectedObject.height}
                        onChange={(event) => handleSelectedObjectHeightChange(event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Rotation (degrees)</span>
                      <input
                        type="number"
                        step="any"
                        value={selectedObject.rotation}
                        onChange={(event) => handleSelectedObjectRotationChange(event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleDuplicateSelectedObject}
                  disabled={!selectedObject}
                  className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Duplicate Selected Object
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedObject}
                  disabled={!selectedObject}
                  className="mt-3 w-full rounded-md border border-rose-300 px-3 py-2 text-sm text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete Selected Object
                </button>
                {isDeleteConfirmationVisible && selectedObject && (
                  <div className="mt-3 rounded-md border border-rose-300 bg-rose-50 p-3">
                    <p className="text-sm font-medium text-rose-800">Confirm delete</p>
                    <p className="mt-1 text-sm text-rose-700">
                      Delete <span className="font-semibold">{selectedObject.label}</span>?
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmDeleteSelectedObject}
                        className="rounded-md bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelDeleteSelectedObject}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
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
