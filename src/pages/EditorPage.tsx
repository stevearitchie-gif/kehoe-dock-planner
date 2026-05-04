import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import editorTools, { coreToolModes, objectToolModes, toolLabels, type ToolMode } from '@/features/editor/toolDefinitions';
import { EditorCanvas } from '@/features/editor/components/EditorCanvas';
import type { DockObject, DockProject, Point, ProjectScale, UnitType } from '@/types/dock';

const MIN_OBJECT_SIZE = 10;
const GRID_SIZE = 40;
const DUPLICATE_OFFSET = 40;
const DEFAULT_OBJECT_OPACITY = 1;
const DEFAULT_ROOF_OVERLAY_OPACITY = 0.35;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function clampOpacity(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getDefaultOpacityByType(type: DockObject['type']): number {
  return type === 'roof_overlay' ? DEFAULT_ROOF_OVERLAY_OPACITY : DEFAULT_OBJECT_OPACITY;
}

function getObjectOpacity(object: DockObject): number {
  return clampOpacity(object.opacity ?? getDefaultOpacityByType(object.type));
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

function normalizeObjectZIndices(objects: DockObject[]): DockObject[] {
  return objects.map((object, index) => ({
    ...object,
    zIndex: index + 1,
  }));
}

function getObjectsSortedByZIndex(objects: DockObject[]): DockObject[] {
  return [...objects].sort((a, b) => a.zIndex - b.zIndex);
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

  const isCoreTool = (tool: ToolMode): tool is (typeof coreToolModes)[number] =>
    coreToolModes.includes(tool as (typeof coreToolModes)[number]);

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

  const sortedObjects = useMemo(() => getObjectsSortedByZIndex(project.objects), [project.objects]);

  const selectedObject = useMemo(
    () => project.objects.find((object) => object.id === selectedObjectId) ?? null,
    [project.objects, selectedObjectId],
  );

  const selectedObjectIndex = useMemo(
    () => sortedObjects.findIndex((object) => object.id === selectedObjectId),
    [selectedObjectId, sortedObjects],
  );

  const isSelectedObjectOnTop = selectedObjectIndex === sortedObjects.length - 1;
  const isSelectedObjectOnBottom = selectedObjectIndex === 0;

  useEffect(() => {
    setIsDeleteConfirmationVisible(false);
  }, [selectedObjectId]);

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

    const placementTools = [
      'floating_dock',
      'stationary_dock',
      'ramp_with_rails',
      'ramp_without_rails',
      'steps',
      'roof_overlay',
      'boat_lift',
    ] as const;

    if (placementTools.includes(activeTool as (typeof placementTools)[number])) {
      setProject((prev) => {
        const placementTool = activeTool as (typeof placementTools)[number];
        const sameTypeCount = prev.objects.filter((object) => object.type === placementTool).length;

        const objectTypeNameByTool: Record<(typeof placementTools)[number], string> = {
          floating_dock: 'Floating Dock',
          stationary_dock: 'Stationary Dock',
          ramp_with_rails: 'Ramp With Rails',
          ramp_without_rails: 'Ramp Without Rails',
          steps: 'Steps',
          roof_overlay: 'Roof Overlay',
          boat_lift: 'Boat Lift',
        };

        const objectSizeByTool: Record<(typeof placementTools)[number], { width: number; height: number }> = {
          floating_dock: { width: 120, height: 40 },
          stationary_dock: { width: 120, height: 40 },
          ramp_with_rails: { width: 100, height: 24 },
          ramp_without_rails: { width: 100, height: 24 },
          steps: { width: 60, height: 40 },
          roof_overlay: { width: 140, height: 80 },
          boat_lift: { width: 80, height: 30 },
        };

        const objectColorByTool: Record<(typeof placementTools)[number], string> = {
          floating_dock: '#86efac',
          stationary_dock: '#fcd34d',
          ramp_with_rails: '#93c5fd',
          ramp_without_rails: '#c4b5fd',
          steps: '#fda4af',
          roof_overlay: '#94a3b8',
          boat_lift: '#67e8f9',
        };

        const nextObject: DockObject = {
          id: crypto.randomUUID(),
          type: placementTool,
          x: isSnapToGridEnabled ? snapToGrid(point.x) : point.x,
          y: isSnapToGridEnabled ? snapToGrid(point.y) : point.y,
          width: objectSizeByTool[placementTool].width,
          height: objectSizeByTool[placementTool].height,
          rotation: 0,
          opacity: getDefaultOpacityByType(placementTool),
          label: `${objectTypeNameByTool[placementTool]} ${sameTypeCount + 1}`,
          color: objectColorByTool[placementTool],
          zIndex: prev.objects.length + 1,
          locked: false,
        };

        setSelectedObjectId(nextObject.id);

        return {
          ...prev,
          updatedAt: new Date().toISOString(),
          objects: normalizeObjectZIndices([...prev.objects, nextObject]),
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

  const handleBringSelectedObjectForward = () => {
    if (!selectedObjectId || isSelectedObjectOnTop || selectedObjectIndex < 0) {
      return;
    }

    setProject((prev) => {
      const orderedObjects = getObjectsSortedByZIndex(prev.objects);
      const index = orderedObjects.findIndex((object) => object.id === selectedObjectId);
      if (index < 0 || index >= orderedObjects.length - 1) {
        return prev;
      }

      const nextObjects = [...orderedObjects];
      [nextObjects[index], nextObjects[index + 1]] = [nextObjects[index + 1], nextObjects[index]];

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        objects: normalizeObjectZIndices(nextObjects),
      };
    });
  };

  const handleSendSelectedObjectBackward = () => {
    if (!selectedObjectId || isSelectedObjectOnBottom || selectedObjectIndex <= 0) {
      return;
    }

    setProject((prev) => {
      const orderedObjects = getObjectsSortedByZIndex(prev.objects);
      const index = orderedObjects.findIndex((object) => object.id === selectedObjectId);
      if (index <= 0) {
        return prev;
      }

      const nextObjects = [...orderedObjects];
      [nextObjects[index - 1], nextObjects[index]] = [nextObjects[index], nextObjects[index - 1]];

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        objects: normalizeObjectZIndices(nextObjects),
      };
    });
  };

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
        objects: normalizeObjectZIndices([...prev.objects, duplicatedObject]),
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
      objects: normalizeObjectZIndices(prev.objects.filter((object) => object.id !== selectedObjectId)),
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

  const handleSelectedObjectOpacityChange = (value: string) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    updateSelectedObject((object) => ({
      ...object,
      opacity: clampOpacity(parsedValue),
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
      <div className="flex h-full min-h-0 flex-col">
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

        <main className="grid h-full min-h-0 grid-cols-[240px_1fr_300px]">
          <aside className="overflow-y-auto border-r border-slate-200 bg-white p-3">
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

          <section className="min-h-0 bg-slate-50 p-4">
            <EditorCanvas
              activeTool={activeTool}
              scalePoints={scalePoints}
              shorelinePoints={project.shorelinePoints}
              objects={sortedObjects}
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

          <aside className="overflow-y-auto border-l border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Properties</p>

            <div className="mt-3 space-y-3 pb-6">
              <div className="rounded-md border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-800">Site Image</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Upload a single site image to use as the canvas background.
                </p>
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Upload Site Image
                  </span>
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
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Label
                      </span>
                      <input
                        type="text"
                        value={selectedObject.label}
                        onChange={(event) => handleSelectedObjectLabelChange(event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        X
                      </span>
                      <input
                        value={selectedObject.x.toFixed(2)}
                        readOnly
                        className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Y
                      </span>
                      <input
                        value={selectedObject.y.toFixed(2)}
                        readOnly
                        className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Width
                      </span>
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
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Height
                      </span>
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
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Rotation (degrees)
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={selectedObject.rotation}
                        onChange={(event) => handleSelectedObjectRotationChange(event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Opacity
                      </span>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={getObjectOpacity(selectedObject)}
                          onChange={(event) => handleSelectedObjectOpacityChange(event.target.value)}
                          className="w-full"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.01}
                            value={Number(getObjectOpacity(selectedObject).toFixed(2))}
                            onChange={(event) => handleSelectedObjectOpacityChange(event.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                          />
                          <span className="min-w-[52px] text-right text-xs text-slate-500">
                            {Math.round(getObjectOpacity(selectedObject) * 100)}%
                          </span>
                        </div>
                      </div>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleSendSelectedObjectBackward}
                        disabled={isSelectedObjectOnBottom}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Send Backward
                      </button>
                      <button
                        type="button"
                        onClick={handleBringSelectedObjectForward}
                        disabled={isSelectedObjectOnTop}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Bring Forward
                      </button>
                    </div>
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
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Measured Pixels
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                      value={currentScale.pixels.toFixed(2)}
                      readOnly
                    />
                  </label>

                  <label className="text-sm text-slate-700">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Real Length
                    </span>
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
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Unit
                    </span>
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