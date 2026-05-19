import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import editorTools, {
  coreToolModes,
  dockElementToolModes,
  genericShapeToolModes,
  objectToolModes,
  toolLabels,
  type ToolMode,
} from '@/features/editor/toolDefinitions';
import { EditorCanvas, type EditorCanvasHandle } from '@/features/editor/components/EditorCanvas';
import { getProject, saveProject } from '@/features/projects/projectService';
import { storage } from '@/lib/firebase';
import type { DockObject, DockProject, Point, ProjectScale, UnitType } from '@/types/dock';

const MIN_OBJECT_SIZE = 10;
const GRID_SIZE = 40;
const DUPLICATE_OFFSET = 40;
const DEFAULT_OBJECT_OPACITY = 1;
const DEFAULT_ROOF_OVERLAY_OPACITY = 0.35;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const MAX_SITE_IMAGE_BYTES = 10 * 1024 * 1024;
const FEET_PER_METER = 3.28084;

const OBJECT_COLOR_PRESETS = [
  { label: 'Cedar Dock', value: '#b77945' },
  { label: 'Pressure Treated', value: '#8f9779' },
  { label: 'Grey Composite', value: '#9ca3af' },
  { label: 'Tan Composite', value: '#c2a878' },
  { label: 'Aluminum', value: '#cbd5e1' },
  { label: 'Black Hardware', value: '#1f2937' },
  { label: 'Safety Orange', value: '#f97316' },
  { label: 'Roof Grey', value: '#64748b' },
  { label: 'Water Blue', value: '#38bdf8' },
  { label: 'White', value: '#f8fafc' },
];

const LABEL_COLOR_PRESETS = [
  { label: 'Black', value: '#0f172a' },
  { label: 'White', value: '#ffffff' },
  { label: 'Yellow', value: '#facc15' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Green', value: '#16a34a' },
];

const OUTLINE_COLOR_PRESETS = [
  { label: 'Slate', value: '#334155' },
  { label: 'Black', value: '#0f172a' },
  { label: 'White', value: '#ffffff' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Orange', value: '#f97316' },
];

type GenericShapeTool = (typeof genericShapeToolModes)[number];

const shapeToolGroups: { title: string; tools: GenericShapeTool[] }[] = [
  {
    title: 'Lines',
    tools: [
      'shape_line',
      'shape_arrow_line',
      'shape_double_arrow_line',
      'shape_elbow_connector',
      'shape_double_elbow_connector',
      'shape_elbow_arrow_connector',
    ],
  },
  {
    title: 'Rectangles',
    tools: ['shape_rectangle', 'shape_rounded_rectangle', 'shape_callout'],
  },
  {
    title: 'Basic Shapes',
    tools: [
      'shape_oval',
      'shape_triangle',
      'shape_right_triangle',
      'shape_diamond',
      'shape_parallelogram',
      'shape_trapezoid',
      'shape_pentagon',
      'shape_hexagon',
      'shape_octagon',
      'shape_cross',
      'shape_plus',
      'shape_cube',
      'shape_cylinder',
    ],
  },
  {
    title: 'Block Arrows',
    tools: [
      'shape_right_arrow',
      'shape_left_arrow',
      'shape_up_arrow',
      'shape_down_arrow',
      'shape_left_right_arrow',
      'shape_up_down_arrow',
      'shape_chevron_right',
      'shape_chevron_left',
    ],
  },
];

function ShapeToolPreview({ tool }: { tool: GenericShapeTool }) {
  const stroke = '#334155';
  const fill = '#e2e8f0';

  switch (tool) {
    case 'shape_rectangle':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <rect x="10" y="8" width="44" height="24" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'shape_rounded_rectangle':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <rect x="10" y="8" width="44" height="24" rx="7" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'shape_oval':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <ellipse cx="32" cy="20" rx="23" ry="12" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'shape_triangle':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <polygon points="32,6 54,34 10,34" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'shape_right_triangle':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <polygon points="12,8 52,32 12,32" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'shape_diamond':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <polygon points="32,5 56,20 32,35 8,20" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'shape_parallelogram':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <polygon points="18,8 56,8 46,32 8,32" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'shape_trapezoid':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <polygon points="20,8 44,8 56,32 8,32" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'shape_pentagon':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <polygon points="32,5 56,18 47,35 17,35 8,18" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'shape_hexagon':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <polygon points="18,8 46,8 58,20 46,32 18,32 6,20" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'shape_octagon':
      return <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true"><polygon points="22,6 42,6 56,14 56,26 42,34 22,34 8,26 8,14" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;

    case 'shape_cross':
    case 'shape_plus':
      return <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true"><polygon points="25,6 39,6 39,15 54,15 54,25 39,25 39,34 25,34 25,25 10,25 10,15 25,15" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;

    case 'shape_left_arrow':
      return <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true"><polygon points="58,14 26,14 26,7 6,20 26,33 26,26 58,26" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;

    case 'shape_up_arrow':
      return <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true"><polygon points="25,34 25,17 15,17 32,5 49,17 39,17 39,34" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;

    case 'shape_down_arrow':
      return <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true"><polygon points="25,6 39,6 39,23 49,23 32,35 15,23 25,23" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;

    case 'shape_left_right_arrow':
      return <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true"><polygon points="18,7 28,14 36,14 46,7 58,20 46,33 36,26 28,26 18,33 6,20" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;

    case 'shape_up_down_arrow':
      return <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true"><polygon points="32,4 48,14 39,18 39,22 48,26 32,36 16,26 25,22 25,18 16,14" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;

    case 'shape_chevron_right':
      return <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true"><polygon points="10,7 39,7 56,20 39,33 10,33 27,20" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;

    case 'shape_chevron_left':
      return <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true"><polygon points="54,7 25,7 8,20 25,33 54,33 37,20" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;

    case 'shape_right_arrow':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <polygon points="6,14 38,14 38,7 58,20 38,33 38,26 6,26" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'shape_line':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <line x1="8" y1="20" x2="56" y2="20" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'shape_arrow_line':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <line x1="8" y1="20" x2="54" y2="20" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <polyline points="46,12 56,20 46,28" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'shape_double_arrow_line':
      return (
        <svg viewBox="0 0 64 40" className="h-6 w-9" aria-hidden="true">
          <line x1="10" y1="20" x2="54" y2="20" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <polyline points="18,12 8,20 18,28" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="46,12 56,20 46,28" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    default:
      return null;
  }
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function clampOpacity(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function getDimensionLengthPartsFromWidth(width: number, scale: ProjectScale) {
  if (scale.pixels <= 0 || scale.realLength <= 0) {
    return {
      feet: 0,
      inches: 0,
      totalInches: 0,
      canUseScale: false,
    };
  }

  const realLengthInScaleUnits = (width / scale.pixels) * scale.realLength;
  const totalFeet = scale.unit === 'm' ? realLengthInScaleUnits * FEET_PER_METER : realLengthInScaleUnits;
  const totalInches = Math.max(0, Math.round(totalFeet * 12));

  return {
    feet: Math.floor(totalInches / 12),
    inches: totalInches % 12,
    totalInches,
    canUseScale: true,
  };
}

function getCanvasWidthFromFeetAndInches(feet: number, inches: number, scale: ProjectScale): number | null {
  if (scale.pixels <= 0 || scale.realLength <= 0) {
    return null;
  }

  const totalFeet = (Math.max(0, feet) * 12 + Math.max(0, inches)) / 12;
  const lengthInScaleUnits = scale.unit === 'm' ? totalFeet / FEET_PER_METER : totalFeet;

  return (lengthInScaleUnits / scale.realLength) * scale.pixels;
}

function getSafeStorageFileName(fileName: string): string {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'site-image';
}

function getSiteImageStoragePath(userId: string, projectId: string, fileName: string): string {
  const safeFileName = getSafeStorageFileName(fileName);
  return `users/${userId}/projects/${projectId}/site-images/${Date.now()}-${safeFileName}`;
}

async function deleteSiteImageByPath(pathToDelete: string): Promise<void> {
  const imageRef = storageRef(storage, pathToDelete);
  await deleteObject(imageRef);
}

function getDefaultOpacityByType(type: DockObject['type']): number {
  return type === 'roof_overlay' ? DEFAULT_ROOF_OVERLAY_OPACITY : DEFAULT_OBJECT_OPACITY;
}

function getObjectOpacity(object: DockObject): number {
  return clampOpacity(object.opacity ?? getDefaultOpacityByType(object.type));
}

function getDefaultStrokeWidthByType(type: DockObject['type']): number {
  return type === 'dimension_line' ||
    type === 'shape_line' ||
    type === 'shape_arrow_line' ||
    type === 'shape_double_arrow_line'
    ? 2
    : 1;
}

function getDefaultStrokeColorByObject(object: DockObject): string {
  return object.type === 'dimension_line' ||
    object.type === 'shape_line' ||
    object.type === 'shape_arrow_line' ||
    object.type === 'shape_double_arrow_line'
    ? object.color
    : '#334155';
}

function getObjectStrokeWidthForControls(object: DockObject): number {
  return object.strokeWidth ?? getDefaultStrokeWidthByType(object.type);
}

function getObjectStrokeColorForControls(object: DockObject): string {
  return object.strokeColor ?? getDefaultStrokeColorByObject(object);
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

function formatSavedTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function printImageInHiddenFrame(args: {
  imageDataUrl: string;
  projectName: string;
  exportedAt: string;
  scaleSummaryHtml: string;
}): boolean {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    iframe.remove();
    return false;
  }

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  };

  frameWindow.addEventListener(
    'afterprint',
    () => {
      cleanup();
    },
    { once: true },
  );

  const printDoc = frameWindow.document;
  printDoc.open();
  printDoc.write(`
    <!doctype html>
    <html>
      <head>
        <title>${args.projectName}</title>
        <meta charset="utf-8" />
        <style>
          body {
            margin: 0;
            padding: 24px;
            font-family: Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
          }
          .page {
            width: 100%;
            max-width: 1100px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 18px;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 14px;
          }
          .brand-logo {
            max-width: 190px;
            max-height: 70px;
            object-fit: contain;
          }
          .header-copy {
            flex: 1;
            text-align: right;
          }
          .header h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
          }
          .meta {
            font-size: 13px;
            color: #475569;
          }
          .meta p {
            margin: 4px 0;
          }
          .canvas-image {
            width: 100%;
            height: auto;
            border: 1px solid #cbd5e1;
            display: block;
          }
          @media print {
            body {
              padding: 0;
            }
            .page {
              max-width: none;
            }
            .canvas-image {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <img
              id="brand-logo"
              class="brand-logo"
              src="/kehoe-header-logo.png"
              alt="Kehoe Marine Construction"
            />
            <div class="header-copy">
              <h1>${args.projectName}</h1>
              <div class="meta">
                <p><strong>Exported:</strong> ${args.exportedAt}</p>
                ${args.scaleSummaryHtml}
              </div>
            </div>
          </div>
          <img id="export-image" class="canvas-image" src="${args.imageDataUrl}" alt="${args.projectName}" />
        </div>
        <script>
          const images = Array.from(document.images);
          const startPrint = () => {
            setTimeout(() => {
              window.focus();
              window.print();
            }, 150);
          };

          const imageLoadPromises = images.map((image) => {
            if (image.complete) {
              return Promise.resolve();
            }

            return new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true });
              image.addEventListener('error', resolve, { once: true });
            });
          });

          Promise.all(imageLoadPromises).then(startPrint);
        </script>
      </body>
    </html>
  `);
  printDoc.close();

  window.setTimeout(() => {
    if (document.body.contains(iframe)) {
      cleanup();
    }
  }, 60000);

  return true;
}

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const editorCanvasRef = useRef<EditorCanvasHandle | null>(null);

  const [project, setProject] = useState<DockProject>(() => buildEditorProject(projectId));
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [scalePoints, setScalePoints] = useState<Point[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isSnapToGridEnabled, setIsSnapToGridEnabled] = useState(true);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isShapeSelectorOpen, setIsShapeSelectorOpen] = useState(false);
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingSiteImage, setIsUploadingSiteImage] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hasInitializedProject, setHasInitializedProject] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');
  const pendingDeletedSiteImagePathsRef = useRef<string[]>([]);

  const userId = user?.uid;

  const isCoreTool = (tool: ToolMode): tool is (typeof coreToolModes)[number] =>
    coreToolModes.includes(tool as (typeof coreToolModes)[number]);

  const isObjectTool = (tool: ToolMode): tool is (typeof objectToolModes)[number] =>
    objectToolModes.includes(tool as (typeof objectToolModes)[number]);

  const queueSiteImagePathForDeletion = (pathToDelete: string | undefined) => {
    if (!pathToDelete) {
      return;
    }

    if (!pendingDeletedSiteImagePathsRef.current.includes(pathToDelete)) {
      pendingDeletedSiteImagePathsRef.current.push(pathToDelete);
    }
  };

  const deleteQueuedSiteImages = async () => {
    const pathsToDelete = [...pendingDeletedSiteImagePathsRef.current];
    pendingDeletedSiteImagePathsRef.current = [];

    await Promise.allSettled(
      pathsToDelete.map(async (pathToDelete) => {
        try {
          await deleteSiteImageByPath(pathToDelete);
        } catch (error) {
          console.warn('Failed to delete old site image', pathToDelete, error);
        }
      }),
    );
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!projectId) {
      const blankProject = buildEditorProject(projectId);
      setProject(blankProject);
      lastSavedSnapshotRef.current = JSON.stringify(blankProject);
      setLastSavedAt(null);
      setIsDirty(false);
      setSaveMessage(null);
      setHasInitializedProject(true);
      return;
    }

    if (!userId) {
      const blankProject = buildEditorProject(projectId);
      setProject(blankProject);
      lastSavedSnapshotRef.current = JSON.stringify(blankProject);
      setLastSavedAt(null);
      setIsDirty(false);
      setSaveMessage('You must be logged in to load this project.');
      setHasInitializedProject(true);
      return;
    }

    getProject(userId, projectId)
      .then((savedProject) => {
        if (!isActive) {
          return;
        }

        const loadedProject = savedProject ?? buildEditorProject(projectId);
        setProject(loadedProject);
        lastSavedSnapshotRef.current = JSON.stringify(loadedProject);
        setLastSavedAt(savedProject ? loadedProject.updatedAt : null);
        setIsDirty(false);
        setSaveMessage(null);
        setHasInitializedProject(true);
      })
      .catch((error) => {
        console.error('Failed to load project', error);

        if (!isActive) {
          return;
        }

        const blankProject = buildEditorProject(projectId);
        setProject(blankProject);
        lastSavedSnapshotRef.current = JSON.stringify(blankProject);
        setLastSavedAt(null);
        setIsDirty(false);
        setSaveMessage('Project load failed');
        setHasInitializedProject(true);
      });

    return () => {
      isActive = false;
    };
  }, [userId, projectId]);

  useEffect(() => {
    if (!hasInitializedProject) {
      return;
    }

    const nextIsDirty = JSON.stringify(project) !== lastSavedSnapshotRef.current;
    setIsDirty(nextIsDirty);

    if (nextIsDirty && saveMessage) {
      setSaveMessage(null);
    }
  }, [hasInitializedProject, project, saveMessage]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  const projectName = project.name.trim() || 'Untitled Project';

  const measuredPixels = useMemo(() => getPixelsFromPoints(scalePoints), [scalePoints]);

  const currentScale: ProjectScale = useMemo(
    () => ({
      pixels: measuredPixels > 0 ? measuredPixels : project.scale?.pixels ?? 0,
      realLength: project.scale?.realLength ?? 0,
      unit: project.scale?.unit ?? 'ft',
    }),
    [measuredPixels, project.scale?.pixels, project.scale?.realLength, project.scale?.unit],
  );

  const shorelineLengthPixels = useMemo(() => getPolylineLength(project.shorelinePoints), [project.shorelinePoints]);

  const estimatedShorelineLength = useMemo(() => {
    if (currentScale.pixels > 0 && currentScale.realLength > 0) {
      return (shorelineLengthPixels / currentScale.pixels) * currentScale.realLength;
    }

    return null;
  }, [currentScale.pixels, currentScale.realLength, shorelineLengthPixels]);

  const sortedObjects = useMemo(() => getObjectsSortedByZIndex(project.objects), [project.objects]);

  const selectedObject = useMemo(
    () => project.objects.find((object) => object.id === selectedObjectId) ?? null,
    [project.objects, selectedObjectId],
  );

  const selectedDimensionLength = useMemo(() => {
    if (!selectedObject || selectedObject.type !== 'dimension_line') {
      return null;
    }

    return getDimensionLengthPartsFromWidth(selectedObject.width, currentScale);
  }, [currentScale, selectedObject]);

  const selectedObjectIndex = useMemo(
    () => sortedObjects.findIndex((object) => object.id === selectedObjectId),
    [selectedObjectId, sortedObjects],
  );

  const isSelectedObjectOnTop = selectedObjectIndex === sortedObjects.length - 1;
  const isSelectedObjectOnBottom = selectedObjectIndex === 0;
  const canZoomOut = zoom > MIN_ZOOM;
  const canZoomIn = zoom < MAX_ZOOM;

  const activeToolHint = useMemo(() => {
    if (activeTool === 'select') {
      return 'Select, move, resize, rotate, or use keyboard shortcuts.';
    }

    if (activeTool === 'pan') {
      return 'Drag the canvas to pan. Use Esc to return to select.';
    }

    if (activeTool === 'scale') {
      return 'Click two points on the canvas to set the scale.';
    }

    if (activeTool === 'shoreline') {
      return 'Click along the shoreline, then finish from the properties panel.';
    }

    return `Click the canvas or drag ${toolLabels[activeTool]} from the palette to place it.`;
  }, [activeTool]);

  const statusMessage = useMemo(() => {
    if (saveMessage) {
      return saveMessage;
    }

    return null;
  }, [saveMessage]);

  const saveStatusIndicator = useMemo(() => {
    if (isSaving) {
      return {
        label: 'Saving...',
        className: 'border-blue-200 bg-blue-50 text-blue-700',
      };
    }

    if (isDirty) {
      return {
        label: 'Unsaved changes',
        className: 'border-amber-200 bg-amber-50 text-amber-800',
      };
    }

    if (lastSavedAt) {
      return {
        label: `Saved at ${formatSavedTime(lastSavedAt)}`,
        className: 'border-green-200 bg-green-50 text-green-700',
      };
    }

    return {
      label: 'Not saved yet',
      className: 'border-slate-200 bg-slate-50 text-slate-600',
    };
  }, [isDirty, isSaving, lastSavedAt]);

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

  const handleProjectNameChange = (value: string) => {
    setProject((prev) => ({
      ...prev,
      name: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleZoomOut = () => {
    setZoom((prev) => clampZoom(Number((prev - ZOOM_STEP).toFixed(2))));
  };

  const handleZoomIn = () => {
    setZoom((prev) => clampZoom(Number((prev + ZOOM_STEP).toFixed(2))));
  };

  const handleCanvasPointClick = (
    point: Point,
    drawSize?: { width: number; height: number },
    toolOverride?: ToolMode,
  ) => {
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
      'dimension_line',
      'shape_rectangle',
      'shape_rounded_rectangle',
      'shape_oval',
      'shape_triangle',
      'shape_right_triangle',
      'shape_diamond',
      'shape_parallelogram',
      'shape_trapezoid',
      'shape_pentagon',
      'shape_hexagon',
      'shape_octagon',
      'shape_cross',
      'shape_plus',
      'shape_right_arrow',
      'shape_left_arrow',
      'shape_up_arrow',
      'shape_down_arrow',
      'shape_left_right_arrow',
      'shape_up_down_arrow',
      'shape_chevron_right',
      'shape_chevron_left',
      'shape_callout',
      'shape_cube',
      'shape_cylinder',
      'shape_line',
      'shape_arrow_line',
      'shape_double_arrow_line',
      'shape_elbow_connector',
      'shape_double_elbow_connector',
      'shape_elbow_arrow_connector',
    
    ] as const;

    const placementToolCandidate = toolOverride ?? activeTool;

    if (placementTools.includes(placementToolCandidate as (typeof placementTools)[number])) {
      setProject((prev) => {
        const placementTool = placementToolCandidate as (typeof placementTools)[number];
        const sameTypeCount = prev.objects.filter((object) => object.type === placementTool).length;

        const objectTypeNameByTool: Record<(typeof placementTools)[number], string> = {
          floating_dock: 'Floating Dock',
          stationary_dock: 'Stationary Dock',
          ramp_with_rails: 'Ramp With Rails',
          ramp_without_rails: 'Ramp Without Rails',
          steps: 'Steps',
          roof_overlay: 'Roof Overlay',
          boat_lift: 'Boat Lift',
          dimension_line: 'Dimension Line',
          shape_rectangle: 'Rectangle',
          shape_rounded_rectangle: 'Rounded Rectangle',
          shape_oval: 'Oval',
          shape_triangle: 'Triangle',
          shape_right_triangle: 'Right Triangle',
          shape_diamond: 'Diamond',
          shape_parallelogram: 'Parallelogram',
          shape_trapezoid: 'Trapezoid',
          shape_pentagon: 'Pentagon',
          shape_hexagon: 'Hexagon',
          shape_octagon: 'Octagon',
          shape_cross: 'Cross',
          shape_plus: 'Plus',
          shape_right_arrow: 'Right Arrow',
          shape_left_arrow: 'Left Arrow',
          shape_up_arrow: 'Up Arrow',
          shape_down_arrow: 'Down Arrow',
          shape_left_right_arrow: 'Left Right Arrow',
          shape_up_down_arrow: 'Up Down Arrow',
          shape_chevron_right: 'Right Chevron',
          shape_chevron_left: 'Left Chevron',
          shape_callout: 'Callout',
          shape_cube: 'Cube',
          shape_cylinder: 'Cylinder',
          shape_line: 'Line',
          shape_arrow_line: 'Arrow Line',
          shape_double_arrow_line: 'Double Arrow Line',
          shape_elbow_connector: 'Elbow Connector',
          shape_double_elbow_connector: 'Double Elbow Connector',
          shape_elbow_arrow_connector: 'Arrow Elbow Connector',
        };

        const objectSizeByTool: Record<(typeof placementTools)[number], { width: number; height: number }> = {
          floating_dock: { width: 120, height: 40 },
          stationary_dock: { width: 120, height: 40 },
          ramp_with_rails: { width: 100, height: 24 },
          ramp_without_rails: { width: 100, height: 24 },
          steps: { width: 60, height: 40 },
          roof_overlay: { width: 140, height: 80 },
          boat_lift: { width: 80, height: 30 },
          dimension_line: { width: 160, height: 24 },
          shape_rectangle: { width: 100, height: 60 },
          shape_rounded_rectangle: { width: 100, height: 60 },
          shape_oval: { width: 100, height: 60 },
          shape_triangle: { width: 90, height: 80 },
          shape_right_triangle: { width: 90, height: 80 },
          shape_diamond: { width: 90, height: 70 },
          shape_parallelogram: { width: 110, height: 60 },
          shape_trapezoid: { width: 110, height: 60 },
          shape_pentagon: { width: 100, height: 80 },
          shape_hexagon: { width: 100, height: 70 },
          shape_octagon: { width: 100, height: 80 },
          shape_cross: { width: 90, height: 90 },
          shape_plus: { width: 90, height: 90 },
          shape_right_arrow: { width: 120, height: 60 },
          shape_left_arrow: { width: 120, height: 60 },
          shape_up_arrow: { width: 70, height: 110 },
          shape_down_arrow: { width: 70, height: 110 },
          shape_left_right_arrow: { width: 130, height: 60 },
          shape_up_down_arrow: { width: 80, height: 130 },
          shape_chevron_right: { width: 100, height: 60 },
          shape_chevron_left: { width: 100, height: 60 },
          shape_callout: { width: 120, height: 80 },
          shape_cube: { width: 90, height: 80 },
          shape_cylinder: { width: 90, height: 80 },
          shape_line: { width: 120, height: 24 },
          shape_arrow_line: { width: 120, height: 24 },
          shape_double_arrow_line: { width: 120, height: 24 },
          shape_elbow_connector: { width: 120, height: 80 },
          shape_double_elbow_connector: { width: 140, height: 80 },
          shape_elbow_arrow_connector: { width: 120, height: 80 },
        };

        const objectColorByTool: Record<(typeof placementTools)[number], string> = {
          floating_dock: '#b77945',
          stationary_dock: '#8f9779',
          ramp_with_rails: '#c2a878',
          ramp_without_rails: '#c2a878',
          steps: '#9a6b3f',
          roof_overlay: '#64748b',
          boat_lift: '#cbd5e1',
          dimension_line: '#0f172a',
          shape_rectangle: '#dbeafe',
          shape_rounded_rectangle: '#dbeafe',
          shape_oval: '#dcfce7',
          shape_triangle: '#fef3c7',
          shape_right_triangle: '#fef3c7',
          shape_diamond: '#ede9fe',
          shape_parallelogram: '#e0f2fe',
          shape_trapezoid: '#fce7f3',
          shape_pentagon: '#fef9c3',
          shape_hexagon: '#ccfbf1',
          shape_octagon: '#dbeafe',
          shape_cross: '#fee2e2',
          shape_plus: '#e0f2fe',
          shape_right_arrow: '#fed7aa',
          shape_left_arrow: '#fed7aa',
          shape_up_arrow: '#fed7aa',
          shape_down_arrow: '#fed7aa',
          shape_left_right_arrow: '#fed7aa',
          shape_up_down_arrow: '#fed7aa',
          shape_chevron_right: '#ffedd5',
          shape_chevron_left: '#ffedd5',
          shape_callout: '#fef9c3',
          shape_cube: '#e0e7ff',
          shape_cylinder: '#dbeafe',
          shape_line: '#0f172a',
          shape_arrow_line: '#0f172a',
          shape_double_arrow_line: '#0f172a',
          shape_elbow_connector: '#0f172a',
          shape_double_elbow_connector: '#0f172a',
          shape_elbow_arrow_connector: '#0f172a',
        };

        const nextObject: DockObject = {
          id: crypto.randomUUID(),
          type: placementTool,
          x: isSnapToGridEnabled ? snapToGrid(point.x) : point.x,
          y: isSnapToGridEnabled ? snapToGrid(point.y) : point.y,
          width: drawSize?.width ?? objectSizeByTool[placementTool].width,
          height: drawSize?.height ?? objectSizeByTool[placementTool].height,
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

      setActiveTool('select');
    }
  };

  const handleCanvasObjectDraw = (tool: ToolMode, startPoint: Point, endPoint: Point) => {
    if (tool !== activeTool) {
      return;
    }

    const width = Math.max(MIN_OBJECT_SIZE, Math.abs(endPoint.x - startPoint.x));
    const height = Math.max(MIN_OBJECT_SIZE, Math.abs(endPoint.y - startPoint.y));
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);

    handleCanvasPointClick({ x, y }, { width, height });
  };

  const handleCanvasToolDrop = (tool: ToolMode, point: Point) => {
    handleCanvasPointClick(point, undefined, tool);
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

  const handleDeleteSelectedObjectImmediately = () => {
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

  useEffect(() => {
    const handleEditorKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTypingInField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isTypingInField) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setActiveTool('select');
        setIsShapeSelectorOpen(false);
        return;
      }

      if (!selectedObjectId) {
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        handleDeleteSelectedObjectImmediately();
        return;
      }

      if (event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleDuplicateSelectedObject();
        return;
      }

      const nudgeByKey: Record<string, Point> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      };
      const nudgeDirection = nudgeByKey[event.key];

      if (!nudgeDirection) {
        return;
      }

      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      updateSelectedObject((object) => ({
        ...object,
        x: object.x + nudgeDirection.x * step,
        y: object.y + nudgeDirection.y * step,
      }));
    };

    window.addEventListener('keydown', handleEditorKeyDown);

    return () => {
      window.removeEventListener('keydown', handleEditorKeyDown);
    };
  });

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

  const handleSelectedDimensionLengthChange = (feet: number, inches: number) => {
    const nextWidth = getCanvasWidthFromFeetAndInches(feet, inches, currentScale);

    if (nextWidth === null) {
      setSaveMessage('Set the project scale before sizing a dimension line by feet and inches.');
      return;
    }

    updateSelectedObject((object) => ({
      ...object,
      width: Math.max(MIN_OBJECT_SIZE, nextWidth),
    }));
  };

  const handleSelectedDimensionFeetChange = (value: string) => {
    const parsedFeet = Number(value);
    if (!Number.isFinite(parsedFeet)) {
      return;
    }

    handleSelectedDimensionLengthChange(
      Math.max(0, Math.floor(parsedFeet)),
      selectedDimensionLength?.inches ?? 0,
    );
  };

  const handleSelectedDimensionInchesChange = (value: string) => {
    const parsedInches = Number(value);
    if (!Number.isFinite(parsedInches)) {
      return;
    }

    handleSelectedDimensionLengthChange(
      selectedDimensionLength?.feet ?? 0,
      Math.max(0, Math.min(11, Math.floor(parsedInches))),
    );
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

  const handleFlipSelectedObjectHorizontal = () => {
    updateSelectedObject((object) => ({
      ...object,
      flippedX: object.flippedX ? undefined : true,
    }));
  };

  const handleFlipSelectedObjectVertical = () => {
    updateSelectedObject((object) => ({
      ...object,
      flippedY: object.flippedY ? undefined : true,
    }));
  };

  const handleSelectedObjectLabelChange = (value: string) => {
    updateSelectedObject((object) => ({
      ...object,
      label: value,
    }));
  };

  const handleToggleSelectedObjectLabelVisibility = () => {
    updateSelectedObject((object) => ({
      ...object,
      labelHidden: object.labelHidden ? undefined : true,
    }));
  };

  const handleObjectLabelOffsetChange = (objectId: string, offset: Point) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: prev.objects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              labelOffsetX: Math.abs(offset.x) < 0.5 ? undefined : offset.x,
              labelOffsetY: Math.abs(offset.y) < 0.5 ? undefined : offset.y,
            }
          : object,
      ),
    }));
  };

  const handleResetSelectedObjectLabelPosition = () => {
    updateSelectedObject((object) => ({
      ...object,
      labelOffsetX: undefined,
      labelOffsetY: undefined,
    }));
  };

  const handleSelectedObjectColorChange = (value: string) => {
    updateSelectedObject((object) => ({
      ...object,
      color: value,
    }));
  };

  const handleSelectedObjectStrokeColorChange = (value: string) => {
    updateSelectedObject((object) => ({
      ...object,
      strokeColor: value === getDefaultStrokeColorByObject(object) ? undefined : value,
    }));
  };

  const handleSelectedObjectStrokeWidthChange = (value: string) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    updateSelectedObject((object) => {
      const nextStrokeWidth = Math.max(0, parsedValue);

      return {
        ...object,
        strokeWidth:
          nextStrokeWidth === getDefaultStrokeWidthByType(object.type) ? undefined : nextStrokeWidth,
      };
    });
  };

  const handleSelectedObjectLabelColorChange = (value: string) => {
    updateSelectedObject((object) => ({
      ...object,
      labelColor: value === '#0f172a' ? undefined : value,
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

  const handleSiteImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!userId) {
      setSaveMessage('Image upload failed: You must be logged in.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSaveMessage('Image upload failed: Please choose an image file.');
      return;
    }

    if (file.size > MAX_SITE_IMAGE_BYTES) {
      setSaveMessage('Image upload failed: Please choose an image smaller than 10 MB.');
      return;
    }

    const storagePath = getSiteImageStoragePath(userId, project.id, file.name);

    setIsUploadingSiteImage(true);
    setSaveMessage('Uploading site image...');

    try {
      const imageRef = storageRef(storage, storagePath);
      await uploadBytes(imageRef, file, {
        contentType: file.type,
      });

      const downloadUrl = await getDownloadURL(imageRef);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      setProject((prev) => {
        queueSiteImagePathForDeletion(prev.backgroundImagePath);

        return {
          ...prev,
          updatedAt: new Date().toISOString(),
          backgroundImageUrl: downloadUrl,
          backgroundImagePath: storagePath,
        };
      });

      setSaveMessage('Site image uploaded. Save the project to keep this image.');
    } catch (error) {
      console.error('Failed to upload site image', error);
      setSaveMessage('Image upload failed');
    } finally {
      setIsUploadingSiteImage(false);
    }
  };

  const handleClearSiteImage = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setProject((prev) => {
      queueSiteImagePathForDeletion(prev.backgroundImagePath);

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        backgroundImageUrl: undefined,
        backgroundImagePath: undefined,
      };
    });
  };

  const handleSaveProject = async () => {
    if (!userId) {
      setSaveMessage('Save failed: You must be logged in.');
      return;
    }

    const projectToSave: DockProject = {
      ...project,
      name: projectName,
      updatedAt: new Date().toISOString(),
      scale: currentScale,
    };

    setProject(projectToSave);
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await saveProject(userId, projectToSave);
      await deleteQueuedSiteImages();
      lastSavedSnapshotRef.current = JSON.stringify(projectToSave);
      setIsDirty(false);
      setLastSavedAt(projectToSave.updatedAt);
      setSaveMessage(null);
    } catch (error) {
      console.error('Failed to save project', error);
      setSaveMessage('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToProjectsClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isDirty) {
      return;
    }

    const shouldLeave = window.confirm('You have unsaved changes. Leave without saving?');
    if (!shouldLeave) {
      event.preventDefault();
    }
  };

  const handleExportPdf = async () => {
    const previousSelectedObjectId = selectedObjectId;
    setSelectedObjectId(null);

    await waitForNextPaint();

    const imageDataUrl = editorCanvasRef.current?.exportAsImage(2) ?? null;

    setSelectedObjectId(previousSelectedObjectId);

    if (!imageDataUrl) {
      setSaveMessage('Export failed');
      return;
    }

    const scaleSummaryHtml =
      currentScale.realLength > 0 && currentScale.pixels > 0
        ? `<p><strong>Scale:</strong> ${currentScale.realLength} ${escapeHtml(currentScale.unit)}</p>`
        : '';

    const printed = printImageInHiddenFrame({
      imageDataUrl,
      projectName: escapeHtml(projectName),
      exportedAt: escapeHtml(new Date().toLocaleString()),
      scaleSummaryHtml,
    });

    if (!printed) {
      setSaveMessage('Export failed');
    }
  };

  return (
    <AppShell className="h-screen overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-32 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <img
                src="/kehoe-header-logo.png"
                alt="Kehoe Marine Construction"
                className="max-h-8 w-auto object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-slate-500">Kehoe Dock Planner</p>
              <h1 className="truncate text-lg font-semibold text-slate-900">{projectName}</h1>
              <div
                className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${saveStatusIndicator.className}`}
              >
                {saveStatusIndicator.label}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleSaveProject}
              disabled={isSaving || !isDirty || !userId}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!canZoomOut}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              -
            </button>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
              {(zoom * 100).toFixed(0)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!canZoomIn}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              +
            </button>
            <Link
              to="/projects"
              onClick={handleBackToProjectsClick}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
            >
              Back to Projects
            </Link>
          </div>
        </header>

        {statusMessage && (
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            {statusMessage}
          </div>
        )}

        <main className="grid h-full min-h-0 w-full min-w-0 overflow-hidden grid-cols-[240px_minmax(0,1fr)_300px]">
          <aside className="min-w-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tools</p>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Core Tools</p>
                <div className="grid grid-cols-1 gap-2">
                  {coreToolModes.map((tool) => {
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
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Dock Elements</p>
                <div className="grid grid-cols-1 gap-2">
                  {dockElementToolModes.map((tool) => {
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
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Shapes</p>
                <button
                  type="button"
                  onClick={() => setIsShapeSelectorOpen((previous) => !previous)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {isShapeSelectorOpen ? 'Hide Shapes' : 'Choose Shape'}
                </button>

                {isShapeSelectorOpen && (
                  <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                    {shapeToolGroups.map((group) => (
                      <div key={group.title}>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.title}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {group.tools.map((tool) => {
                            const isActive = tool === activeTool;
                            const isEnabled = isCoreTool(tool) || isObjectTool(tool);

                            return (
                              <button
                                key={tool}
                                type="button"
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.setData('application/x-dock-tool', tool);
                                  event.dataTransfer.effectAllowed = 'copy';
                                }}
                                onClick={() => handleToolClick(tool)}
                                disabled={!isEnabled}
                                title={toolLabels[tool]}
                                className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-md border px-1.5 py-1 text-center text-[11px] ${
                                  isActive
                                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                } ${!isEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
                              >
                                <ShapeToolPreview tool={tool} />
                                <span className="leading-tight">{toolLabels[tool]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="min-h-0 min-w-0 overflow-hidden bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Active Tool
                </p>
                <p className="truncate text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{toolLabels[activeTool]}</span>
                  <span className="text-slate-500"> - {activeToolHint}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                {['Delete', 'Ctrl+D', 'Esc', 'Arrows', 'Shift+Arrows'].map((shortcut) => (
                  <span key={shortcut} className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                    {shortcut}
                  </span>
                ))}
              </div>
            </div>
            <EditorCanvas
              ref={editorCanvasRef}
              activeTool={activeTool}
              scalePoints={scalePoints}
              shorelinePoints={project.shorelinePoints}
              objects={sortedObjects}
              selectedObjectId={selectedObjectId}
              backgroundImageUrl={project.backgroundImageUrl}
              onCanvasPointClick={handleCanvasPointClick}
              onCanvasObjectDraw={handleCanvasObjectDraw}
              onCanvasToolDrop={handleCanvasToolDrop}
              onObjectClick={handleObjectClick}
              onObjectPositionChange={handleObjectPositionChange}
              onObjectSizeChange={handleObjectSizeChange}
              onObjectRotationChange={handleObjectRotationChange}
              onObjectLabelOffsetChange={handleObjectLabelOffsetChange}
              currentScale={currentScale}
              isSnapToGridEnabled={isSnapToGridEnabled}
              zoom={zoom}
              onZoomChange={setZoom}
            />
          </section>

          <aside className="min-w-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Properties</p>

            <div className="mt-3 space-y-3 pb-6">
              <div className="rounded-md border border-slate-200 p-3">
                <h3 className="text-sm font-semibold text-slate-800">Project Details</h3>
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Project Name
                  </span>
                  <input
                    type="text"
                    value={project.name}
                    onChange={(event) => handleProjectNameChange(event.target.value)}
                    placeholder="Untitled Project"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  />
                </label>
              </div>

              <div className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Site Image</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Upload a single site image to use as the canvas background.
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-3 rounded-md border px-3 py-2 text-sm ${
                    isUploadingSiteImage
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : project.backgroundImageUrl
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {isUploadingSiteImage
                    ? 'Uploading site image...'
                    : project.backgroundImageUrl
                      ? 'Site image attached.'
                      : 'No site image attached.'}
                </div>

                {isDirty && (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    You have unsaved changes. Click Save to keep the current site image update.
                  </p>
                )}

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    {project.backgroundImageUrl ? 'Replace Site Image' : 'Upload Site Image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSiteImageUpload}
                    disabled={isUploadingSiteImage}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleClearSiteImage}
                  disabled={!project.backgroundImageUrl || isUploadingSiteImage}
                  className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploadingSiteImage ? 'Uploading...' : 'Clear Site Image'}
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
                  <div className="mt-3 space-y-3 text-sm text-slate-700">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Label Settings
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Type: <span className="font-medium text-slate-700">{selectedObject.type}</span>
                      </p>

                      <label className="mt-3 block">
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

                      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Label Position
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Drag the label on the canvas to place it outside the element.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetSelectedObjectLabelPosition}
                          disabled={!selectedObject.labelOffsetX && !selectedObject.labelOffsetY}
                          className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reset Label Inside Element
                        </button>
                      </div>

                      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Label Visibility
                        </p>
                        <button
                          type="button"
                          onClick={handleToggleSelectedObjectLabelVisibility}
                          className={`mt-3 w-full rounded-md border px-3 py-2 text-xs font-medium ${
                            selectedObject.labelHidden
                              ? 'border-brand-600 bg-brand-50 text-brand-700'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {selectedObject.labelHidden ? 'Show Label' : 'Hide Label'}
                        </button>
                      </div>

                      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Label Text Colour
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              Change label colour for readability over images or dark elements.
                            </p>
                          </div>
                          <input
                            type="color"
                            value={selectedObject.labelColor ?? '#0f172a'}
                            onChange={(event) => handleSelectedObjectLabelColorChange(event.target.value)}
                            className="h-10 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                            aria-label="Selected object label text colour"
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {LABEL_COLOR_PRESETS.map((preset) => {
                            const selectedLabelColor = selectedObject.labelColor ?? '#0f172a';
                            const isSelectedLabelColour =
                              selectedLabelColor.toLowerCase() === preset.value.toLowerCase();

                            return (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => handleSelectedObjectLabelColorChange(preset.value)}
                                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-xs ${
                                  isSelectedLabelColour
                                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span
                                  className="h-4 w-4 shrink-0 rounded border border-slate-300"
                                  style={{ backgroundColor: preset.value }}
                                />
                                <span className="truncate">{preset.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Element Appearance
                      </p>

                      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Element Colour
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              Choose a custom colour or use a material preset.
                            </p>
                          </div>
                          <input
                            type="color"
                            value={selectedObject.color}
                            onChange={(event) => handleSelectedObjectColorChange(event.target.value)}
                            className="h-10 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                            aria-label="Selected object colour"
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {OBJECT_COLOR_PRESETS.map((preset) => {
                            const isSelectedColour =
                              selectedObject.color.toLowerCase() === preset.value.toLowerCase();

                            return (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => handleSelectedObjectColorChange(preset.value)}
                                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-xs ${
                                  isSelectedColour
                                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span
                                  className="h-4 w-4 shrink-0 rounded border border-slate-300"
                                  style={{ backgroundColor: preset.value }}
                                />
                                <span className="truncate">{preset.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Outline Colour
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              Change the outline colour for shapes, lines, and dimension marks.
                            </p>
                          </div>
                          <input
                            type="color"
                            value={getObjectStrokeColorForControls(selectedObject)}
                            onChange={(event) => handleSelectedObjectStrokeColorChange(event.target.value)}
                            className="h-10 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                            aria-label="Selected object outline colour"
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {OUTLINE_COLOR_PRESETS.map((preset) => {
                            const selectedStrokeColor = getObjectStrokeColorForControls(selectedObject);
                            const isSelectedStrokeColour =
                              selectedStrokeColor.toLowerCase() === preset.value.toLowerCase();

                            return (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => handleSelectedObjectStrokeColorChange(preset.value)}
                                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-xs ${
                                  isSelectedStrokeColour
                                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span
                                  className="h-4 w-4 shrink-0 rounded border border-slate-300"
                                  style={{ backgroundColor: preset.value }}
                                />
                                <span className="truncate">{preset.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <label className="mt-3 block rounded-md border border-slate-200 bg-white p-3">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                          Line Thickness
                        </span>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min={0}
                            max={10}
                            step={0.5}
                            value={getObjectStrokeWidthForControls(selectedObject)}
                            onChange={(event) => handleSelectedObjectStrokeWidthChange(event.target.value)}
                            className="w-full"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={20}
                              step={0.5}
                              value={getObjectStrokeWidthForControls(selectedObject)}
                              onChange={(event) => handleSelectedObjectStrokeWidthChange(event.target.value)}
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                            />
                            <span className="min-w-[52px] text-right text-xs text-slate-500">
                              {getObjectStrokeWidthForControls(selectedObject)}px
                            </span>
                          </div>
                        </div>
                      </label>

                      <label className="mt-3 block rounded-md border border-slate-200 bg-white p-3">
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
                    </div>

                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Size and Position
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2">
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
                      </div>

                      {selectedObject.type === 'dimension_line' && (
                        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Dimension Length
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            Enter the real-world length for this dimension line in feet and inches.
                          </p>

                          {!selectedDimensionLength?.canUseScale && (
                            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              Set the project scale first before entering a dimension length.
                            </p>
                          )}

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <label className="block">
                              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                Feet
                              </span>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={selectedDimensionLength?.feet ?? 0}
                                onChange={(event) => handleSelectedDimensionFeetChange(event.target.value)}
                                disabled={!selectedDimensionLength?.canUseScale}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                Inches
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={11}
                                step={1}
                                value={selectedDimensionLength?.inches ?? 0}
                                onChange={(event) => handleSelectedDimensionInchesChange(event.target.value)}
                                disabled={!selectedDimensionLength?.canUseScale}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                              />
                            </label>
                          </div>
                        </div>
                      )}

                      <label className="mt-3 block">
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

                      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Flip
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleFlipSelectedObjectHorizontal}
                            className={`rounded-md border px-3 py-2 text-sm ${
                              selectedObject.flippedX
                                ? 'border-brand-600 bg-brand-50 text-brand-700'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            Horizontal
                          </button>
                          <button
                            type="button"
                            onClick={handleFlipSelectedObjectVertical}
                            className={`rounded-md border px-3 py-2 text-sm ${
                              selectedObject.flippedY
                                ? 'border-brand-600 bg-brand-50 text-brand-700'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            Vertical
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Layer Controls
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleSendSelectedObjectBackward}
                          disabled={isSelectedObjectOnBottom}
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Send Backward
                        </button>
                        <button
                          type="button"
                          onClick={handleBringSelectedObjectForward}
                          disabled={isSelectedObjectOnTop}
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Bring Forward
                        </button>
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Object Actions
                      </p>

                      <button
                        type="button"
                        onClick={handleDuplicateSelectedObject}
                        className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Duplicate Selected Object
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteSelectedObject}
                        className="mt-3 w-full rounded-md border border-rose-300 bg-white px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                      >
                        Delete Selected Object
                      </button>

                      {isDeleteConfirmationVisible && (
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
                              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
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
                    Estimated real length: {estimatedShorelineLength.toFixed(2)} {currentScale.unit}
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