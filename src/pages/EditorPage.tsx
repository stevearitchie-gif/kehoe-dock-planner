import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createRoot } from 'react-dom/client';
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
import { SectionViewCanvas } from '@/features/sectionView/SectionViewCanvas';
import { generateSectionViewFromBuildPlan } from '@/features/sectionView/buildPlanSectionAdapter';
import { getDefaultSectionView } from '@/features/sectionView/sectionTemplates';
import { storage } from '@/lib/firebase';
import type { BuildPlanDisplaySettings, DockObject, DockProject, DrawingInfo, Point, ProjectScale, UnitType } from '@/types/dock';
import type { SectionViewData } from '@/features/sectionView/sectionTypes';

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
const AUTOSAVE_DELAY_MS = 3000;
const BUILD_PLAN_PRINT_PADDING = 120;
const BUILD_PLAN_LABEL_FONT_SIZE = 12;
const DEFAULT_BUILD_PLAN_LABEL_FONT_SIZE = 12;
const DEFAULT_BUILD_PLAN_DIMENSION_FONT_SIZE = 12;
const MIN_BUILD_PLAN_FONT_SIZE = 8;
const MAX_BUILD_PLAN_FONT_SIZE = 28;
const UNDO_HISTORY_LIMIT = 40;

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
type PlannerView = 'build' | 'section';

interface SelectedObjectDimensionInputs {
  objectId: string | null;
  width: string;
  height: string;
}

interface UndoSnapshot {
  project: DockProject;
  scalePoints: Point[];
  selectedObjectId: string | null;
}

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
      'shape_circle',
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

    case 'shape_circle':
      return (
        <svg viewBox="0 0 64 40" className="h-8 w-12" aria-hidden="true">
          <circle cx="32" cy="20" r="14" fill={fill} stroke={stroke} strokeWidth="2" />
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

function canUseProjectScale(scale: ProjectScale): boolean {
  return scale.pixels > 0 && scale.realLength > 0;
}

function getRealLengthFromCanvasPixels(pixels: number, scale: ProjectScale): number | null {
  if (!canUseProjectScale(scale)) {
    return null;
  }

  const lengthInScaleUnits = (pixels / scale.pixels) * scale.realLength;
  return scale.unit === 'm' ? lengthInScaleUnits * FEET_PER_METER : lengthInScaleUnits;
}

function getCanvasPixelsFromRealLength(realLength: number, scale: ProjectScale): number | null {
  if (!canUseProjectScale(scale)) {
    return null;
  }

  const lengthInScaleUnits = scale.unit === 'm' ? realLength / FEET_PER_METER : realLength;
  return (lengthInScaleUnits / scale.realLength) * scale.pixels;
}

function formatScaledDimensionValue(pixels: number, scale: ProjectScale): string {
  const realLength = getRealLengthFromCanvasPixels(pixels, scale);
  if (realLength === null) {
    return Number(pixels.toFixed(2)).toString();
  }

  return Number(realLength.toFixed(2)).toString();
}

function getDimensionInputLabel(axis: 'width' | 'height', scale: ProjectScale): string {
  const baseLabel = axis === 'width' ? 'Width' : 'Height';
  return canUseProjectScale(scale) ? `${baseLabel} (${scale.unit === 'm' ? 'm' : 'ft'})` : `${baseLabel} (px)`;
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

function canUseBoardTextureControls(object: DockObject): boolean {
  return ['floating_dock', 'stationary_dock', 'custom_stationary_dock', 'ramp_with_rails', 'ramp_without_rails'].includes(object.type);
}

function buildEditorProject(projectId: string | undefined): DockProject {
  return {
    id: projectId ?? 'local-editor-project',
    name: projectId ? `Project ${projectId}` : 'Untitled Project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    shorelinePoints: [],
    objects: [],
    sectionView: getDefaultSectionView(),
  };
}

function clampBuildPlanFontSize(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(MAX_BUILD_PLAN_FONT_SIZE, Math.max(MIN_BUILD_PLAN_FONT_SIZE, Math.round(value)));
}

function resolveBuildPlanDisplaySettings(project: DockProject): Required<BuildPlanDisplaySettings> {
  return {
    labelFontSizePx: clampBuildPlanFontSize(
      project.buildPlanDisplaySettings?.labelFontSizePx ?? DEFAULT_BUILD_PLAN_LABEL_FONT_SIZE,
      DEFAULT_BUILD_PLAN_LABEL_FONT_SIZE,
    ),
    dimensionFontSizePx: clampBuildPlanFontSize(
      project.buildPlanDisplaySettings?.dimensionFontSizePx ?? DEFAULT_BUILD_PLAN_DIMENSION_FONT_SIZE,
      DEFAULT_BUILD_PLAN_DIMENSION_FONT_SIZE,
    ),
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

function resolveDrawingInfo(project: DockProject): DrawingInfo {
  return {
    client: project.drawingInfo?.client ?? project.clientName ?? '',
    location: project.drawingInfo?.location ?? project.projectLocation ?? '',
    description: project.drawingInfo?.description ?? project.description ?? project.name,
    drawingNumber: project.drawingInfo?.drawingNumber ?? project.drawingNumber ?? '',
    revision: project.drawingInfo?.revision ?? project.revision ?? '0',
    completedBy: project.drawingInfo?.completedBy ?? project.completedBy ?? '',
    date: project.drawingInfo?.date ?? project.drawingDate ?? '',
  };
}

const BUILD_PLAN_SHEET_WIDTH_PX = 2200;
const BUILD_PLAN_SHEET_HEIGHT_PX = 1700;
const BUILD_PLAN_SHEET_MARGIN_PX = 110;
const BUILD_PLAN_TITLE_BLOCK_WIDTH_PX = 780;
const BUILD_PLAN_TITLE_BLOCK_HEIGHT_PX = 230;
const BUILD_PLAN_TITLE_BLOCK_GAP_PX = 38;
const BUILD_PLAN_FOOTER_HEIGHT_PX = 40;

function loadImageDataUrl(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

function drawFittedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  area: { x: number; y: number; width: number; height: number },
) {
  const scale = Math.min(area.width / image.naturalWidth, area.height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = area.x + (area.width - drawWidth) / 2;
  const drawY = area.y + (area.height - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function truncateCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }

  let nextValue = value;
  while (nextValue.length > 1 && context.measureText(`${nextValue}...`).width > maxWidth) {
    nextValue = nextValue.slice(0, -1);
  }

  return `${nextValue}...`;
}

function drawTitleField(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.fillStyle = '#111827';
  context.font = '16px Arial';
  context.textBaseline = 'middle';
  context.fillText(label, x + 10, y + height / 2);

  const labelWidth = context.measureText(label).width;
  context.font = '600 16px Arial';
  context.fillText(truncateCanvasText(context, value, width - labelWidth - 28), x + 16 + labelWidth, y + height / 2);
  context.restore();
}

function drawBuildPlanTitleBlock(
  context: CanvasRenderingContext2D,
  args: {
    x: number;
    y: number;
    width: number;
    height: number;
    drawingInfo: DrawingInfo;
    drawingDate: string;
    scaleLabel: string;
    projectName: string;
  },
) {
  const { x, y, width, height, drawingInfo, drawingDate, scaleLabel, projectName } = args;
  const leftWidth = Math.round(width * 0.42);
  const middleWidth = Math.round(width * 0.4);
  const rightWidth = width - leftWidth - middleWidth;
  const rowHeights = [38, 38, 48, 48, height - 38 - 38 - 48 - 48];
  const rowY = rowHeights.reduce<number[]>((accumulator, _rowHeight, index) => {
    accumulator.push(index === 0 ? y : accumulator[index - 1] + rowHeights[index - 1]);
    return accumulator;
  }, []);

  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(x, y, width, height);
  context.strokeStyle = '#111827';
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);

  rowY.slice(1).forEach((lineY) => {
    context.beginPath();
    context.moveTo(x, lineY);
    context.lineTo(x + width, lineY);
    context.stroke();
  });

  [x + leftWidth, x + leftWidth + middleWidth].forEach((lineX) => {
    context.beginPath();
    context.moveTo(lineX, y);
    context.lineTo(lineX, y + height);
    context.stroke();
  });

  context.fillStyle = '#f3f4f6';
  context.fillRect(x + 1, rowY[1] + 1, leftWidth - 2, rowHeights[1] - 2);
  context.fillStyle = '#111827';
  context.font = '700 23px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  scaleLabel.split('\n').forEach((line, index, lines) => {
    context.fillText(line, x + leftWidth / 2, rowY[1] + rowHeights[1] / 2 + (index - (lines.length - 1) / 2) * 24);
  });

  drawTitleField(context, 'Date:', drawingDate, x, rowY[0], leftWidth, rowHeights[0]);
  drawTitleField(context, 'Client:', drawingInfo.client ?? '', x + leftWidth, rowY[0], middleWidth + rightWidth, rowHeights[0]);
  drawTitleField(context, 'Location:', drawingInfo.location ?? '', x + leftWidth, rowY[1], middleWidth + rightWidth, rowHeights[1]);
  drawTitleField(context, 'Description:', drawingInfo.description ?? projectName, x + leftWidth, rowY[2], middleWidth + rightWidth, rowHeights[2]);
  drawTitleField(context, 'Drawing #:', drawingInfo.drawingNumber ?? '', x + leftWidth, rowY[3], middleWidth, rowHeights[3]);
  drawTitleField(context, 'Rev:', drawingInfo.revision ?? '0', x + leftWidth + middleWidth, rowY[3], rightWidth, rowHeights[3]);
  drawTitleField(context, 'Completed By:', drawingInfo.completedBy ?? '', x, rowY[4], leftWidth, rowHeights[4]);

  const logoY = rowY[2] + rowHeights[2] + 4;
  const logoX = x + Math.round(leftWidth * 0.28);
  context.fillStyle = '#cf2e2e';
  context.fillRect(logoX, logoY, 122, 44);
  context.fillStyle = '#ffffff';
  context.font = 'italic 700 28px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Kehoe', logoX + 61, logoY + 22);
  context.fillStyle = '#475569';
  context.font = '700 12px Arial';
  context.textAlign = 'left';
  context.fillText('MARINE', logoX + 138, logoY + 16);
  context.fillText('CONSTRUCTION', logoX + 138, logoY + 31);
  context.restore();
}

async function composeBuildPlanSheetImage(args: {
  buildPlanImageDataUrl: string;
  drawingInfo: DrawingInfo;
  drawingDate: string;
  scaleLabel: string;
  projectName: string;
}): Promise<string | null> {
  const buildPlanImage = await loadImageDataUrl(args.buildPlanImageDataUrl);
  if (!buildPlanImage) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = BUILD_PLAN_SHEET_WIDTH_PX;
  canvas.height = BUILD_PLAN_SHEET_HEIGHT_PX;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const titleBlockX = canvas.width - BUILD_PLAN_SHEET_MARGIN_PX - BUILD_PLAN_TITLE_BLOCK_WIDTH_PX;
  const titleBlockY = canvas.height - BUILD_PLAN_SHEET_MARGIN_PX - BUILD_PLAN_TITLE_BLOCK_HEIGHT_PX;
  const drawingArea = {
    x: BUILD_PLAN_SHEET_MARGIN_PX,
    y: BUILD_PLAN_SHEET_MARGIN_PX,
    width: canvas.width - BUILD_PLAN_SHEET_MARGIN_PX * 2,
    height: titleBlockY - BUILD_PLAN_TITLE_BLOCK_GAP_PX - BUILD_PLAN_SHEET_MARGIN_PX,
  };

  drawFittedImage(context, buildPlanImage, drawingArea);
  drawBuildPlanTitleBlock(context, {
    x: titleBlockX,
    y: titleBlockY,
    width: BUILD_PLAN_TITLE_BLOCK_WIDTH_PX,
    height: BUILD_PLAN_TITLE_BLOCK_HEIGHT_PX,
    drawingInfo: args.drawingInfo,
    drawingDate: args.drawingDate,
    scaleLabel: args.scaleLabel,
    projectName: args.projectName,
  });

  context.fillStyle = '#475569';
  context.font = '14px Arial';
  context.textBaseline = 'middle';
  context.fillText('Permit-support drawing generated from Build Plan. Verify dimensions and site conditions before submission.', BUILD_PLAN_SHEET_MARGIN_PX, canvas.height - BUILD_PLAN_FOOTER_HEIGHT_PX);

  return canvas.toDataURL('image/png');
}

function expandBounds(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  x: number,
  y: number,
) {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function expandRectBounds(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  x: number,
  y: number,
  width: number,
  height: number,
) {
  expandBounds(bounds, x, y);
  expandBounds(bounds, x + width, y + height);
}

function expandRotatedObjectBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number }, object: DockObject) {
  const angle = (object.rotation * Math.PI) / 180;
  const corners =
    object.type === 'custom_stationary_dock' && object.metadata?.customPoints && object.metadata.customPoints.length >= 3
      ? object.metadata.customPoints
      : [
          { x: 0, y: 0 },
          { x: object.width, y: 0 },
          { x: object.width, y: object.height },
          { x: 0, y: object.height },
        ];

  corners.forEach((corner) => {
    expandBounds(bounds, object.x + corner.x * Math.cos(angle) - corner.y * Math.sin(angle), object.y + corner.x * Math.sin(angle) + corner.y * Math.cos(angle));
  });
}

function estimateBuildPlanLabelSize(label: string, rotation?: 0 | 90 | -90) {
  const textWidth = Math.max(120, Math.ceil(String(label || '').replace(/\s+/g, ' ').trim().length * BUILD_PLAN_LABEL_FONT_SIZE * 0.7 + 20));
  const textHeight = BUILD_PLAN_LABEL_FONT_SIZE * 1.5;

  return rotation === 90 || rotation === -90
    ? { width: textHeight + 20, height: textWidth + 20 }
    : { width: textWidth + 20, height: textHeight + 14 };
}

function getBuildPlanContentBounds(project: DockProject, scalePoints: Point[]): { x: number; y: number; width: number; height: number } {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  project.objects.forEach((object) => {
    expandRotatedObjectBounds(bounds, object);

    if (!object.labelHidden) {
      const labelSize = estimateBuildPlanLabelSize(object.label, object.labelRotation);
      const labelCenterX = object.x + object.width / 2 + (object.labelOffsetX ?? 0);
      const labelCenterY =
        object.y +
        (object.type === 'dimension_line' ? -(BUILD_PLAN_LABEL_FONT_SIZE * 0.75 + 6) : object.height / 2) +
        (object.labelOffsetY ?? 0);
      expandRectBounds(bounds, labelCenterX - labelSize.width / 2, labelCenterY - labelSize.height / 2, labelSize.width, labelSize.height);
    }

    if (!object.dimensionsHidden && object.type !== 'dimension_line') {
      expandRectBounds(
        bounds,
        object.x + (object.dimensionWidthOffsetX ?? 0),
        object.y + object.height + 10 + (object.dimensionWidthOffsetY ?? 0),
        object.width,
        42,
      );
      expandRectBounds(
        bounds,
        object.x + object.width + 10 + (object.dimensionHeightOffsetX ?? 0),
        object.y + (object.dimensionHeightOffsetY ?? 0),
        120,
        object.height,
      );
    }
  });

  project.shorelinePoints.forEach((point) => expandBounds(bounds, point.x, point.y));

  scalePoints.forEach((point) => expandBounds(bounds, point.x, point.y));

  if (scalePoints.length >= 2) {
    const minX = Math.min(...scalePoints.map((point) => point.x));
    const minY = Math.min(...scalePoints.map((point) => point.y));
    const maxX = Math.max(...scalePoints.map((point) => point.x));
    const maxY = Math.max(...scalePoints.map((point) => point.y));
    expandRectBounds(bounds, minX - 36, minY - 56, maxX - minX + 72, maxY - minY + 92);
  }

  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY) || !Number.isFinite(bounds.maxX) || !Number.isFinite(bounds.maxY)) {
    return { x: 0, y: 0, width: 1200, height: 800 };
  }

  return {
    x: bounds.minX - BUILD_PLAN_PRINT_PADDING,
    y: bounds.minY - BUILD_PLAN_PRINT_PADDING,
    width: Math.max(1, bounds.maxX - bounds.minX + BUILD_PLAN_PRINT_PADDING * 2),
    height: Math.max(1, bounds.maxY - bounds.minY + BUILD_PLAN_PRINT_PADDING * 2),
  };
}

function printImageInHiddenFrame(args: {
  imageDataUrl: string;
  sectionViewImageDataUrl?: string | null;
  sectionViewTitleBlockHtml?: string;
  projectName: string;
}): boolean {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '11in';
  iframe.style.height = '8.5in';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
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
          @page {
            size: letter landscape;
            margin: 0;
          }
          html {
            margin: 0;
            padding: 0;
            width: 11in;
            height: 8.5in;
          }
          body {
            margin: 0;
            padding: 0;
            width: 11in;
            min-height: 8.5in;
            font-family: Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            overflow: visible;
          }
          .page {
            position: relative;
            width: 11in;
            height: 8.5in;
            box-sizing: border-box;
            background: #ffffff;
            overflow: hidden;
          }
          .page + .page {
            break-before: page;
            page-break-before: always;
          }
          .build-plan-drawing-area {
            position: absolute;
            inset: 0;
            overflow: hidden;
          }
          .canvas-image {
            width: 11in;
            height: 8.5in;
            object-fit: fill;
            object-position: center center;
            display: block;
          }
          .section-view-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center center;
            display: block;
          }
          .section-page {
            position: relative;
          }
          .section-sheet {
            position: relative;
            width: 11in;
            height: 8.5in;
          }
          .section-sheet .title-block {
            right: 0.35in;
            bottom: 0.35in;
          }
          .title-block {
            position: absolute;
            right: 0.35in;
            bottom: 0.35in;
            box-sizing: border-box;
            width: 3.9in;
            min-height: 1.08in;
            border: 0.75pt solid #111827;
            background: #ffffff;
            font-size: 8pt;
            line-height: 1.05;
            z-index: 5;
          }
          .title-block-bottom-right {
            right: 0.35in;
            bottom: 0.35in;
          }
          .title-block-bottom-left {
            left: 0.35in;
            bottom: 0.35in;
          }
          .title-block-top-right {
            right: 0.35in;
            top: 0.35in;
          }
          .title-block-top-left {
            left: 0.35in;
            top: 0.35in;
          }
          .title-block table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .title-block td {
            border: 0.75pt solid #111827;
            padding: 0.012in 0.024in;
            vertical-align: middle;
          }
          .title-field {
            display: flex;
            align-items: center;
            min-height: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .title-label {
            font-size: 8pt;
            font-weight: 400;
          }
          .title-value {
            display: inline;
            margin-left: 0.035in;
            font-size: 8pt;
            font-weight: 600;
          }
          .scale-note {
            background: #f3f4f6;
            text-align: center;
            font-size: 10pt;
            font-weight: 700;
            line-height: 1.05;
          }
          .title-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.06in;
            height: 0.32in;
            margin: 0.01in auto;
          }
          .title-logo-mark {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 0.68in;
            height: 0.24in;
            background: #cf2e2e;
            color: #ffffff;
            font-size: 14pt;
            font-style: italic;
            font-weight: 800;
          }
          .title-logo-text {
            display: inline-block;
            color: #475569;
            font-size: 7pt;
            font-weight: 700;
            line-height: 1.05;
            text-transform: uppercase;
          }
          .info-row td {
            height: 0.17in;
            padding-top: 0.015in;
            padding-bottom: 0.015in;
          }
          .scale-row td {
            height: 0.15in;
          }
          .drawing-row td {
            height: 0.14in;
            padding-top: 0.01in;
            padding-bottom: 0.01in;
          }
          .logo-cell {
            height: 0.34in;
          }
          .title-main-cell {
            width: 68%;
          }
          .drawing-cell {
            width: 22%;
          }
          .small-cell {
            width: 10%;
            text-align: center;
          }
          @media print {
            html,
            body {
              width: 11in;
              min-height: 8.5in;
              margin: 0;
              padding: 0;
              overflow: visible;
            }
            .page {
              width: 11in;
              height: 8.5in;
            }
            .canvas-image {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="build-plan-drawing-area">
            <img id="export-image" class="canvas-image" src="${args.imageDataUrl}" alt="${args.projectName}" />
          </div>
        </div>
        ${
          args.sectionViewImageDataUrl
            ? `
        <div class="page section-page">
          <div class="section-sheet">
            <img class="section-view-image" src="${args.sectionViewImageDataUrl}" alt="${args.projectName} Section View" />
            ${args.sectionViewTitleBlockHtml ?? ''}
          </div>
        </div>
        `
            : ''
        }
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

function svgElementToPngDataUrl(
  svgElement: SVGSVGElement,
  width: number,
  height: number,
  options: { hideTitleBlock?: boolean } = {},
): Promise<string | null> {
  return new Promise((resolve) => {
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (options.hideTitleBlock) {
      svgClone.querySelector('[data-section-editable-id="title-block"]')?.remove();
    }
    const serializedSvg = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/png'));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

async function captureSectionViewForPdf(sectionView: SectionViewData, projectName: string, drawingInfo?: DrawingInfo): Promise<string | null> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '1400px';
  container.style.height = '1000px';
  container.style.pointerEvents = 'none';
  container.style.opacity = '0';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    root.render(
      <SectionViewCanvas
        sectionView={sectionView}
        projectName={projectName}
        drawingInfo={drawingInfo}
        onChange={() => undefined}
        onGenerateFromBuildPlan={() => undefined}
      />,
    );

    await waitForNextPaint();

    const svgElement = container.querySelector(
      'svg[aria-label="Section view permit drawing sheet"]',
    ) as SVGSVGElement | null;

    if (!svgElement) {
      return null;
    }

    return await svgElementToPngDataUrl(svgElement, 2200, 1700, { hideTitleBlock: true });
  } finally {
    root.unmount();
    container.remove();
  }
}

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const editorCanvasRef = useRef<EditorCanvasHandle | null>(null);

  const [project, setProject] = useState<DockProject>(() => buildEditorProject(projectId));
  const [activePlannerView, setActivePlannerView] = useState<PlannerView>('build');
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [scalePoints, setScalePoints] = useState<Point[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isSnapToGridEnabled, setIsSnapToGridEnabled] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedCustomDockPointIndex, setSelectedCustomDockPointIndex] = useState<number | null>(null);
  const [isShapeSelectorOpen, setIsShapeSelectorOpen] = useState(false);
  const [isLabelMoveModeEnabled, setIsLabelMoveModeEnabled] = useState(false);
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false);
  const [isToolsPanelVisible, setIsToolsPanelVisible] = useState(true);
  const [isDetailsPanelVisible, setIsDetailsPanelVisible] = useState(true);
  const [includeSectionViewInPdf, setIncludeSectionViewInPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingSiteImage, setIsUploadingSiteImage] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hasInitializedProject, setHasInitializedProject] = useState(false);
  const [selectedObjectDimensionInputs, setSelectedObjectDimensionInputs] = useState<SelectedObjectDimensionInputs>({
    objectId: null,
    width: '',
    height: '',
  });
  const objectUrlRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');
  const pendingDeletedSiteImagePathsRef = useRef<string[]>([]);
  const autosaveTimerRef = useRef<number | null>(null);
  const undoHistoryRef = useRef<UndoSnapshot[]>([]);
  const [undoHistoryDepth, setUndoHistoryDepth] = useState(0);

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

  const pushUndoSnapshot = (snapshot: UndoSnapshot) => {
    const previousSnapshot = undoHistoryRef.current[undoHistoryRef.current.length - 1];
    if (
      previousSnapshot &&
      previousSnapshot.selectedObjectId === snapshot.selectedObjectId &&
      JSON.stringify(previousSnapshot.scalePoints) === JSON.stringify(snapshot.scalePoints) &&
      JSON.stringify(previousSnapshot.project) === JSON.stringify(snapshot.project)
    ) {
      return;
    }

    undoHistoryRef.current = [...undoHistoryRef.current, snapshot].slice(-UNDO_HISTORY_LIMIT);
    setUndoHistoryDepth(undoHistoryRef.current.length);
  };

  const updateProject = (updater: DockProject | ((previousProject: DockProject) => DockProject), options?: { trackUndo?: boolean }) => {
    setProject((previousProject) => {
      const nextProject = typeof updater === 'function' ? updater(previousProject) : updater;

      if (nextProject !== previousProject && options?.trackUndo !== false) {
        pushUndoSnapshot({
          project: previousProject,
          scalePoints,
          selectedObjectId,
        });
      }

      return nextProject;
    });
  };

  const handleUndo = () => {
    const previousSnapshot = undoHistoryRef.current.pop();
    if (!previousSnapshot) {
      return;
    }

    setProject(previousSnapshot.project);
    setScalePoints(previousSnapshot.scalePoints);
    setSelectedObjectId(previousSnapshot.selectedObjectId);
    setSelectedCustomDockPointIndex(null);
    setIsDeleteConfirmationVisible(false);
    setUndoHistoryDepth(undoHistoryRef.current.length);
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

      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const resetUndoHistory = () => {
      undoHistoryRef.current = [];
      setUndoHistoryDepth(0);
    };

    if (!projectId) {
      const blankProject = buildEditorProject(projectId);
      setProject(blankProject);
      resetUndoHistory();
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
      resetUndoHistory();
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
        resetUndoHistory();
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
        resetUndoHistory();
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
  const drawingInfo = useMemo(() => resolveDrawingInfo(project), [project]);
  const buildPlanDisplaySettings = useMemo(() => resolveBuildPlanDisplaySettings(project), [project]);

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

  useEffect(() => {
    setSelectedObjectDimensionInputs({
      objectId: selectedObject?.id ?? null,
      width: selectedObject ? formatScaledDimensionValue(selectedObject.width, currentScale) : '',
      height: selectedObject ? formatScaledDimensionValue(selectedObject.height, currentScale) : '',
    });
  }, [currentScale, selectedObject?.height, selectedObject?.id, selectedObject?.width]);

  useEffect(() => {
    if (!selectedObjectId) {
      return;
    }

    setIsDetailsPanelVisible(true);

    window.setTimeout(() => {
      const sizeSection = document.getElementById('selected-object-size-section');
      const widthInput = document.getElementById('selected-object-width-input') as HTMLInputElement | null;
      sizeSection?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      widthInput?.focus();
      widthInput?.select();
    }, 80);
  }, [selectedObjectId]);

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

  const isFocusModeEnabled = !isToolsPanelVisible && !isDetailsPanelVisible;
  const editorGridTemplateColumns = [
    isToolsPanelVisible ? '240px' : null,
    'minmax(0, 1fr)',
    isDetailsPanelVisible ? '300px' : null,
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    setIsDeleteConfirmationVisible(false);
    setIsLabelMoveModeEnabled(false);
  }, [selectedObjectId]);

  const setProjectScale = (nextScale: ProjectScale) => {
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      scale: nextScale,
    }));
  };

  const handleClearScale = () => {
    setScalePoints([]);
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      scale: undefined,
    }));
    setSaveMessage('Scale calibration removed.');
  };

  const handleToolClick = (toolLabel: string) => {
    if (!editorTools.includes(toolLabel as ToolMode)) {
      return;
    }

    setActiveTool(toolLabel as ToolMode);
  };

  const handleProjectNameChange = (value: string) => {
    updateProject((prev) => ({
      ...prev,
      name: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleProjectInfoChange = (
    field: 'clientName' | 'projectLocation' | 'description' | 'completedBy' | 'drawingNumber' | 'revision' | 'drawingDate',
    value: string,
  ) => {
    const drawingInfoFieldByProjectField: Record<typeof field, keyof DrawingInfo> = {
      clientName: 'client',
      projectLocation: 'location',
      description: 'description',
      completedBy: 'completedBy',
      drawingNumber: 'drawingNumber',
      revision: 'revision',
      drawingDate: 'date',
    };

    updateProject((prev) => ({
      ...prev,
      [field]: value,
      drawingInfo: {
        ...resolveDrawingInfo(prev),
        [drawingInfoFieldByProjectField[field]]: value,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleTitleBlockPositionChange = (
    value: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'hidden',
  ) => {
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      exportSettings: {
        ...prev.exportSettings,
        titleBlockPosition: value,
      },
    }));
  };

  const handleTitleBlockOffsetChange = (axis: 'x' | 'y', value: string) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      exportSettings: {
        ...prev.exportSettings,
        [axis === 'x' ? 'titleBlockOffsetX' : 'titleBlockOffsetY']: parsedValue,
      },
    }));
  };

  const handleResetTitleBlockOffset = () => {
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      exportSettings: {
        ...prev.exportSettings,
        titleBlockOffsetX: 0,
        titleBlockOffsetY: 0,
      },
    }));
  };

  const handleSectionViewChange = (sectionView: SectionViewData) => {
    updateProject((prev) => ({
      ...prev,
      sectionView,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleGenerateSectionViewFromBuildPlan = () => {
    updateProject((prev) => ({
      ...prev,
      sectionView: generateSectionViewFromBuildPlan(prev, currentScale, prev.sectionView ?? getDefaultSectionView()),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleScaleReferenceVisibilityChange = (showScaleReference: boolean) => {
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      exportSettings: {
        ...prev.exportSettings,
        showScaleReference,
      },
    }));
  };

  const handleBuildPlanDisplayFontSizeChange = (
    field: keyof BuildPlanDisplaySettings,
    value: string,
  ) => {
    const parsedValue = Number(value);
    const fallback =
      field === 'labelFontSizePx'
        ? DEFAULT_BUILD_PLAN_LABEL_FONT_SIZE
        : DEFAULT_BUILD_PLAN_DIMENSION_FONT_SIZE;
    const nextValue = clampBuildPlanFontSize(parsedValue, fallback);

    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      buildPlanDisplaySettings: {
        ...resolveBuildPlanDisplaySettings(prev),
        [field]: nextValue,
      },
    }));
  };

  const handleZoomOut = () => {
    setZoom((prev) => clampZoom(Number((prev - ZOOM_STEP).toFixed(2))));
  };

  const handleZoomIn = () => {
    setZoom((prev) => clampZoom(Number((prev + ZOOM_STEP).toFixed(2))));
  };

  const focusScaleLengthInput = () => {
    window.setTimeout(() => {
      const input = document.getElementById('scale-real-length-input') as HTMLInputElement | null;
      if (!input) {
        return;
      }

      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
      input.select();
    }, 50);
  };

  const handleCanvasPointClick = (point: Point, drawSize?: { width: number; height: number }, toolOverride?: ToolMode) => {
    if (activeTool === 'scale') {
      if (scalePoints.length < 1) {
        setScalePoints([point]);
        setProjectScale({
          pixels: 0,
          realLength: project.scale?.realLength ?? 0,
          unit: project.scale?.unit ?? 'ft',
        });
        return;
      }

      const nextPoints: Point[] = [scalePoints[0], point];
      const nextPixels = getPixelsFromPoints(nextPoints);

      setScalePoints(nextPoints);
      setProjectScale({
        pixels: nextPixels,
        realLength: project.scale?.realLength ?? 0,
        unit: project.scale?.unit ?? 'ft',
      });
      setActiveTool('select');
      focusScaleLengthInput();
      return;
    }

    if (activeTool === 'shoreline') {
      updateProject((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        shorelinePoints: [...prev.shorelinePoints, point],
        shorelineFinished: false,
      }));
      return;
    }

    const placementTools = [
      'floating_dock',
      'stationary_dock',
      'custom_stationary_dock',
      'ramp_with_rails',
      'ramp_without_rails',
      'steps',
      'roof_overlay',
      'boat_lift',
      'boat_port',
      'boathouse',
      'accessory',
      'rip_rap',
      'armour_stone',
      'dimension_line',
      'shape_rectangle',
      'shape_rounded_rectangle',
      'shape_oval',
      'shape_circle',
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
      updateProject((prev) => {
        const placementTool = placementToolCandidate as (typeof placementTools)[number];
        const sameTypeCount = prev.objects.filter((object) => object.type === placementTool).length;

        const objectTypeNameByTool: Record<(typeof placementTools)[number], string> = {
          floating_dock: 'Floating Dock',
          stationary_dock: 'Stationary Dock',
          custom_stationary_dock: 'Custom Stationary Dock',
          ramp_with_rails: 'Ramp With Rails',
          ramp_without_rails: 'Ramp Without Rails',
          steps: 'Steps',
          roof_overlay: 'Roof Overlay',
          boat_lift: 'Boat Lift',
          boat_port: 'Boat Port',
          boathouse: 'Boathouse',
          accessory: 'Accessory',
          rip_rap: 'Rip Rap Zone',
          armour_stone: 'Armour Stone',
          dimension_line: 'Dimension Line',
          shape_rectangle: 'Rectangle',
          shape_rounded_rectangle: 'Rounded Rectangle',
          shape_oval: 'Oval',
          shape_circle: 'Circle',
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
          custom_stationary_dock: { width: 140, height: 64 },
          ramp_with_rails: { width: 100, height: 24 },
          ramp_without_rails: { width: 100, height: 24 },
          steps: { width: 60, height: 40 },
          roof_overlay: { width: 140, height: 80 },
          boat_lift: { width: 80, height: 30 },
          boat_port: { width: 120, height: 54 },
          boathouse: { width: 160, height: 90 },
          accessory: { width: 34, height: 18 },
          rip_rap: { width: 150, height: 80 },
          armour_stone: { width: 150, height: 34 },
          dimension_line: { width: 160, height: 24 },
          shape_rectangle: { width: 100, height: 60 },
          shape_rounded_rectangle: { width: 100, height: 60 },
          shape_oval: { width: 100, height: 60 },
          shape_circle: { width: 70, height: 70 },
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
          custom_stationary_dock: '#8f9779',
          ramp_with_rails: '#c2a878',
          ramp_without_rails: '#c2a878',
          steps: '#9a6b3f',
          roof_overlay: '#64748b',
          boat_lift: '#cbd5e1',
          boat_port: '#bfdbfe',
          boathouse: '#d6d3c8',
          accessory: '#94a3b8',
          rip_rap: '#9ca3af',
          armour_stone: '#78716c',
          dimension_line: '#0f172a',
          shape_rectangle: '#dbeafe',
          shape_rounded_rectangle: '#dbeafe',
          shape_oval: '#dcfce7',
          shape_circle: '#dcfce7',
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
          metadata:
            placementTool === 'boat_port'
              ? {
                  boatPortWallHeightFt: 7,
                  boatPortRoofRiseFt: 1.4,
                  boatPortRoofType: 'pitched',
                  boatPortPostSideInsetFt: 0,
                  boatPortPostEndInsetFt: 0,
                }
              : placementTool === 'custom_stationary_dock'
                ? {
                    boardDirection: 'none',
                    customPoints: [
                      { x: 0, y: 0 },
                      { x: drawSize?.width ?? objectSizeByTool[placementTool].width, y: 0 },
                      {
                        x: drawSize?.width ?? objectSizeByTool[placementTool].width,
                        y: drawSize?.height ?? objectSizeByTool[placementTool].height,
                      },
                      { x: 0, y: drawSize?.height ?? objectSizeByTool[placementTool].height },
                    ],
                  }
              : placementTool === 'boathouse'
                ? {
                    boathouseWallHeightFt: 9,
                    boathouseRoofRiseFt: 3,
                    boathouseRoofType: 'gable',
                    boathouseSlipCount: 1,
                    boathouseDoorStyle: 'open',
                    boathouseWallFinish: 'neutral',
                    boathouseRoofFinish: 'metal',
                  }
                : placementTool === 'accessory'
                  ? {
                      accessoryType: 'cleat',
                      accessoryFinish: 'metal',
                    }
                  : placementTool === 'rip_rap'
                    ? {
                        ripRapStoneSize: '10in-20in',
                        ripRapDepthFt: 1.5,
                        ripRapFilterLayer: true,
                      }
                    : placementTool === 'armour_stone'
                      ? {
                          armourStoneRows: 2,
                          armourStoneWallHeightFt: 3,
                        }
              : undefined,
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

  const handleCanvasScaleDoubleClick = (point: Point) => {
    if (activeTool !== 'scale' || scalePoints.length < 1) {
      return;
    }

    const nextPoints = [scalePoints[0], point];
    const nextPixels = getPixelsFromPoints(nextPoints);

    setScalePoints(nextPoints);
    setProjectScale({
      pixels: nextPixels,
      realLength: project.scale?.realLength ?? 0,
      unit: project.scale?.unit ?? 'ft',
    });
    setActiveTool('select');
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
    setSelectedCustomDockPointIndex(null);
  };

  
  const handleObjectDoubleClick = (objectId: string) => {
    setActiveTool('select');
    setIsShapeSelectorOpen(false);
    setSelectedObjectId(objectId);
    setSelectedCustomDockPointIndex(null);

    window.setTimeout(() => {
      const widthInput = document.getElementById('selected-object-width-input') as HTMLInputElement | null;
      widthInput?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      widthInput?.focus();
      widthInput?.select();
    }, 50);
  };

const handleObjectPositionChange = (objectId: string, point: Point) => {
    setSelectedCustomDockPointIndex(null);
    updateProject((prev) => ({
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
    setSelectedCustomDockPointIndex(null);
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: prev.objects.map((object) =>
        object.id === objectId
          ? (() => {
              const nextWidth = Math.max(MIN_OBJECT_SIZE, size.width);
              const nextHeight = Math.max(MIN_OBJECT_SIZE, size.height);
              const widthScale = object.width > 0 ? nextWidth / object.width : 1;
              const heightScale = object.height > 0 ? nextHeight / object.height : 1;

              return {
                ...object,
                width: nextWidth,
                height: nextHeight,
                metadata:
                  object.type === 'custom_stationary_dock' && object.metadata?.customPoints
                    ? {
                        ...object.metadata,
                        customPoints: object.metadata.customPoints.map((point) => ({
                          x: point.x * widthScale,
                          y: point.y * heightScale,
                        })),
                      }
                    : object.metadata,
              };
            })()
          : object,
      ),
    }));
  };

  const handleObjectRotationChange = (objectId: string, rotation: number) => {
    setSelectedObjectId(objectId);
    updateProject((prev) => ({
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

    updateProject((prev) => {
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

    updateProject((prev) => {
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

    updateProject((prev) => {
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

    updateProject((prev) => ({
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

    updateProject((prev) => ({
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

    updateProject((prev) => ({
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
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return;
    }

    const scaledWidth = getCanvasPixelsFromRealLength(parsedValue, currentScale);

    updateSelectedObject((object) => ({
      ...object,
      width: Math.max(MIN_OBJECT_SIZE, scaledWidth ?? parsedValue),
    }));
  };

  const handleSelectedObjectHeightChange = (value: string) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return;
    }

    const scaledHeight = getCanvasPixelsFromRealLength(parsedValue, currentScale);

    updateSelectedObject((object) => ({
      ...object,
      height: Math.max(MIN_OBJECT_SIZE, scaledHeight ?? parsedValue),
    }));
  };

  const getSelectedCustomDockPoints = (object: DockObject): Point[] => {
    const points = object.metadata?.customPoints;

    if (object.type !== 'custom_stationary_dock' || !Array.isArray(points) || points.length < 3) {
      return [
        { x: 0, y: 0 },
        { x: object.width, y: 0 },
        { x: object.width, y: object.height },
        { x: 0, y: object.height },
      ];
    }

    return points.map((point) => ({
      x: point.x,
      y: point.y,
    }));
  };

  const handleObjectCustomPointsChange = (objectId: string, points: Point[]) => {
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: prev.objects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              metadata: {
                ...object.metadata,
                customPoints: points,
              },
            }
          : object,
      ),
    }));
  };

  const handleObjectCustomPointSelect = (objectId: string, pointIndex: number) => {
    setSelectedObjectId(objectId);
    setSelectedCustomDockPointIndex(pointIndex);
  };

  const handleAddCustomDockPoint = () => {
    if (!selectedObject || selectedObject.type !== 'custom_stationary_dock') {
      return;
    }

    const points = getSelectedCustomDockPoints(selectedObject);
    const longestEdge = points.reduce(
      (longest, point, index) => {
        const nextPoint = points[(index + 1) % points.length];
        const length = Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y);
        return length > longest.length ? { index, length } : longest;
      },
      { index: 0, length: 0 },
    );
    const edgeStart = points[longestEdge.index];
    const edgeEnd = points[(longestEdge.index + 1) % points.length];
    const insertedPoint = {
      x: (edgeStart.x + edgeEnd.x) / 2,
      y: (edgeStart.y + edgeEnd.y) / 2,
    };
    const insertIndex = longestEdge.index + 1;
    const nextPoints = [...points.slice(0, insertIndex), insertedPoint, ...points.slice(insertIndex)];

    handleObjectCustomPointsChange(selectedObject.id, nextPoints);
    setSelectedCustomDockPointIndex(insertIndex);
  };

  const handleRemoveSelectedCustomDockPoint = () => {
    if (
      !selectedObject ||
      selectedObject.type !== 'custom_stationary_dock' ||
      selectedCustomDockPointIndex === null
    ) {
      return;
    }

    const points = getSelectedCustomDockPoints(selectedObject);
    if (points.length <= 3 || selectedCustomDockPointIndex >= points.length) {
      return;
    }

    handleObjectCustomPointsChange(
      selectedObject.id,
      points.filter((_, index) => index !== selectedCustomDockPointIndex),
    );
    setSelectedCustomDockPointIndex(null);
  };

  const handleResetCustomDockShape = () => {
    if (!selectedObject || selectedObject.type !== 'custom_stationary_dock') {
      return;
    }

    handleObjectCustomPointsChange(selectedObject.id, [
      { x: 0, y: 0 },
      { x: selectedObject.width, y: 0 },
      { x: selectedObject.width, y: selectedObject.height },
      { x: 0, y: selectedObject.height },
    ]);
    setSelectedCustomDockPointIndex(null);
  };

  const restoreSelectedObjectDimensionInput = (axis: 'width' | 'height') => {
    if (!selectedObject) {
      return;
    }

    setSelectedObjectDimensionInputs((current) => ({
      ...current,
      objectId: selectedObject.id,
      [axis]: formatScaledDimensionValue(selectedObject[axis], currentScale),
    }));
  };

  const handleSelectedObjectDimensionInputChange = (axis: 'width' | 'height', value: string) => {
    setSelectedObjectDimensionInputs((current) => ({
      ...current,
      objectId: selectedObject?.id ?? null,
      [axis]: value,
    }));
  };

  const commitSelectedObjectDimensionInput = (axis: 'width' | 'height') => {
    if (!selectedObject) {
      return;
    }

    const value = selectedObjectDimensionInputs.objectId === selectedObject.id
      ? selectedObjectDimensionInputs[axis]
      : formatScaledDimensionValue(selectedObject[axis], currentScale);
    const trimmedValue = value.trim();
    const parsedValue = Number(trimmedValue);

    if (!trimmedValue || !Number.isFinite(parsedValue) || parsedValue <= 0) {
      restoreSelectedObjectDimensionInput(axis);
      return;
    }

    if (axis === 'width') {
      handleSelectedObjectWidthChange(trimmedValue);
    } else {
      handleSelectedObjectHeightChange(trimmedValue);
    }
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
    updateProject((prev) => ({
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

  const handleObjectDimensionOffsetChange = (
    objectId: string,
    dimension: 'width' | 'height',
    offset: Point,
  ) => {
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      objects: prev.objects.map((object) => {
        if (object.id !== objectId) {
          return object;
        }

        if (dimension === 'width') {
          return {
            ...object,
            dimensionWidthOffsetX: Math.abs(offset.x) < 0.5 ? undefined : offset.x,
            dimensionWidthOffsetY: Math.abs(offset.y) < 0.5 ? undefined : offset.y,
          };
        }

        return {
          ...object,
          dimensionHeightOffsetX: Math.abs(offset.x) < 0.5 ? undefined : offset.x,
          dimensionHeightOffsetY: Math.abs(offset.y) < 0.5 ? undefined : offset.y,
        };
      }),
    }));
  };

  const handleResetSelectedObjectLabelPosition = () => {
    updateSelectedObject((object) => ({
      ...object,
      labelOffsetX: undefined,
      labelOffsetY: undefined,
    }));
  };

  const handleResetSelectedObjectDimensionPositions = () => {
    updateSelectedObject((object) => ({
      ...object,
      dimensionWidthOffsetX: undefined,
      dimensionWidthOffsetY: undefined,
      dimensionHeightOffsetX: undefined,
      dimensionHeightOffsetY: undefined,
    }));
  };

  const handleToggleSelectedObjectDimensions = () => {
    updateSelectedObject((object) => ({
      ...object,
      dimensionsHidden: object.dimensionsHidden ? undefined : true,
    }));
  };

  const handleSelectedObjectColorChange = (value: string) => {
    updateSelectedObject((object) => ({
      ...object,
      color: value,
    }));
  };

  const handleSelectedObjectBoardDirectionChange = (value: 'none' | 'horizontal' | 'vertical') => {
    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        boardDirection: value,
      },
    }));
  };

  const handleSelectedFloatingDockStandardCleatsChange = (checked: boolean) => {
    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        showStandardCleats: checked,
      },
    }));
  };

  const handleSelectedDockSideBumperChange = (checked: boolean) => {
    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        showSideBumper: checked,
      },
    }));
  };

  const handleSelectedDockVerticalStavingChange = (checked: boolean) => {
    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        verticalStavingEnabled: checked,
      },
    }));
  };

  const handleSelectedDockVerticalStavingColorChange = (value: string) => {
    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        verticalStavingColor: value,
      },
    }));
  };

  const handleSelectedBoatPortNumberChange = (
    field: 'boatPortWallHeightFt' | 'boatPortRoofRiseFt' | 'boatPortPostSideInsetFt' | 'boatPortPostEndInsetFt',
    value: string,
  ) => {
    const parsedValue = Number(value);
    const allowsZero = field === 'boatPortPostSideInsetFt' || field === 'boatPortPostEndInsetFt';
    if (!Number.isFinite(parsedValue) || parsedValue < 0 || (!allowsZero && parsedValue <= 0)) {
      return;
    }

    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        [field]: parsedValue,
      },
    }));
  };

  const handleSelectedBoatPortRoofTypeChange = (value: 'flat' | 'pitched') => {
    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        boatPortRoofType: value,
      },
    }));
  };

  const handleSelectedBoathouseNumberChange = (
    field: 'boathouseWallHeightFt' | 'boathouseRoofRiseFt',
    value: string,
  ) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return;
    }

    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        [field]: parsedValue,
      },
    }));
  };

  const handleSelectedBoathouseOptionChange = (
    field: 'boathouseRoofType' | 'boathouseDoorStyle' | 'boathouseWallFinish' | 'boathouseRoofFinish',
    value: string,
  ) => {
    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        [field]: value,
      },
    }));
  };

  const handleSelectedBoathouseSlipCountChange = (value: 1 | 2) => {
    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        boathouseSlipCount: value,
      },
    }));
  };

  const handleSelectedAccessoryOptionChange = (field: 'accessoryType' | 'accessoryFinish', value: string) => {
    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        [field]: value,
      },
      label:
        field === 'accessoryType'
          ? `${value
              .split('_')
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(' ')} Accessory`
          : object.label,
    }));
  };

  const handleSelectedRipRapOptionChange = (field: 'ripRapStoneSize' | 'ripRapFilterLayer', value: string | boolean) => {
    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        [field]: value,
      },
    }));
  };

  const handleSelectedSiteElementNumberChange = (
    field: 'ripRapDepthFt' | 'armourStoneRows' | 'armourStoneWallHeightFt',
    value: string,
  ) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return;
    }

    updateSelectedObject((object) => ({
      ...object,
      metadata: {
        ...object.metadata,
        [field]: field === 'armourStoneRows' ? Math.max(1, Math.round(parsedValue)) : parsedValue,
      },
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

    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      setActiveTool('select');
    }
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
    updateProject((prev) => ({
      ...prev,
      shorelineFinished: true,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleClearShoreline = () => {
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      shorelinePoints: [],
      shorelineFinished: false,
      shorelineLabelHidden: undefined,
      shorelineLabelOffsetX: undefined,
      shorelineLabelOffsetY: undefined,
    }));
  };

  const handleShorelineLabelOffsetChange = (offset: Point) => {
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      shorelineLabelOffsetX: Math.abs(offset.x) < 0.5 ? undefined : offset.x,
      shorelineLabelOffsetY: Math.abs(offset.y) < 0.5 ? undefined : offset.y,
    }));
  };

  const handleToggleShorelineLabel = () => {
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      shorelineLabelHidden: prev.shorelineLabelHidden ? undefined : true,
    }));
  };

  const handleResetShorelineLabelPosition = () => {
    updateProject((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      shorelineLabelOffsetX: undefined,
      shorelineLabelOffsetY: undefined,
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

      updateProject((prev) => {
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

    updateProject((prev) => {
      queueSiteImagePathForDeletion(prev.backgroundImagePath);

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        backgroundImageUrl: undefined,
        backgroundImagePath: undefined,
      };
    });
  };

  const saveCurrentProject = async (options: { isAutosave?: boolean } = {}) => {
    if (!userId) {
      if (!options.isAutosave) {
        setSaveMessage('Save failed: You must be logged in.');
      }
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
    setSaveMessage(options.isAutosave ? 'Autosaving...' : null);

    try {
      await saveProject(userId, projectToSave);
      await deleteQueuedSiteImages();
      lastSavedSnapshotRef.current = JSON.stringify(projectToSave);
      setIsDirty(false);
      setLastSavedAt(projectToSave.updatedAt);
      setSaveMessage(null);
    } catch (error) {
      console.error('Failed to save project', error);
      setSaveMessage(options.isAutosave ? 'Autosave failed' : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProject = async () => {
    await saveCurrentProject();
  };

  useEffect(() => {
    if (!hasInitializedProject || !isDirty || isSaving || !userId) {
      return;
    }

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void saveCurrentProject({ isAutosave: true });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [hasInitializedProject, isDirty, isSaving, project, projectName, currentScale, userId]);

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

    const buildPlanBounds = getBuildPlanContentBounds(project, scalePoints);
    const imageDataUrl = await (editorCanvasRef.current?.exportAsImage(2, { bounds: buildPlanBounds }) ?? Promise.resolve(null));

    setSelectedObjectId(previousSelectedObjectId);

    if (!imageDataUrl) {
      setSaveMessage('Export failed');
      return;
    }

    const drawingInfo = resolveDrawingInfo(project);
    const drawingDate = drawingInfo.date
      ? new Date(`${drawingInfo.date}T00:00:00`).toLocaleDateString()
      : new Date().toLocaleDateString();

    const titleBlockScaleLabel =
      currentScale.realLength > 0 && currentScale.pixels > 0
        ? `${currentScale.pixels.toFixed(0)} px = ${currentScale.realLength} ${currentScale.unit}`
        : 'Not to\nScale';

    const composedBuildPlanImageDataUrl = await composeBuildPlanSheetImage({
      buildPlanImageDataUrl: imageDataUrl,
      drawingInfo,
      drawingDate,
      scaleLabel: titleBlockScaleLabel,
      projectName,
    });

    if (!composedBuildPlanImageDataUrl) {
      setSaveMessage('Export failed');
      return;
    }

    const titleBlockPosition = project.exportSettings?.titleBlockPosition ?? 'bottom-right';
    const titleBlockOffsetX = project.exportSettings?.titleBlockOffsetX ?? 0;
    const titleBlockOffsetY = project.exportSettings?.titleBlockOffsetY ?? 0;
    const titleBlockHorizontalEdge = titleBlockPosition.endsWith('right') ? 'right' : 'left';
    const titleBlockVerticalEdge = titleBlockPosition.startsWith('bottom') ? 'bottom' : 'top';
    const titleBlockOffsetStyle = `${titleBlockHorizontalEdge}: calc(0.35in + ${titleBlockOffsetX}px); ${titleBlockVerticalEdge}: calc(0.35in + ${titleBlockOffsetY}px);`;

    let sectionViewImageDataUrl: string | null = null;
    let sectionViewTitleBlockHtml = '';

    if (includeSectionViewInPdf) {
      const sectionView = project.sectionView ?? getDefaultSectionView();
      const sectionTitleBlock = sectionView.titleBlock;
      sectionViewImageDataUrl = await captureSectionViewForPdf(sectionView, projectName, drawingInfo);
      sectionViewTitleBlockHtml =
        titleBlockPosition === 'hidden'
          ? ''
          : `
      <div class="title-block title-block-${titleBlockPosition}" style="${titleBlockOffsetStyle}">
        <table>
          <colgroup>
            <col style="width: 42%;" />
            <col style="width: 40%;" />
            <col style="width: 18%;" />
          </colgroup>
          <tr class="info-row">
            <td><div class="title-field"><span class="title-label">Date:</span><span class="title-value">${escapeHtml(sectionTitleBlock?.date || drawingDate)}</span></div></td>
            <td colspan="2"><div class="title-field"><span class="title-label">Client:</span><span class="title-value">${escapeHtml(sectionTitleBlock?.client || drawingInfo.client || projectName)}</span></div></td>
          </tr>
          <tr class="scale-row">
            <td class="scale-note">Not to<br />Scale</td>
            <td colspan="2"><div class="title-field"><span class="title-label">Location:</span><span class="title-value">${escapeHtml(sectionTitleBlock?.location || drawingInfo.location || '')}</span></div></td>
          </tr>
          <tr class="info-row">
            <td rowspan="2" class="logo-cell">
              <div class="title-logo" aria-label="Kehoe Marine Construction">
                <span class="title-logo-mark">Kehoe</span>
                <span class="title-logo-text">Marine<br />Construction</span>
              </div>
            </td>
            <td colspan="2"><div class="title-field"><span class="title-label">Description:</span><span class="title-value">${escapeHtml(sectionTitleBlock?.description || drawingInfo.description || sectionView.title || project.name)}</span></div></td>
          </tr>
          <tr class="drawing-row">
            <td><div class="title-field"><span class="title-label">Drawing #:</span><span class="title-value">${escapeHtml(sectionTitleBlock?.drawingNumber || drawingInfo.drawingNumber || 'SV-1')}</span></div></td>
            <td class="small-cell"><div class="title-field"><span class="title-label">Rev:</span><span class="title-value">${escapeHtml(sectionTitleBlock?.revision || drawingInfo.revision || '0')}</span></div></td>
          </tr>
          <tr>
            <td><div class="title-field"><span class="title-label">Completed By:</span><span class="title-value">${escapeHtml(sectionTitleBlock?.completedBy || drawingInfo.completedBy || '')}</span></div></td>
            <td colspan="2"></td>
          </tr>
        </table>
      </div>
    `;
    }

    const printed = printImageInHiddenFrame({
      imageDataUrl: composedBuildPlanImageDataUrl,
      sectionViewImageDataUrl,
      sectionViewTitleBlockHtml,
      projectName: escapeHtml(projectName),
    });

    if (!printed) {
      setSaveMessage('Export failed');
    }
  };

  return (
    <AppShell className="h-screen overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
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
          <div className="flex min-w-[320px] flex-1 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsToolsPanelVisible((previous) => !previous)}
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              aria-pressed={!isToolsPanelVisible}
            >
              {isToolsPanelVisible ? 'Hide Tools' : 'Show Tools'}
            </button>
            <button
              type="button"
              onClick={() => setIsDetailsPanelVisible((previous) => !previous)}
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              aria-pressed={!isDetailsPanelVisible}
            >
              {isDetailsPanelVisible ? 'Hide Details' : 'Show Details'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isFocusModeEnabled) {
                  setIsToolsPanelVisible(true);
                  setIsDetailsPanelVisible(true);
                  return;
                }

                setIsToolsPanelVisible(false);
                setIsDetailsPanelVisible(false);
              }}
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              aria-pressed={isFocusModeEnabled}
            >
              {isFocusModeEnabled ? 'Exit Focus' : 'Focus Mode'}
            </button>
            <button
              type="button"
              onClick={handleSaveProject}
              disabled={isSaving || !isDirty || !userId}
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              Export PDF
            </button>
            <label className="flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeSectionViewInPdf}
                onChange={(event) => setIncludeSectionViewInPdf(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
              />
              Include Section View
            </label>
            <Link
              to={`/render3d/${projectId ?? project.id}`}
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              View 3D
            </Link>
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!canZoomOut}
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              -
            </button>
            <button className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
              {(zoom * 100).toFixed(0)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!canZoomIn}
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              +
            </button>
            <Link
              to="/projects"
              onClick={handleBackToProjectsClick}
              className="min-h-11 rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
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

        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-2">
          {[
            { label: 'Build Plan', value: 'build' },
            { label: 'Section View', value: 'section' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActivePlannerView(tab.value as PlannerView)}
              className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium ${
                activePlannerView === tab.value
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activePlannerView === 'build' ? (
        <main
          className="grid h-full min-h-0 w-full min-w-0 overflow-hidden"
          style={{ gridTemplateColumns: editorGridTemplateColumns }}
        >
          {isToolsPanelVisible && (
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
          )}

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
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoHistoryDepth === 0}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Undo
                </button>
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
              shorelineFinished={project.shorelineFinished}
              shorelineLabelHidden={project.shorelineLabelHidden}
              shorelineLabelOffsetX={project.shorelineLabelOffsetX}
              shorelineLabelOffsetY={project.shorelineLabelOffsetY}
              objects={sortedObjects}
              selectedObjectId={selectedObjectId}
              selectedCustomDockPointIndex={selectedCustomDockPointIndex}
              isLabelMoveModeEnabled={isLabelMoveModeEnabled}
              backgroundImageUrl={project.backgroundImageUrl}
              onCanvasPointClick={handleCanvasPointClick}
              onCanvasScaleDoubleClick={handleCanvasScaleDoubleClick}
              onCanvasObjectDraw={handleCanvasObjectDraw}
              onCanvasToolDrop={handleCanvasToolDrop}
              onObjectClick={handleObjectClick}
              onObjectDoubleClick={handleObjectDoubleClick}
              onObjectPositionChange={handleObjectPositionChange}
              onObjectSizeChange={handleObjectSizeChange}
              onObjectRotationChange={handleObjectRotationChange}
              onObjectCustomPointsChange={handleObjectCustomPointsChange}
              onObjectCustomPointSelect={handleObjectCustomPointSelect}
              onObjectLabelOffsetChange={handleObjectLabelOffsetChange}
              onShorelineLabelOffsetChange={handleShorelineLabelOffsetChange}
              onObjectDimensionOffsetChange={handleObjectDimensionOffsetChange}
              currentScale={currentScale}
              showScaleReference={project.exportSettings?.showScaleReference ?? true}
              isSnapToGridEnabled={isSnapToGridEnabled}
              labelFontSizePx={buildPlanDisplaySettings.labelFontSizePx}
              dimensionFontSizePx={buildPlanDisplaySettings.dimensionFontSizePx}
              zoom={zoom}
              onZoomChange={setZoom}
            />
          </section>

          {isDetailsPanelVisible && (
          <aside className="min-w-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Properties</p>

            <div className="mt-3 space-y-3 pb-6">
              <details className="rounded-md border border-slate-200 bg-white">
                <summary className="flex cursor-pointer select-none items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  <span>Drawing / Permit Info</span>
                  <span className="text-xs text-slate-400">open/close</span>
                </summary>
                <div className="border-t border-slate-100 p-3">
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

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Date
                    </span>
                    <input
                      type="date"
                      value={drawingInfo.date ?? ''}
                      onChange={(event) => handleProjectInfoChange('drawingDate', event.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Completed By
                    </span>
                    <input
                      type="text"
                      value={drawingInfo.completedBy ?? ''}
                      onChange={(event) => handleProjectInfoChange('completedBy', event.target.value)}
                      placeholder="AH"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Client
                  </span>
                  <input
                    type="text"
                    value={drawingInfo.client ?? ''}
                    onChange={(event) => handleProjectInfoChange('clientName', event.target.value)}
                    placeholder="Client name"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  />
                </label>

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Location
                  </span>
                  <input
                    type="text"
                    value={drawingInfo.location ?? ''}
                    onChange={(event) => handleProjectInfoChange('projectLocation', event.target.value)}
                    placeholder="Project address"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  />
                </label>

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Description
                  </span>
                  <input
                    type="text"
                    value={drawingInfo.description ?? ''}
                    onChange={(event) => handleProjectInfoChange('description', event.target.value)}
                    placeholder="Plan description"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  />
                </label>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Drawing #
                    </span>
                    <input
                      type="text"
                      value={drawingInfo.drawingNumber ?? ''}
                      onChange={(event) => handleProjectInfoChange('drawingNumber', event.target.value)}
                      placeholder="1"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Rev
                    </span>
                    <input
                      type="text"
                      value={drawingInfo.revision ?? ''}
                      onChange={(event) => handleProjectInfoChange('revision', event.target.value)}
                      placeholder="0"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                </div>

                <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Title Block Position
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { label: 'Bottom Right', value: 'bottom-right' },
                      { label: 'Bottom Left', value: 'bottom-left' },
                      { label: 'Top Right', value: 'top-right' },
                      { label: 'Top Left', value: 'top-left' },
                      { label: 'Hide', value: 'hidden' },
                    ].map((option) => {
                      const activePosition = project.exportSettings?.titleBlockPosition ?? 'bottom-right';
                      const isActive = activePosition === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            handleTitleBlockPositionChange(
                              option.value as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'hidden',
                            )
                          }
                          className={`rounded-md border px-2 py-2 text-xs font-medium ${
                            isActive
                              ? 'border-brand-600 bg-brand-50 text-brand-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Title Block Offset
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Positive values move the title block inward from the selected edge.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        X Offset
                      </span>
                      <input
                        type="number"
                        step={5}
                        value={project.exportSettings?.titleBlockOffsetX ?? 0}
                        onChange={(event) => handleTitleBlockOffsetChange('x', event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Y Offset
                      </span>
                      <input
                        type="number"
                        step={5}
                        value={project.exportSettings?.titleBlockOffsetY ?? 0}
                        onChange={(event) => handleTitleBlockOffsetChange('y', event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetTitleBlockOffset}
                    className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Reset Title Block Offset
                  </button>
                </div>

              
                </div>
              </details>

              <details className="rounded-md border border-slate-200 bg-white" open>
                <summary className="flex cursor-pointer select-none items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  <span>Build Plan Display</span>
                  <span className="text-xs text-slate-400">open/close</span>
                </summary>
                <div className="space-y-4 border-t border-slate-100 p-3">
                  <label className="block">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Label font size
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {buildPlanDisplaySettings.labelFontSizePx} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={MIN_BUILD_PLAN_FONT_SIZE}
                      max={MAX_BUILD_PLAN_FONT_SIZE}
                      step={1}
                      value={buildPlanDisplaySettings.labelFontSizePx}
                      onChange={(event) => handleBuildPlanDisplayFontSizeChange('labelFontSizePx', event.target.value)}
                      className="w-full accent-brand-600"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Dimension font size
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {buildPlanDisplaySettings.dimensionFontSizePx} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={MIN_BUILD_PLAN_FONT_SIZE}
                      max={MAX_BUILD_PLAN_FONT_SIZE}
                      step={1}
                      value={buildPlanDisplaySettings.dimensionFontSizePx}
                      onChange={(event) => handleBuildPlanDisplayFontSizeChange('dimensionFontSizePx', event.target.value)}
                      className="w-full accent-brand-600"
                    />
                  </label>
                </div>
              </details>

              <details className="rounded-md border border-slate-200 bg-white">
                <summary className="flex cursor-pointer select-none items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  <span>General Site Settings</span>
                  <span className="text-xs text-slate-400">open/close</span>
                </summary>
                <div className="space-y-3 border-t border-slate-100 p-3">
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
                </div>
              </details>

              

              

              <details className="rounded-md border border-slate-200 bg-white" open={Boolean(selectedObject)}>
                <summary className="flex cursor-pointer select-none items-center justify-between rounded-md px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  <span>Selected Element</span>
                  <span className="text-xs text-slate-400">open/close</span>
                </summary>
                <div className="border-t border-slate-100 p-3">
                
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
                          Turn on label move mode when you want to drag the label instead of the object.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsLabelMoveModeEnabled((previous) => !previous)}
                          className={`mt-3 w-full rounded-md border px-3 py-2 text-xs font-medium ${
                            isLabelMoveModeEnabled
                              ? 'border-brand-600 bg-brand-50 text-brand-700'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isLabelMoveModeEnabled ? 'Done Moving Label' : 'Move Label'}
                        </button>
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

                        <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Label Rotation
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Current label rotation: {selectedObject.labelRotation ?? 0} deg
                          </p>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {[
                              { label: '0 deg', value: 0 },
                              { label: '90 deg', value: 90 },
                              { label: '-90 deg', value: -90 },
                            ].map((option) => {
                              const activeRotation = selectedObject.labelRotation ?? 0;
                              const isActive = activeRotation === option.value;

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    const nextRotation = option.value as 0 | 90 | -90;
                                    updateProject((prev) => ({
                                      ...prev,
                                      updatedAt: new Date().toISOString(),
                                      objects: prev.objects.map((object) =>
                                        object.id === selectedObject.id
                                          ? {
                                              ...object,
                                              labelRotation: nextRotation === 0 ? undefined : nextRotation,
                                            }
                                          : object,
                                      ),
                                    }));
                                  }}
                                  className={`rounded-md border px-2 py-2 text-xs font-medium ${
                                    isActive
                                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
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

                        {canUseBoardTextureControls(selectedObject) && (
                          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Board Direction
                            </p>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {[
                                { label: 'None', value: 'none' },
                                { label: 'Across', value: 'horizontal' },
                                { label: 'Length', value: 'vertical' },
                              ].map((option) => {
                                const activeValue = selectedObject.metadata?.boardDirection ?? 'none';
                                const isActive = activeValue === option.value;

                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                      handleSelectedObjectBoardDirectionChange(
                                        option.value as 'none' | 'horizontal' | 'vertical',
                                      )
                                    }
                                    className={`rounded-md border px-2 py-2 text-xs font-medium ${
                                      isActive
                                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {selectedObject.type === 'custom_stationary_dock' && (
                          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Custom Dock Shape
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              Drag blue corner points on the canvas to shape the dock.
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-2">
                              <button
                                type="button"
                                onClick={handleAddCustomDockPoint}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                              >
                                Add Point
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveSelectedCustomDockPoint}
                                disabled={selectedCustomDockPointIndex === null || getSelectedCustomDockPoints(selectedObject).length <= 3}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                Remove Selected Point
                              </button>
                              <button
                                type="button"
                                onClick={handleResetCustomDockShape}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                              >
                                Reset Shape
                              </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              {selectedCustomDockPointIndex === null
                                ? `${getSelectedCustomDockPoints(selectedObject).length} points. Select a point on the canvas to remove it.`
                                : `Point ${selectedCustomDockPointIndex + 1} selected.`}
                            </p>
                          </div>
                        )}

                        {(selectedObject.type === 'floating_dock' || selectedObject.type === 'stationary_dock') && (
                          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                            <label className="flex items-center justify-between gap-3">
                              <span>
                                <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Vertical Staving
                                </span>
                                <span className="mt-1 block text-xs text-slate-600">
                                  Show vertical side boards along the dock fascia.
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                checked={selectedObject.metadata?.verticalStavingEnabled ?? false}
                                onChange={(event) => handleSelectedDockVerticalStavingChange(event.target.checked)}
                                className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                              />
                            </label>
                            {selectedObject.metadata?.verticalStavingEnabled && (
                              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                <span>
                                  <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Staving Colour
                                  </span>
                                  <span className="mt-1 block text-xs text-slate-600">
                                    Defaults to a dark dock fascia tone.
                                  </span>
                                </span>
                                <input
                                  type="color"
                                  value={selectedObject.metadata?.verticalStavingColor ?? '#3f2f1f'}
                                  onChange={(event) => handleSelectedDockVerticalStavingColorChange(event.target.value)}
                                  className="h-10 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                                  aria-label="Vertical staving colour"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {selectedObject.type === 'floating_dock' && (
                          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                            <label className="flex items-center justify-between gap-3">
                              <span>
                                <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Standard Cleats
                                </span>
                                <span className="mt-1 block text-xs text-slate-600">
                                  Show included floating dock cleats.
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                checked={selectedObject.metadata?.showStandardCleats ?? true}
                                onChange={(event) => handleSelectedFloatingDockStandardCleatsChange(event.target.checked)}
                                className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                              />
                            </label>
                            <label className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                              <span>
                                <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Side Bumper / Rub Rail
                                </span>
                                <span className="mt-1 block text-xs text-slate-600">
                                  Show the horizontal side bumper on the dock fascia.
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                checked={selectedObject.metadata?.showSideBumper ?? true}
                                onChange={(event) => handleSelectedDockSideBumperChange(event.target.checked)}
                                className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                              />
                            </label>
                          </div>
                        )}

                        {selectedObject.type === 'boat_port' && (
                          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Boat Port Structure
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Wall height (ft)
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  step="any"
                                  value={selectedObject.metadata?.boatPortWallHeightFt ?? 7}
                                  onChange={(event) => handleSelectedBoatPortNumberChange('boatPortWallHeightFt', event.target.value)}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Roof rise (ft)
                                </span>
                                <input
                                  type="number"
                                  min={0.25}
                                  step="any"
                                  value={selectedObject.metadata?.boatPortRoofRiseFt ?? 1.4}
                                  onChange={(event) => handleSelectedBoatPortNumberChange('boatPortRoofRiseFt', event.target.value)}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                                />
                              </label>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {[
                                { label: 'Flat', value: 'flat' },
                                { label: 'Pitched', value: 'pitched' },
                              ].map((option) => {
                                const activeValue = selectedObject.metadata?.boatPortRoofType ?? 'pitched';
                                const isActive = activeValue === option.value;

                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelectedBoatPortRoofTypeChange(option.value as 'flat' | 'pitched')}
                                    className={`rounded-md border px-2 py-2 text-xs font-medium ${
                                      isActive
                                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Post side inset (ft)
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={selectedObject.metadata?.boatPortPostSideInsetFt ?? 0}
                                  onChange={(event) => handleSelectedBoatPortNumberChange('boatPortPostSideInsetFt', event.target.value)}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Post end inset (ft)
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={selectedObject.metadata?.boatPortPostEndInsetFt ?? 0}
                                  onChange={(event) => handleSelectedBoatPortNumberChange('boatPortPostEndInsetFt', event.target.value)}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                                />
                              </label>
                            </div>
                          </div>
                        )}

                        {selectedObject.type === 'boathouse' && (
                          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Boathouse Options
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Wall height (ft)
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  step="any"
                                  value={selectedObject.metadata?.boathouseWallHeightFt ?? 9}
                                  onChange={(event) => handleSelectedBoathouseNumberChange('boathouseWallHeightFt', event.target.value)}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Roof rise (ft)
                                </span>
                                <input
                                  type="number"
                                  min={0.25}
                                  step="any"
                                  value={selectedObject.metadata?.boathouseRoofRiseFt ?? 3}
                                  onChange={(event) => handleSelectedBoathouseNumberChange('boathouseRoofRiseFt', event.target.value)}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                                />
                              </label>
                            </div>

                            <div className="mt-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Roof Type</p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {[
                                  { label: 'Flat', value: 'flat' },
                                  { label: 'Gable', value: 'gable' },
                                ].map((option) => {
                                  const activeValue = selectedObject.metadata?.boathouseRoofType ?? 'gable';
                                  const isActive = activeValue === option.value;

                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handleSelectedBoathouseOptionChange('boathouseRoofType', option.value)}
                                      className={`rounded-md border px-2 py-2 text-xs font-medium ${
                                        isActive
                                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Slip Count</p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {[1, 2].map((value) => {
                                  const isActive = (selectedObject.metadata?.boathouseSlipCount ?? 1) === value;

                                  return (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() => handleSelectedBoathouseSlipCountChange(value as 1 | 2)}
                                      className={`rounded-md border px-2 py-2 text-xs font-medium ${
                                        isActive
                                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      {value} Slip{value === 1 ? '' : 's'}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Door Style</p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {[
                                  { label: 'Open', value: 'open' },
                                  { label: 'Single Door', value: 'single_door' },
                                  { label: 'Double Doors', value: 'double_doors' },
                                  { label: 'Two Slip Doors', value: 'two_slip_doors' },
                                  { label: 'None', value: 'none' },
                                ].map((option) => {
                                  const activeValue = selectedObject.metadata?.boathouseDoorStyle ?? 'open';
                                  const isActive = activeValue === option.value;

                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handleSelectedBoathouseOptionChange('boathouseDoorStyle', option.value)}
                                      className={`rounded-md border px-2 py-2 text-xs font-medium ${
                                        isActive
                                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Wall Finish</p>
                                <div className="mt-2 grid gap-2">
                                  {[
                                    { label: 'Neutral', value: 'neutral' },
                                    { label: 'Wood', value: 'wood' },
                                    { label: 'Metal', value: 'metal' },
                                  ].map((option) => {
                                    const activeValue = selectedObject.metadata?.boathouseWallFinish ?? 'neutral';
                                    const isActive = activeValue === option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleSelectedBoathouseOptionChange('boathouseWallFinish', option.value)}
                                        className={`rounded-md border px-2 py-2 text-xs font-medium ${
                                          isActive
                                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Roof Finish</p>
                                <div className="mt-2 grid gap-2">
                                  {[
                                    { label: 'Neutral', value: 'neutral' },
                                    { label: 'Metal', value: 'metal' },
                                    { label: 'Shingle', value: 'shingle' },
                                  ].map((option) => {
                                    const activeValue = selectedObject.metadata?.boathouseRoofFinish ?? 'metal';
                                    const isActive = activeValue === option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleSelectedBoathouseOptionChange('boathouseRoofFinish', option.value)}
                                        className={`rounded-md border px-2 py-2 text-xs font-medium ${
                                          isActive
                                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedObject.type === 'accessory' && (
                          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Accessory Options
                            </p>
                            <div className="mt-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Accessory Type</p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {[
                                  { label: 'Cleat', value: 'cleat' },
                                  { label: 'Bumper', value: 'bumper' },
                                  { label: 'Ladder', value: 'ladder' },
                                  { label: 'Bench', value: 'bench' },
                                  { label: 'Post', value: 'post' },
                                  { label: 'Tie Up Point', value: 'tie_up_point' },
                                ].map((option) => {
                                  const activeValue = selectedObject.metadata?.accessoryType ?? 'cleat';
                                  const isActive = activeValue === option.value;

                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handleSelectedAccessoryOptionChange('accessoryType', option.value)}
                                      className={`rounded-md border px-2 py-2 text-xs font-medium ${
                                        isActive
                                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Finish</p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {[
                                  { label: 'Metal', value: 'metal' },
                                  { label: 'Rubber', value: 'rubber' },
                                  { label: 'Wood', value: 'wood' },
                                  { label: 'Neutral', value: 'neutral' },
                                ].map((option) => {
                                  const activeValue = selectedObject.metadata?.accessoryFinish ?? 'metal';
                                  const isActive = activeValue === option.value;

                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handleSelectedAccessoryOptionChange('accessoryFinish', option.value)}
                                      className={`rounded-md border px-2 py-2 text-xs font-medium ${
                                        isActive
                                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedObject.type === 'rip_rap' && (
                          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Rip Rap Zone
                            </p>
                            <div className="mt-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Stone Size</p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {[
                                  { label: 'Small', value: 'small' },
                                  { label: 'Medium', value: 'medium' },
                                  { label: '10 in to 20 in', value: '10in-20in' },
                                  { label: 'Large', value: 'large' },
                                ].map((option) => {
                                  const activeValue = selectedObject.metadata?.ripRapStoneSize ?? '10in-20in';
                                  const isActive = activeValue === option.value;

                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handleSelectedRipRapOptionChange('ripRapStoneSize', option.value)}
                                      className={`rounded-md border px-2 py-2 text-xs font-medium ${
                                        isActive
                                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Depth (ft)
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={selectedObject.metadata?.ripRapDepthFt ?? 1.5}
                                  onChange={(event) => handleSelectedSiteElementNumberChange('ripRapDepthFt', event.target.value)}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                                />
                              </label>
                              <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Filter Layer
                                </span>
                                <input
                                  type="checkbox"
                                  checked={selectedObject.metadata?.ripRapFilterLayer ?? true}
                                  onChange={(event) => handleSelectedRipRapOptionChange('ripRapFilterLayer', event.target.checked)}
                                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                />
                              </label>
                            </div>
                          </div>
                        )}

                        {selectedObject.type === 'armour_stone' && (
                          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Armour Stone
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Rows
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={selectedObject.metadata?.armourStoneRows ?? 2}
                                  onChange={(event) => handleSelectedSiteElementNumberChange('armourStoneRows', event.target.value)}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Wall Height (ft)
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={selectedObject.metadata?.armourStoneWallHeightFt ?? 3}
                                  onChange={(event) => handleSelectedSiteElementNumberChange('armourStoneWallHeightFt', event.target.value)}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                                />
                              </label>
                            </div>
                          </div>
                        )}
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

                    <div id="selected-object-size-section" className="rounded-md border border-slate-200 bg-slate-50 p-3">
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
                            {getDimensionInputLabel('width', currentScale)}
                          </span>
                          <input
                            id="selected-object-width-input"
                            type="number"
                            min={0}
                            step="any"
                            value={
                              selectedObjectDimensionInputs.objectId === selectedObject.id
                                ? selectedObjectDimensionInputs.width
                                : formatScaledDimensionValue(selectedObject.width, currentScale)
                            }
                            onChange={(event) => handleSelectedObjectDimensionInputChange('width', event.target.value)}
                            onBlur={() => commitSelectedObjectDimensionInput('width')}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                commitSelectedObjectDimensionInput('width');
                                const heightInput = document.getElementById('selected-object-height-input') as HTMLInputElement | null;
                                heightInput?.focus();
                                heightInput?.select();
                              }
                            }}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                          />
                          {canUseProjectScale(currentScale) && (
                            <span className="mt-1 block text-[11px] text-slate-500">
                              {selectedObject.width.toFixed(2)} px
                            </span>
                          )}
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                            {getDimensionInputLabel('height', currentScale)}
                          </span>
                          <input
                            id="selected-object-height-input"
                            type="number"
                            min={0}
                            step="any"
                            value={
                              selectedObjectDimensionInputs.objectId === selectedObject.id
                                ? selectedObjectDimensionInputs.height
                                : formatScaledDimensionValue(selectedObject.height, currentScale)
                            }
                            onChange={(event) => handleSelectedObjectDimensionInputChange('height', event.target.value)}
                            onBlur={() => commitSelectedObjectDimensionInput('height')}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                commitSelectedObjectDimensionInput('height');
                                event.currentTarget.blur();
                              }
                            }}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                          />
                          {canUseProjectScale(currentScale) && (
                            <span className="mt-1 block text-[11px] text-slate-500">
                              {selectedObject.height.toFixed(2)} px
                            </span>
                          )}
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetSelectedObjectDimensionPositions}
                        className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Reset Dimension Indicators
                      </button>
                      {selectedObject.type !== 'dimension_line' && (
                        <button
                          type="button"
                          onClick={handleToggleSelectedObjectDimensions}
                          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          {selectedObject.dimensionsHidden ? 'Show Size Arrows' : 'Hide Size Arrows'}
                        </button>
                      )}

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
              </details>

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
                      id="scale-real-length-input"
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
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={project.exportSettings?.showScaleReference ?? true}
                      onChange={(event) => handleScaleReferenceVisibilityChange(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                    />
                    <span>Show scale reference on drawing</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleClearScale}
                    disabled={!canUseProjectScale(currentScale) && scalePoints.length === 0}
                    className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                  >
                    Remove Scale
                  </button>
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

                                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleFinishShoreline}
                    disabled={project.shorelinePoints.length < 2}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                  <button
                    type="button"
                    onClick={handleToggleShorelineLabel}
                    disabled={project.shorelinePoints.length < 2}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {project.shorelineLabelHidden ? 'Show Label' : 'Hide Label'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetShorelineLabelPosition}
                    disabled={project.shorelinePoints.length < 2}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reset Label
                  </button>
                </div>
                  <button
                    type="button"
                    onClick={() => setIsLabelMoveModeEnabled((previous) => !previous)}
                    disabled={project.shorelinePoints.length < 2 || project.shorelineLabelHidden}
                    className={`rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                      isLabelMoveModeEnabled
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-300 text-slate-700'
                    }`}
                  >
                    {isLabelMoveModeEnabled ? 'Done Moving Label' : 'Move Shoreline Label'}
                  </button>
                <p className="mt-2 text-xs text-slate-500">
                  Use Move Label mode to drag the shoreline label.
                </p>
              </div>
            </div>
          </aside>
          )}
        </main>
        ) : (
          <main className="h-full min-h-0 overflow-hidden bg-slate-50 p-4">
            <SectionViewCanvas
              sectionView={project.sectionView ?? getDefaultSectionView()}
              projectName={projectName}
              drawingInfo={drawingInfo}
              onChange={handleSectionViewChange}
              onGenerateFromBuildPlan={handleGenerateSectionViewFromBuildPlan}
            />
          </main>
        )}
      </div>
    </AppShell>
  );
}
