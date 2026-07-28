import type { ChangeEvent, PointerEvent, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { applySectionTemplate, sectionTemplates } from '@/features/sectionView/sectionTemplates';
import type { DrawingInfo } from '@/types/dock';
import type {
  SectionViewData,
  SectionViewBuildPlanReference,
  SectionViewBuildPlanProjection,
  SectionViewProjectedBuildPlanObject,
  SectionViewCustomItem,
  SectionViewCustomItemType,
  SectionViewManualOffset,
  SectionViewManualTransform,
  SectionViewPoint,
  SectionViewProfileGeometry,
  SectionViewRipRapSettings,
  SectionViewRipRapZone,
  SectionViewTemplateId,
} from '@/features/sectionView/sectionTypes';

interface SectionViewCanvasProps {
  sectionView: SectionViewData;
  projectName: string;
  drawingInfo?: DrawingInfo;
  onChange: (sectionView: SectionViewData) => void;
  onGenerateFromBuildPlan: () => void;
}

const SVG_WIDTH = 1100;
const SVG_HEIGHT = 850;
const ink = '#111827';
const mutedInk = '#475569';
const red = '#dc2626';
const blue = '#0f70b7';
const drawingLeft = 92;
const drawingRight = 1008;
const baseHighWaterY = 365;
const lowWaterOffset = 42;
const defaultRipRapSettings: SectionViewRipRapSettings = {
  x: 104,
  y: 336,
  length: 215,
  depth: 66,
  slopeDegrees: 5,
  stoneSize: 22,
  density: 3,
  showFilterLayer: true,
};

const ripRapStoneSizeOptions = [
  { label: 'Small stone', value: 10 },
  { label: 'Medium stone', value: 16 },
  { label: '10" to 20" rip rap', value: 20 },
  { label: 'Large stone', value: 26 },
];

const ripRapDensityOptions = [
  { label: 'Sparse', value: 0.75 },
  { label: 'Normal', value: 1.4 },
  { label: 'Dense', value: 3 },
  { label: 'Very dense', value: 5 },
];

const editableElementLabels: Record<string, string> = {
  'water-high-label': 'High water label',
  'water-low-label': 'Low water label',
  'grade-profile': 'Existing grade profile',
  'lakebed-profile': 'Lakebed profile',
  'riprap-group': 'Rip rap stone group',
  'armour-group': 'Armour stone group',
  'dock-profile': 'Dock and ramp reference',
  'build-plan-context': 'Build Plan context references',
  'build-plan-projection': 'Build Plan projected section',
  'dimension-bank': 'Bank dimension',
  'dimension-drop': 'Lakebed drop dimension',
  'callout-grade': 'Existing grade callout',
  'callout-lakebed': 'Lakebed profile callout',
  'callout-riprap': 'Rip rap callout',
  'callout-pipe': 'Perforated pipe callout',
  'callout-armour': 'Armour stone callout',
  'callout-clear-stone': 'Clear stone base callout',
  'callout-ramp': 'Access ramp callout',
  'callout-dock': 'Floating dock callout',
  notes: 'Drawing notes',
  'title-block': 'Title block',
};

const defaultElementText: Record<string, string> = {
  'water-high-label': 'HIGH WATER LEVEL',
  'water-low-label': 'LOW WATER LEVEL',
  'dimension-bank': 'BANK HEIGHT',
  'dimension-drop': 'LAKEBED DROP',
  'callout-grade': 'EXISTING GRADE',
  'callout-lakebed': 'LAKEBED PROFILE',
  'callout-riprap': 'RIP RAP STONE',
  'callout-pipe': 'PERFORATED PIPE',
  'callout-armour': 'ARMOUR STONE WALL',
  'callout-clear-stone': 'CLEAR STONE BASE',
  'callout-ramp': 'ACCESS RAMP',
  'callout-dock': 'FLOATING DOCK',
};

const profileLineLabels: Record<keyof SectionViewProfileGeometry, string> = {
  gradePoints: 'Existing grade profile',
  lakebedPoints: 'Lakebed profile',
  ripRapTopPoints: 'Rip rap top boundary',
  ripRapBottomPoints: 'Rip rap bottom boundary',
};

const profileElementIds: Partial<Record<keyof SectionViewProfileGeometry, string>> = {
  gradePoints: 'grade-profile',
  lakebedPoints: 'lakebed-profile',
};

const resizableElementIds = new Set(['armour-group', 'dock-profile', 'dimension-bank', 'dimension-drop']);
const customItemTypes: Array<{ type: SectionViewCustomItemType; label: string }> = [
  { type: 'label', label: 'Add Label' },
  { type: 'arrow', label: 'Add Arrow' },
  { type: 'line', label: 'Add Line' },
  { type: 'rectangle', label: 'Add Rectangle / Block' },
  { type: 'material_area', label: 'Add Material Area' },
];

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function closestOptionValue(options: Array<{ value: number }>, value: number) {
  return options.reduce((closest, option) =>
    Math.abs(option.value - value) < Math.abs(closest.value - value) ? option : closest,
  ).value;
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function toFilename(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section-view';
}

function customItemText(item: SectionViewCustomItem) {
  return item.text ?? item.label ?? '';
}

function defaultCustomItem(type: SectionViewCustomItemType): SectionViewCustomItem {
  const id = `custom-${Date.now().toString(36)}`;
  const base = {
    id,
    type,
    x: 190,
    y: 185,
    rotation: 0,
    strokeColor: type === 'arrow' ? red : ink,
    fillColor: '#ffffff',
  };

  switch (type) {
    case 'arrow':
      return {
        ...base,
        text: 'New callout',
        width: 115,
        height: 60,
        strokeColor: red,
      };
    case 'line':
      return {
        ...base,
        width: 130,
        height: 0,
        strokeColor: ink,
      };
    case 'rectangle':
      return {
        ...base,
        width: 120,
        height: 45,
        strokeColor: ink,
      };
    case 'material_area':
      return {
        ...base,
        text: 'Material area',
        width: 150,
        height: 70,
        strokeColor: ink,
        fillColor: '#f1f5f9',
      };
    case 'label':
    default:
      return {
        ...base,
        text: 'New label',
        width: 120,
        height: 24,
        strokeColor: red,
      };
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDrawingInfoDate(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? value : formatDate(parsedDate);
}

function hashUnit(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function pointsToPolyline(points: SectionViewPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function pointsToPath(points: SectionViewPoint[]) {
  if (points.length === 0) {
    return '';
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function ripRapBoundaryPoints(topPoints: SectionViewPoint[], bottomPoints: SectionViewPoint[]) {
  return [...topPoints, ...bottomPoints.slice().reverse()].map((point) => `${point.x},${point.y}`).join(' ');
}

function pointBounds(points: SectionViewPoint[]) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

function buildRipRapBoundary(settings: SectionViewRipRapSettings) {
  const slopeRise = Math.tan((settings.slopeDegrees * Math.PI) / 180) * settings.length;
  const topPoints = [
    { x: settings.x + 3, y: settings.y + 8 },
    { x: settings.x + settings.length * 0.2, y: settings.y + slopeRise * 0.2 - 2 },
    { x: settings.x + settings.length * 0.48, y: settings.y + slopeRise * 0.48 + 12 },
    { x: settings.x + settings.length * 0.72, y: settings.y + slopeRise * 0.72 + 2 },
    { x: settings.x + settings.length - 12, y: settings.y + slopeRise + 14 },
  ];
  const bottomPoints = [
    { x: settings.x + 10, y: settings.y + settings.depth - 14 },
    { x: settings.x + settings.length * 0.28, y: settings.y + slopeRise * 0.28 + settings.depth + 12 },
    { x: settings.x + settings.length * 0.58, y: settings.y + slopeRise * 0.58 + settings.depth + 2 },
    { x: settings.x + settings.length - 2, y: settings.y + slopeRise + settings.depth - 12 },
  ];

  return { topPoints, bottomPoints };
}

function normalizeRipRapZone(zone: SectionViewRipRapZone): SectionViewRipRapZone {
  const boundary = zone.topPoints.length > 0 && zone.bottomPoints.length > 0
    ? { topPoints: zone.topPoints, bottomPoints: zone.bottomPoints }
    : buildRipRapBoundary(zone);

  return {
    ...zone,
    topPoints: boundary.topPoints,
    bottomPoints: boundary.bottomPoints,
  };
}

function makeRipRapZone(id: string, label: string, settings: SectionViewRipRapSettings, topPoints?: SectionViewPoint[], bottomPoints?: SectionViewPoint[]): SectionViewRipRapZone {
  const boundary = topPoints && bottomPoints ? { topPoints, bottomPoints } : buildRipRapBoundary(settings);
  return {
    ...settings,
    id,
    label,
    topPoints: boundary.topPoints,
    bottomPoints: boundary.bottomPoints,
  };
}

function callout(label: string, labelX: number, labelY: number, targetX: number, targetY: number, key: string) {
  return (
    <g key={key} stroke={red} fill="none" strokeWidth="1.5">
      <line x1={labelX} y1={labelY + 6} x2={targetX} y2={targetY} markerEnd="url(#red-arrow)" />
      <text x={labelX} y={labelY} fill={red} stroke="none" fontSize="13" fontWeight="700">
        {label}
      </text>
    </g>
  );
}

function ripRapStoneField(settings: SectionViewRipRapSettings, topPoints: SectionViewPoint[], bottomPoints: SectionViewPoint[]) {
  const bounds = pointBounds([...topPoints, ...bottomPoints]);
  const fieldWidth = Math.max(settings.stoneSize * 2, bounds.maxX - bounds.minX);
  const fieldHeight = Math.max(settings.stoneSize * 2, bounds.maxY - bounds.minY);
  const baseStoneRadius = clampNumber(settings.stoneSize, 8, 30);
  const density = clampNumber(settings.density, 0.5, 5);
  const spacingMultiplier = density >= 5 ? 0.82 : density >= 3 ? 1.02 : density >= 1.4 ? 1.48 : 2.05;
  const spacing = Math.max(7, baseStoneRadius * spacingMultiplier);
  const columns = Math.max(3, Math.ceil(fieldWidth / spacing) + 1);
  const rows = Math.max(2, Math.ceil(fieldHeight / spacing) + 1);
  const coverage = density >= 5 ? 1 : density >= 3 ? 0.88 : density >= 1.4 ? 0.62 : 0.42;

  const stonePolygon = (key: string, x: number, y: number, radiusBase: number, seed: number) => {
    const stoneRadius = radiusBase * (0.52 + hashUnit(seed + 31) * 0.5);
    const pointCount = 5 + Math.floor(hashUnit(seed + 43) * 3);
    const points = Array.from({ length: pointCount }, (_, pointIndex) => {
      const angle = (Math.PI * 2 * pointIndex) / pointCount;
      const radius = stoneRadius * (0.75 + hashUnit(seed * 11 + pointIndex + 59) * 0.44);
      return `${(x + Math.cos(angle) * radius).toFixed(1)},${(y + Math.sin(angle) * radius).toFixed(1)}`;
    }).join(' ');

    return (
      <polygon
        key={key}
        points={points}
        fill={seed % 3 === 0 ? '#6f8794' : seed % 3 === 1 ? '#8fa0a8' : '#b2bec5'}
        stroke={ink}
        strokeWidth="1.4"
      />
    );
  };

  const stones: ReactNode[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const seed = row * columns + column;
      if (hashUnit(seed + 101) > coverage) {
        continue;
      }

      const jitterX = (hashUnit(seed + 3) - 0.5) * spacing * 0.38;
      const jitterY = (hashUnit(seed + 17) - 0.5) * spacing * 0.38;
      const x = bounds.minX + column * spacing + (row % 2) * spacing * 0.5 + jitterX;
      const y = bounds.minY + row * spacing * 0.86 + jitterY;
      stones.push(stonePolygon(`stone-${seed}`, x, y, baseStoneRadius, seed));

      if (density >= 3 && hashUnit(seed + 211) < (density >= 5 ? 0.8 : 0.38)) {
        const fillerX = x + spacing * (0.35 + hashUnit(seed + 307) * 0.35);
        const fillerY = y + spacing * (0.24 + hashUnit(seed + 401) * 0.3);
        stones.push(stonePolygon(`filler-${seed}`, fillerX, fillerY, baseStoneRadius * 0.62, seed + 5000));
      }
    }
  }

  return stones;
}

function titleBlock(
  projectName: string,
  title: string,
  drawingDate: string,
  titleBlock: SectionViewData['titleBlock'],
  drawingInfo?: DrawingInfo,
) {
  const width = 390;
  const x = 1058 - width;
  const y = 724;
  const height = 84;
  const colOneWidth = 164;
  const colTwoWidth = 156;
  const rowOneHeight = 17;
  const rowTwoHeight = 15;
  const rowThreeHeight = 18;
  const rowFourHeight = 15;
  const colOneX = x + colOneWidth;
  const colTwoX = colOneX + colTwoWidth;
  const rowOneY = y + rowOneHeight;
  const rowTwoY = rowOneY + rowTwoHeight;
  const rowThreeY = rowTwoY + rowThreeHeight;
  const rowFourY = rowThreeY + rowFourHeight;
  const valueOrFallback = (value: string | undefined, fallback: string) => value || fallback;
  const truncated = (value: string, maxLength = 28) => (value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value);
  const fieldText = (label: string, value: string, tx: number, ty: number, maxLength = 30) => (
    <text x={tx} y={ty} fill={ink} fontSize="8">
      <tspan fill={ink} fontSize="8" fontWeight="400">
        {label}:
      </tspan>{' '}
      <tspan fontWeight="600">{truncated(value, maxLength)}</tspan>
    </text>
  );

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#ffffff" stroke={ink} strokeWidth="1.2" />
      {[rowOneY, rowTwoY, rowThreeY, rowFourY].map((lineY) => (
        <line key={lineY} x1={x} y1={lineY} x2={x + width} y2={lineY} stroke={ink} strokeWidth="0.9" />
      ))}
      <line x1={colOneX} y1={y} x2={colOneX} y2={y + height} stroke={ink} strokeWidth="0.9" />
      <line x1={colTwoX} y1={rowThreeY} x2={colTwoX} y2={rowFourY} stroke={ink} strokeWidth="0.9" />
      <text x={x + 33} y={rowTwoY + 11} fill={ink} fontSize="10" fontWeight="800">
        Not to
      </text>
      <text x={x + 37} y={rowTwoY + 24} fill={ink} fontSize="10" fontWeight="800">
        Scale
      </text>
      <rect x={x + 64} y={rowTwoY + 5} width="68" height="24" fill="#cf2e2e" stroke="none" />
      <text x={x + 75} y={rowTwoY + 21} fill="#ffffff" fontSize="14" fontStyle="italic" fontWeight="800">
        Kehoe
      </text>
      <text x={x + 136} y={rowTwoY + 15} fill={mutedInk} fontSize="7" fontWeight="700">
        MARINE
      </text>
      <text x={x + 136} y={rowTwoY + 24} fill={mutedInk} fontSize="7" fontWeight="700">
        CONSTRUCTION
      </text>
      {fieldText('Date', formatDrawingInfoDate(titleBlock?.date || drawingInfo?.date, drawingDate), x + 4, y + 11, 18)}
      {fieldText('Client', valueOrFallback(titleBlock?.client || drawingInfo?.client, projectName || 'Kehoe Dock Planner'), colOneX + 4, y + 11, 25)}
      {fieldText('Location', valueOrFallback(titleBlock?.location || drawingInfo?.location, 'Site visit / permit support'), colOneX + 4, rowOneY + 10, 25)}
      {fieldText('Description', valueOrFallback(titleBlock?.description || drawingInfo?.description, title), colOneX + 4, rowTwoY + 12, 29)}
      {fieldText('Drawing #', valueOrFallback(titleBlock?.drawingNumber || drawingInfo?.drawingNumber, 'SV-1'), colOneX + 4, rowThreeY + 10, 19)}
      {fieldText('Rev', valueOrFallback(titleBlock?.revision || drawingInfo?.revision, 'A'), colTwoX + 4, rowThreeY + 10, 8)}
      {fieldText('Completed By', valueOrFallback(titleBlock?.completedBy || drawingInfo?.completedBy, 'Kehoe Marine'), x + 4, rowFourY + 10, 24)}
    </g>
  );
}

function renderCustomItem(item: SectionViewCustomItem) {
  if (item.hidden) {
    return null;
  }

  const strokeColor = item.strokeColor ?? (item.type === 'arrow' ? red : ink);
  const fillColor = item.fillColor ?? (item.type === 'material_area' ? '#f1f5f9' : '#ffffff');
  const width = item.width ?? 120;
  const height = item.height ?? (item.type === 'label' ? 24 : 45);
  const text = customItemText(item);
  const rotation = item.rotation ?? 0;
  const transform = rotation ? `rotate(${rotation} ${item.x} ${item.y})` : undefined;

  switch (item.type) {
    case 'arrow':
      return (
        <g transform={transform}>
          <line
            x1={item.x}
            y1={item.y}
            x2={item.x + width}
            y2={item.y + height}
            stroke={strokeColor}
            strokeWidth="1.2"
            markerEnd="url(#red-arrow)"
          />
          {text && (
            <text x={item.x} y={item.y - 8} fill={strokeColor} fontSize="12" fontWeight="700">
              {text}
            </text>
          )}
        </g>
      );
    case 'line':
      return (
        <line
          x1={item.x}
          y1={item.y}
          x2={item.x + width}
          y2={item.y + height}
          stroke={strokeColor}
          strokeWidth="1.4"
          transform={transform}
        />
      );
    case 'rectangle':
      return (
        <rect
          x={item.x}
          y={item.y}
          width={width}
          height={Math.max(8, height)}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1.2"
          transform={transform}
        />
      );
    case 'material_area':
      return (
        <g transform={transform}>
          <rect
            x={item.x}
            y={item.y}
            width={width}
            height={Math.max(12, height)}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeDasharray="6 4"
          />
          <path
            d={`M ${item.x + 12} ${item.y + height - 12} L ${item.x + width * 0.35} ${item.y + 12} L ${item.x + width * 0.66} ${item.y + height - 14} L ${item.x + width - 12} ${item.y + 16}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity="0.55"
          />
          {text && (
            <text x={item.x + 8} y={item.y + Math.max(22, height / 2)} fill={strokeColor} fontSize="11" fontWeight="700">
              {text}
            </text>
          )}
        </g>
      );
    case 'label':
    default:
      return (
        <text x={item.x} y={item.y} fill={strokeColor} fontSize="13" fontWeight="700" transform={transform}>
          {text || 'Custom label'}
        </text>
      );
  }
}

function feetLabel(value: number | undefined, fallback: string) {
  return Number.isFinite(value) && value !== undefined ? `${Math.round(value)}'` : fallback;
}

function dimensionLabel(lengthFt: number | undefined, widthFt: number | undefined, fallback: string) {
  if (Number.isFinite(lengthFt) && Number.isFinite(widthFt) && lengthFt !== undefined && widthFt !== undefined) {
    return `${Math.round(lengthFt)}' x ${Math.round(widthFt)}'`;
  }

  return fallback;
}

function dockRampProfile(highWaterY: number, reference: SectionViewData['dockRampReference'], dockLabel: string, rampLabel: string) {
  const dockLengthPx = Math.max(180, Math.min(370, (reference?.dockLengthFt ?? 40) * 6.6));
  const rampLengthPx = Math.max(80, Math.min(150, (reference?.rampLengthFt ?? 12) * 6.2));
  const dockX = 348;
  const dockY = highWaterY - 32;
  const dockHeight = 27;
  const rampStartX = dockX - rampLengthPx + 8;
  const rampTopY = dockY + 1;
  const rampBankY = dockY - 7;
  const dockRightX = dockX + dockLengthPx;
  const hasRails = reference?.rampType === 'with_rails';

  return (
    <g stroke={ink} fill="none">
      <rect x={rampStartX - 24} y={dockY - 95} width={dockLengthPx + rampLengthPx + 78} height="150" fill="#ffffff" opacity="0.01" stroke="none" />
      <rect x={rampStartX} y={rampBankY - 7} width={rampLengthPx} height="11" fill="#eef6fb" strokeWidth="1.4" />
      {hasRails && (
        <>
          <line x1={rampStartX + 4} y1={rampBankY - 19} x2={dockX - 8} y2={rampTopY - 18} strokeWidth="1" />
          <line x1={rampStartX + 12} y1={rampBankY - 19} x2={rampStartX + 12} y2={rampBankY - 7} strokeWidth="0.9" />
          <line x1={dockX - 18} y1={rampTopY - 18} x2={dockX - 18} y2={rampTopY - 7} strokeWidth="0.9" />
        </>
      )}
      <rect x={dockX} y={dockY} width={dockLengthPx} height={dockHeight} fill="#f7fbfd" strokeWidth="1.5" />
      {Array.from({ length: Math.max(12, Math.floor(dockLengthPx / 7)) }, (_, index) => (
        <line key={index} x1={dockX + 5 + index * 7} y1={dockY + 2} x2={dockX + 5 + index * 7} y2={dockY + dockHeight - 2} stroke="#9a4f25" strokeWidth="1" />
      ))}
      <line x1={dockX + 12} y1={dockY + dockHeight + 7} x2={dockRightX - 12} y2={dockY + dockHeight + 7} strokeWidth="0.9" />
      <path d={`M ${dockX + 12} ${dockY + dockHeight} q 0 18 5 18 L ${dockRightX - 15} ${dockY + dockHeight + 18} q 5 0 5 -18`} strokeWidth="1" />
      <line x1={dockX} y1={dockY - 18} x2={dockRightX} y2={dockY - 18} markerStart="url(#red-arrow)" markerEnd="url(#red-arrow)" stroke={red} strokeWidth="1.2" />
      <line x1={dockX} y1={dockY - 22} x2={dockX} y2={dockY - 5} stroke={red} strokeWidth="0.8" />
      <line x1={dockRightX} y1={dockY - 22} x2={dockRightX} y2={dockY - 5} stroke={red} strokeWidth="0.8" />
      <text x={dockX + dockLengthPx / 2 - 16} y={dockY - 26} fill={ink} stroke="none" fontSize="13">
        {feetLabel(reference?.dockLengthFt, 'DOCK LENGTH')}
      </text>
      <text x={dockX + 10} y={dockY + dockHeight + 34} fill={ink} stroke="none" fontSize="11">
        {dockLabel}
      </text>
      <line x1={rampStartX + rampLengthPx * 0.5} y1={dockY - 82} x2={rampStartX + rampLengthPx * 0.5} y2={rampBankY - 12} stroke={red} strokeWidth="1" markerEnd="url(#red-arrow)" />
      <text x={rampStartX - 14} y={dockY - 88} fill={ink} stroke="none" fontSize="13">
        {rampLabel}
      </text>
    </g>
  );
}

function buildPlanContextLabel(reference: SectionViewBuildPlanReference) {
  const typeLabel = reference.type.replace(/_/g, ' ');
  const sizeLabel = dimensionLabel(reference.lengthFt, reference.widthFt, typeLabel);
  return `${reference.label || typeLabel}: ${sizeLabel}`;
}

function buildPlanContextSymbol(reference: SectionViewBuildPlanReference, x: number, y: number, index: number) {
  const color = reference.color?.trim() || '#f8fafc';
  const strokeColor = '#334155';
  const label = buildPlanContextLabel(reference);
  const detail = reference.details;

  if (reference.type === 'boat_lift') {
    return (
      <g key={reference.id ?? `${reference.type}-${index}`} stroke={strokeColor} fill="none" strokeWidth="1.2">
        <line x1={x + 6} y1={y + 37} x2={x + 76} y2={y + 37} />
        <line x1={x + 16} y1={y + 22} x2={x + 66} y2={y + 22} />
        {[12, 70].map((postX) => (
          <line key={postX} x1={x + postX} y1={y + 12} x2={x + postX} y2={y + 44} />
        ))}
        <path d={`M ${x + 24} ${y + 36} L ${x + 38} ${y + 28} L ${x + 52} ${y + 36}`} />
        <text x={x + 88} y={y + 22} fill={ink} stroke="none" fontSize="11" fontWeight="700">
          {label}
        </text>
        {detail && <text x={x + 88} y={y + 38} fill={mutedInk} stroke="none" fontSize="10">{detail}</text>}
      </g>
    );
  }

  if (reference.type === 'boat_port' || reference.type === 'boathouse') {
    const isBoathouse = reference.type === 'boathouse';
    return (
      <g key={reference.id ?? `${reference.type}-${index}`} stroke={strokeColor} fill="none" strokeWidth="1.2">
        <rect x={x + 10} y={y + 22} width="64" height="28" fill={isBoathouse ? '#f8fafc' : 'none'} />
        <path d={`M ${x + 6} ${y + 22} L ${x + 42} ${y + 6} L ${x + 78} ${y + 22}`} fill={isBoathouse ? '#f1f5f9' : 'none'} />
        {!isBoathouse && [18, 66].map((postX) => <line key={postX} x1={x + postX} y1={y + 22} x2={x + postX} y2={y + 50} />)}
        <text x={x + 88} y={y + 22} fill={ink} stroke="none" fontSize="11" fontWeight="700">
          {label}
        </text>
        {detail && <text x={x + 88} y={y + 38} fill={mutedInk} stroke="none" fontSize="10">{detail}</text>}
      </g>
    );
  }

  if (reference.type === 'accessory') {
    return (
      <g key={reference.id ?? `${reference.type}-${index}`} stroke={strokeColor} fill="none" strokeWidth="1.2">
        <circle cx={x + 34} cy={y + 28} r="16" fill="#f8fafc" />
        <path d={`M ${x + 22} ${y + 28} H ${x + 46} M ${x + 34} ${y + 16} V ${y + 40}`} />
        <text x={x + 88} y={y + 24} fill={ink} stroke="none" fontSize="11" fontWeight="700">
          {label}
        </text>
        {detail && <text x={x + 88} y={y + 40} fill={mutedInk} stroke="none" fontSize="10">{detail}</text>}
      </g>
    );
  }

  if (reference.type === 'rip_rap') {
    return (
      <g key={reference.id ?? `${reference.type}-${index}`} stroke={strokeColor} fill="none" strokeWidth="1.2">
        <path d={`M ${x + 8} ${y + 38} L ${x + 22} ${y + 18} L ${x + 48} ${y + 22} L ${x + 78} ${y + 36} L ${x + 64} ${y + 48} L ${x + 24} ${y + 46} Z`} fill="#e5e7eb" />
        {[0, 1, 2, 3, 4].map((stoneIndex) => (
          <circle key={stoneIndex} cx={x + 22 + stoneIndex * 10} cy={y + 34 + (stoneIndex % 2) * 6} r={4 + (stoneIndex % 2)} fill="#9ca3af" stroke="#4b5563" />
        ))}
        <text x={x + 88} y={y + 24} fill={ink} stroke="none" fontSize="11" fontWeight="700">
          {label}
        </text>
        {detail && <text x={x + 88} y={y + 40} fill={mutedInk} stroke="none" fontSize="10">{detail}</text>}
      </g>
    );
  }

  if (reference.type === 'armour_stone') {
    return (
      <g key={reference.id ?? `${reference.type}-${index}`} stroke={strokeColor} fill="none" strokeWidth="1.2">
        {[0, 1].map((row) =>
          [0, 1, 2].map((column) => (
            <rect key={`${row}-${column}`} x={x + 10 + column * 22 + (row % 2) * 8} y={y + 18 + row * 14} width="22" height="13" fill="#a8a29e" stroke="#44403c" />
          )),
        )}
        <text x={x + 88} y={y + 24} fill={ink} stroke="none" fontSize="11" fontWeight="700">
          {label}
        </text>
        {detail && <text x={x + 88} y={y + 40} fill={mutedInk} stroke="none" fontSize="10">{detail}</text>}
      </g>
    );
  }

  return (
    <g key={reference.id ?? `${reference.type}-${index}`} stroke={strokeColor} fill="none" strokeWidth="1.2">
      <rect x={x + 8} y={y + 18} width="72" height="26" fill={color} opacity="0.7" />
      {reference.boardDirection !== 'none' &&
        Array.from({ length: 5 }, (_, lineIndex) => (
          <line key={lineIndex} x1={x + 16 + lineIndex * 12} y1={y + 20} x2={x + 16 + lineIndex * 12} y2={y + 42} stroke="#8a5f3d" strokeWidth="0.8" />
        ))}
      <text x={x + 88} y={y + 24} fill={ink} stroke="none" fontSize="11" fontWeight="700">
        {label}
      </text>
      {detail && <text x={x + 88} y={y + 40} fill={mutedInk} stroke="none" fontSize="10">{detail}</text>}
    </g>
  );
}

function buildPlanContextGroup(references: SectionViewBuildPlanReference[]) {
  if (references.length === 0) {
    return null;
  }

  const maxVisibleReferences = 4;
  const visibleReferences = references.slice(0, maxVisibleReferences);
  const extraCount = Math.max(0, references.length - visibleReferences.length);
  const groupX = 72;
  const groupY = 474;
  const itemStartX = groupX + 16;
  const itemStartY = groupY + 56;
  const columnWidth = 276;
  const rowHeight = 48;

  return (
    <g>
      <rect x={groupX} y={groupY} width="594" height="164" fill="#ffffff" opacity="0.01" stroke="none" />
      <text x={groupX + 16} y={groupY + 20} fill={ink} fontSize="12" fontWeight="800">
        BUILD PLAN CONTEXT
      </text>
      <text x={groupX + 16} y={groupY + 38} fill={mutedInk} fontSize="10">
        Additional Build Plan objects shown as visual context only. Final section details subject to site conditions and approvals.
      </text>
      {visibleReferences.map((reference, index) =>
        buildPlanContextSymbol(
          reference,
          itemStartX + (index % 2) * columnWidth,
          itemStartY + Math.floor(index / 2) * rowHeight,
          index,
        ),
      )}
      {extraCount > 0 && (
        <text x={itemStartX + columnWidth} y={groupY + 150} fill={mutedInk} fontSize="10">
          + {extraCount} more Build Plan item{extraCount === 1 ? '' : 's'} listed in the data panel
        </text>
      )}
    </g>
  );
}

function projectedObjectLabel(reference: SectionViewProjectedBuildPlanObject) {
  const typeLabel = reference.type.replace(/_/g, ' ');
  const sizeLabel = dimensionLabel(reference.lengthFt, reference.widthFt, typeLabel);
  return `${reference.label || typeLabel} ${sizeLabel}`;
}

function projectedObjectSymbol(
  object: SectionViewProjectedBuildPlanObject,
  xStart: number,
  xEnd: number,
  baseY: number,
  index: number,
) {
  const width = Math.max(18, xEnd - xStart);
  const centerX = xStart + width / 2;
  const labelY = baseY - 52 - (index % 3) * 16;
  const label = projectedObjectLabel(object);
  const strokeColor = object.isPrimary ? ink : '#334155';
  const fillColor = object.color?.trim() || '#f8fafc';

  if (object.type === 'ramp_with_rails' || object.type === 'ramp_without_rails') {
    const shoreY = baseY - 18;
    const dockY = baseY - 36;
    const hasRails = object.type === 'ramp_with_rails';
    return (
      <g key={object.id ?? `projected-ramp-${index}`} stroke={strokeColor} fill="none" strokeWidth="1.4">
        <polygon points={`${xStart},${shoreY} ${xEnd},${dockY} ${xEnd},${dockY + 8} ${xStart},${shoreY + 8}`} fill="#eef6fb" />
        {hasRails && (
          <>
            <line x1={xStart + 5} y1={shoreY - 12} x2={xEnd - 5} y2={dockY - 12} strokeWidth="1" />
            <line x1={xStart + width * 0.22} y1={shoreY - 7} x2={xStart + width * 0.22} y2={shoreY + 8} strokeWidth="0.8" />
            <line x1={xStart + width * 0.72} y1={dockY - 10} x2={xStart + width * 0.72} y2={dockY + 8} strokeWidth="0.8" />
          </>
        )}
        <line x1={centerX} y1={labelY + 7} x2={centerX} y2={dockY - 4} stroke={red} markerEnd="url(#red-arrow)" />
        <text x={centerX - 42} y={labelY} fill={red} stroke="none" fontSize="11" fontWeight="700">{label}</text>
      </g>
    );
  }

  if (object.type === 'floating_dock') {
    return (
      <g key={object.id ?? `projected-dock-${index}`} stroke={strokeColor} fill="none" strokeWidth={object.isPrimary ? 1.6 : 1.1}>
        <rect x={xStart} y={baseY - 42} width={width} height="28" fill={fillColor} opacity="0.72" />
        {object.boardDirection !== 'none' &&
          Array.from({ length: Math.max(4, Math.min(18, Math.round(width / 9))) }, (_, lineIndex) => (
            <line key={lineIndex} x1={xStart + 5 + lineIndex * 9} y1={baseY - 40} x2={xStart + 5 + lineIndex * 9} y2={baseY - 16} stroke="#8a5f3d" strokeWidth="0.8" />
          ))}
        <path d={`M ${xStart + 8} ${baseY - 12} q 0 14 5 14 L ${xEnd - 13} ${baseY + 2} q 5 0 5 -14`} strokeWidth="1" />
        <line x1={centerX} y1={labelY + 7} x2={centerX} y2={baseY - 45} stroke={red} markerEnd="url(#red-arrow)" />
        <text x={centerX - 46} y={labelY} fill={red} stroke="none" fontSize="11" fontWeight="700">{label}</text>
      </g>
    );
  }

  if (object.type === 'boat_lift') {
    return (
      <g key={object.id ?? `projected-lift-${index}`} stroke={strokeColor} fill="none" strokeWidth="1.2">
        <line x1={xStart} y1={baseY - 52} x2={xEnd} y2={baseY - 52} />
        <line x1={xStart + width * 0.16} y1={baseY - 26} x2={xEnd - width * 0.16} y2={baseY - 26} />
        {[xStart + 6, xEnd - 6].map((postX) => <line key={postX} x1={postX} y1={baseY - 70} x2={postX} y2={baseY - 12} />)}
        <path d={`M ${centerX - 18} ${baseY - 26} L ${centerX} ${baseY - 38} L ${centerX + 18} ${baseY - 26}`} />
        <text x={centerX - 44} y={labelY} fill={red} stroke="none" fontSize="11" fontWeight="700">{label}</text>
        <line x1={centerX} y1={labelY + 7} x2={centerX} y2={baseY - 54} stroke={red} markerEnd="url(#red-arrow)" />
      </g>
    );
  }

  if (object.type === 'boat_port' || object.type === 'boathouse') {
    const isBoathouse = object.type === 'boathouse';
    return (
      <g key={object.id ?? `projected-structure-${index}`} stroke={strokeColor} fill="none" strokeWidth="1.2">
        <rect x={xStart} y={baseY - 82} width={width} height="68" fill={isBoathouse ? '#f8fafc' : 'none'} />
        <path d={`M ${xStart - 4} ${baseY - 82} L ${centerX} ${baseY - 108} L ${xEnd + 4} ${baseY - 82}`} fill={isBoathouse ? '#f1f5f9' : 'none'} />
        {!isBoathouse && [xStart + 6, xEnd - 6].map((postX) => <line key={postX} x1={postX} y1={baseY - 82} x2={postX} y2={baseY - 14} />)}
        <text x={centerX - 50} y={labelY - 6} fill={red} stroke="none" fontSize="11" fontWeight="700">{label}</text>
        <line x1={centerX} y1={labelY + 1} x2={centerX} y2={baseY - 94} stroke={red} markerEnd="url(#red-arrow)" />
      </g>
    );
  }

  if (object.type === 'rip_rap') {
    return (
      <g key={object.id ?? `projected-rip-rap-${index}`} stroke="#4b5563" fill="none" strokeWidth="1.1">
        <path
          d={`M ${xStart} ${baseY - 12} L ${xStart + width * 0.2} ${baseY - 34} L ${centerX} ${baseY - 28} L ${xEnd} ${baseY - 18} L ${xEnd - width * 0.1} ${baseY + 6} L ${xStart + width * 0.16} ${baseY + 4} Z`}
          fill="#e5e7eb"
        />
        {Array.from({ length: Math.max(5, Math.min(20, Math.round(width / 14))) }, (_, stoneIndex) => (
          <circle
            key={stoneIndex}
            cx={xStart + 8 + ((stoneIndex * 17) % Math.max(16, width - 16))}
            cy={baseY - 20 + (stoneIndex % 4) * 7}
            r={3 + (stoneIndex % 3)}
            fill={stoneIndex % 2 === 0 ? '#9ca3af' : '#6b7280'}
            stroke="#4b5563"
            strokeWidth="0.8"
          />
        ))}
        <text x={centerX - 44} y={labelY} fill={red} stroke="none" fontSize="11" fontWeight="700">{label}</text>
        <line x1={centerX} y1={labelY + 7} x2={centerX} y2={baseY - 30} stroke={red} markerEnd="url(#red-arrow)" />
      </g>
    );
  }

  if (object.type === 'armour_stone') {
    return (
      <g key={object.id ?? `projected-armour-${index}`} stroke="#44403c" fill="none" strokeWidth="1.1">
        {Array.from({ length: 2 }, (_, row) =>
          Array.from({ length: Math.max(2, Math.min(8, Math.round(width / 26))) }, (_, column) => {
            const blockWidth = Math.max(18, width / Math.max(2, Math.min(8, Math.round(width / 26))));
            return (
              <rect
                key={`${row}-${column}`}
                x={xStart + column * blockWidth - (row % 2) * blockWidth * 0.22}
                y={baseY - 34 + row * 16}
                width={blockWidth + 1}
                height="16"
                fill={row % 2 === 0 ? '#a8a29e' : '#78716c'}
              />
            );
          }),
        )}
        <text x={centerX - 48} y={labelY} fill={red} stroke="none" fontSize="11" fontWeight="700">{label}</text>
        <line x1={centerX} y1={labelY + 7} x2={centerX} y2={baseY - 36} stroke={red} markerEnd="url(#red-arrow)" />
      </g>
    );
  }

  return (
    <g key={object.id ?? `projected-accessory-${index}`} stroke={strokeColor} fill="none" strokeWidth="1.1">
      <circle cx={centerX} cy={baseY - 54} r="10" fill="#f8fafc" />
      <text x={centerX - 40} y={labelY} fill={red} stroke="none" fontSize="10" fontWeight="700">{label}</text>
      <line x1={centerX} y1={labelY + 6} x2={centerX} y2={baseY - 64} stroke={red} markerEnd="url(#red-arrow)" />
    </g>
  );
}

function projectedBuildPlanSection(highWaterY: number, projection: SectionViewBuildPlanProjection) {
  const xStart = 170;
  const xEnd = 930;
  const baseY = highWaterY - 6;
  const stationSpan = Math.max(1, projection.stationEndFt - projection.stationStartFt);
  const toX = (stationFt: number) => xStart + ((stationFt - projection.stationStartFt) / stationSpan) * (xEnd - xStart);

  return (
    <g>
      <rect x={xStart - 44} y={baseY - 132} width={xEnd - xStart + 88} height="185" fill="#ffffff" opacity="0.01" />
      <line x1={xStart} y1={baseY + 18} x2={xEnd} y2={baseY + 18} stroke={ink} strokeWidth="1" strokeDasharray="8 6" />
      <line x1={toX(0)} y1={baseY - 92} x2={toX(0)} y2={baseY + 34} stroke={ink} strokeWidth="1.1" />
      <text x={toX(0) - 28} y={baseY + 50} fill={mutedInk} fontSize="10">SECTION START / SHORE</text>
      {projection.objects.map((object, index) =>
        projectedObjectSymbol(object, toX(object.startStationFt), toX(object.endStationFt), baseY, index),
      )}
      <text x={xStart} y={baseY + 76} fill={mutedInk} fontSize="10">
        {projection.note}
      </text>
    </g>
  );
}

function controlGroup(title: string, children: ReactNode) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function SectionViewCanvas({ sectionView, projectName, drawingInfo, onChange, onGenerateFromBuildPlan }: SectionViewCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    elementId: string;
    startPoint: SectionViewManualOffset;
    startOffset: SectionViewManualOffset;
    startRipRapTopPoints?: SectionViewPoint[];
    startRipRapBottomPoints?: SectionViewPoint[];
  } | null>(null);
  const [pointDragState, setPointDragState] = useState<{
    lineId: keyof SectionViewProfileGeometry;
    pointIndex: number;
    zoneId?: string;
    boundary?: 'top' | 'bottom';
  } | null>(null);
  const buildPlanSummary = sectionView.buildPlanSummary;
  const drawingDate = useMemo(() => formatDate(new Date()), []);
  const manualElementOffsets = sectionView.manualElementOffsets ?? {};
  const manualElementTransforms = sectionView.manualElementTransforms ?? {};
  const hiddenElementIds = sectionView.hiddenElements ?? [];
  const deletedElementIds = sectionView.deletedElements ?? [];
  const hiddenElementSet = useMemo(() => new Set(hiddenElementIds), [hiddenElementIds]);
  const deletedElementSet = useMemo(() => new Set(deletedElementIds), [deletedElementIds]);
  const selectedTransform = selectedElementId ? manualElementTransforms[selectedElementId] : undefined;
  const selectedOffset = selectedElementId ? manualElementOffsets[selectedElementId] : undefined;
  const selectedX = selectedTransform?.x ?? selectedOffset?.x ?? 0;
  const selectedY = selectedTransform?.y ?? selectedOffset?.y ?? 0;
  const selectedScaleX = selectedTransform?.scaleX ?? 1;
  const selectedScaleY = selectedTransform?.scaleY ?? 1;
  const selectedCanResize = Boolean(selectedElementId && resizableElementIds.has(selectedElementId));
  const labelOverrides = sectionView.labelOverrides ?? {};

  const labelText = (id: string, fallback: string) => labelOverrides[id] ?? fallback;
  const customItems = sectionView.customItems ?? [];

  const updateField = <Key extends keyof SectionViewData>(field: Key, value: SectionViewData[Key]) => {
    onChange({
      ...sectionView,
      [field]: value,
    });
  };

  const updateProfileVisibility = (field: 'showGradeProfile' | 'showLakebedProfile', value: boolean) => {
    const nextShowGradeProfile = field === 'showGradeProfile' ? value : showGradeProfile;
    const nextShowLakebedProfile = field === 'showLakebedProfile' ? value : showLakebedProfile;

    onChange({
      ...sectionView,
      showGradeProfile: nextShowGradeProfile,
      showLakebedProfile: nextShowLakebedProfile,
      showProfileLines: nextShowGradeProfile || nextShowLakebedProfile,
    });
  };

  const getSvgPoint = (event: PointerEvent<SVGElement>): SectionViewManualOffset | null => {
    const svgElement = svgRef.current;
    const matrix = svgElement?.getScreenCTM();
    if (!svgElement || !matrix) {
      return null;
    }

    const point = svgElement.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const svgPoint = point.matrixTransform(matrix.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  };

  const updateManualElementOffset = (elementId: string, offset: SectionViewManualOffset) => {
    const nextOffset = {
      x: Math.round(offset.x),
      y: Math.round(offset.y),
    };
    updateField('manualElementOffsets', {
      ...manualElementOffsets,
      [elementId]: nextOffset,
    });
    updateField('manualElementTransforms', {
      ...manualElementTransforms,
      [elementId]: {
        ...(manualElementTransforms[elementId] ?? {}),
        ...nextOffset,
      },
    });
  };

  const updateManualElementTransform = (elementId: string, transform: SectionViewManualTransform) => {
    const currentTransform = {
      ...(manualElementOffsets[elementId] ?? {}),
      ...(manualElementTransforms[elementId] ?? {}),
    };
    const nextTransform = {
      ...currentTransform,
      ...transform,
    };
    updateField('manualElementOffsets', {
      ...manualElementOffsets,
      [elementId]: {
        x: Math.round(nextTransform.x ?? 0),
        y: Math.round(nextTransform.y ?? 0),
      },
    });
    updateField('manualElementTransforms', {
      ...manualElementTransforms,
      [elementId]: nextTransform,
    });
  };

  const updateProfilePoint = (lineId: keyof SectionViewProfileGeometry, pointIndex: number, point: SectionViewPoint) => {
    const currentPoints = profileGeometry[lineId];
    updateField('profileGeometry', {
      ...(sectionView.profileGeometry ?? {}),
      [lineId]: currentPoints.map((currentPoint, index) => (index === pointIndex ? { x: Math.round(point.x), y: Math.round(point.y) } : currentPoint)),
    });
  };

  const updateRipRapZones = (zones: SectionViewRipRapZone[]) => {
    const normalizedZones = zones.map(normalizeRipRapZone);
    const primaryZone = normalizedZones[0];
    onChange({
      ...sectionView,
      ripRapZones: normalizedZones,
      ripRapSettings: primaryZone ? {
        x: primaryZone.x,
        y: primaryZone.y,
        length: primaryZone.length,
        depth: primaryZone.depth,
        slopeDegrees: primaryZone.slopeDegrees,
        stoneSize: primaryZone.stoneSize,
        density: primaryZone.density,
        showFilterLayer: primaryZone.showFilterLayer,
      } : sectionView.ripRapSettings,
      profileGeometry: primaryZone ? {
        ...(sectionView.profileGeometry ?? {}),
        ripRapTopPoints: primaryZone.topPoints,
        ripRapBottomPoints: primaryZone.bottomPoints,
      } : sectionView.profileGeometry,
    });
  };

  const updateRipRapZone = (zoneId: string, update: (zone: SectionViewRipRapZone) => SectionViewRipRapZone) => {
    updateRipRapZones(ripRapZones.map((zone) => (zone.id === zoneId ? update(zone) : zone)));
  };

  const updateRipRapZonePoint = (zoneId: string, boundary: 'top' | 'bottom', pointIndex: number, point: SectionViewPoint) => {
    updateRipRapZone(zoneId, (zone) => ({
      ...zone,
      [boundary === 'top' ? 'topPoints' : 'bottomPoints']: zone[boundary === 'top' ? 'topPoints' : 'bottomPoints'].map((currentPoint, index) =>
        index === pointIndex ? { x: Math.round(point.x), y: Math.round(point.y) } : currentPoint,
      ),
    }));
  };

  const handleProfilePointPointerDown = (lineId: keyof SectionViewProfileGeometry, pointIndex: number, event: PointerEvent<SVGCircleElement>) => {
    if (!manualEditMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedElementId(`${lineId}:${pointIndex}`);
    setPointDragState({ lineId, pointIndex });
    setDragState(null);
  };

  const handleRipRapZonePointPointerDown = (zoneId: string, boundary: 'top' | 'bottom', pointIndex: number, event: PointerEvent<SVGCircleElement>) => {
    if (!manualEditMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedElementId(`ripRapZone:${zoneId}:${boundary}:${pointIndex}`);
    setPointDragState({ lineId: 'ripRapTopPoints', pointIndex, zoneId, boundary });
    setDragState(null);
  };

  const updateRipRapSettings = (zoneId: string, settings: Partial<SectionViewRipRapSettings>) => {
    const currentZone = ripRapZones.find((zone) => zone.id === zoneId) ?? legacyRipRapZone;
    const nextSettings = {
      ...currentZone,
      ...settings,
    };
    const nextBoundary = buildRipRapBoundary(nextSettings);
    updateRipRapZone(zoneId, (zone) => ({
      ...zone,
      ...nextSettings,
      topPoints: nextBoundary.topPoints,
      bottomPoints: nextBoundary.bottomPoints,
    }));
  };

  const moveRipRapSystem = (
    zoneId: string,
    nextX: number,
    nextY: number,
    startX: number,
    startY: number,
    startTopPoints: SectionViewPoint[],
    startBottomPoints: SectionViewPoint[],
  ) => {
    const deltaX = nextX - startX;
    const deltaY = nextY - startY;
    const nextOffsets = { ...manualElementOffsets };
    const nextTransforms = { ...manualElementTransforms };
    delete nextOffsets[`riprap-zone:${zoneId}`];
    delete nextTransforms[`riprap-zone:${zoneId}`];

    const shiftedZones = ripRapZones.map((zone) => zone.id === zoneId ? {
      ...zone,
      x: Math.round(nextX),
      y: Math.round(nextY),
      topPoints: startTopPoints.map((point) => ({ x: Math.round(point.x + deltaX), y: Math.round(point.y + deltaY) })),
      bottomPoints: startBottomPoints.map((point) => ({ x: Math.round(point.x + deltaX), y: Math.round(point.y + deltaY) })),
    } : zone);

    const primaryZone = shiftedZones[0];
    onChange({
      ...sectionView,
      manualElementOffsets: nextOffsets,
      manualElementTransforms: nextTransforms,
      ripRapZones: shiftedZones,
      ripRapSettings: primaryZone,
      profileGeometry: primaryZone ? {
        ...(sectionView.profileGeometry ?? {}),
        ripRapTopPoints: primaryZone.topPoints,
        ripRapBottomPoints: primaryZone.bottomPoints,
      } : sectionView.profileGeometry,
    });
  };

  const updateLabelOverride = (elementId: string, value: string) => {
    updateField('labelOverrides', {
      ...labelOverrides,
      [elementId]: value,
    });
  };

  const updateTitleBlockField = (field: keyof NonNullable<SectionViewData['titleBlock']>, value: string) => {
    updateField('titleBlock', {
      ...(sectionView.titleBlock ?? {}),
      [field]: value,
    });
  };

  const addCustomItem = (type: SectionViewCustomItemType) => {
    const item = defaultCustomItem(type);
    updateField('customItems', [...customItems, item]);
    setSelectedElementId(`custom:${item.id}`);
    setManualEditMode(true);
  };

  const updateCustomItem = (itemId: string, updates: Partial<SectionViewCustomItem>) => {
    updateField('customItems', customItems.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
  };

  const resetElementOffset = (elementId: string) => {
    const pointMatch = elementId.match(/^(gradePoints|lakebedPoints|ripRapTopPoints|ripRapBottomPoints):(\d+)$/);
    const zonePointMatch = elementId.match(/^ripRapZone:(.+):(top|bottom):(\d+)$/);
    if (zonePointMatch) {
      const zoneId = zonePointMatch[1];
      const boundary = zonePointMatch[2] as 'top' | 'bottom';
      const pointIndex = Number(zonePointMatch[3]);
      const zone = ripRapZones.find((currentZone) => currentZone.id === zoneId);
      if (zone) {
        const defaultBoundary = buildRipRapBoundary(zone);
        updateRipRapZonePoint(zoneId, boundary, pointIndex, defaultBoundary[boundary === 'top' ? 'topPoints' : 'bottomPoints'][pointIndex]);
      }
      return;
    }
    if (pointMatch) {
      const lineId = pointMatch[1] as keyof SectionViewProfileGeometry;
      const pointIndex = Number(pointMatch[2]);
      updateProfilePoint(lineId, pointIndex, defaultProfileGeometry[lineId][pointIndex]);
      return;
    }

    const nextOffsets = { ...manualElementOffsets };
    const nextTransforms = { ...manualElementTransforms };
    const nextLabelOverrides = { ...labelOverrides };
    delete nextOffsets[elementId];
    delete nextTransforms[elementId];
    delete nextLabelOverrides[elementId];
    const customMatch = elementId.match(/^custom:(.+)$/);
    if (customMatch) {
      const sourceCustom = customItems.find((item) => item.id === customMatch[1]);
      if (sourceCustom) {
        const defaults = defaultCustomItem(sourceCustom.type);
        onChange({
          ...sectionView,
          customItems: customItems.map((item) => item.id === sourceCustom.id ? {
            ...item,
            width: defaults.width,
            height: defaults.height,
            rotation: defaults.rotation,
            strokeColor: defaults.strokeColor,
            fillColor: defaults.fillColor,
          } : item),
          manualElementOffsets: nextOffsets,
          manualElementTransforms: nextTransforms,
          labelOverrides: nextLabelOverrides,
        });
        return;
      }
    }
    const nextProfileGeometry = { ...(sectionView.profileGeometry ?? {}) };
    const zoneMatch = elementId.match(/^riprap-zone:(.+)$/);
    if (zoneMatch) {
      const zoneId = zoneMatch[1];
      const resetZones = ripRapZones.map((zone) => {
        if (zone.id !== zoneId) {
          return zone;
        }

        const boundary = buildRipRapBoundary(zone);
        return {
          ...zone,
          topPoints: boundary.topPoints,
          bottomPoints: boundary.bottomPoints,
        };
      });
      updateRipRapZones(resetZones);
      return;
    }
    onChange({
      ...sectionView,
      manualElementOffsets: nextOffsets,
      manualElementTransforms: nextTransforms,
      labelOverrides: nextLabelOverrides,
      profileGeometry: nextProfileGeometry,
      ripRapSettings: sectionView.ripRapSettings,
    });
  };

  const handleEditablePointerDown = (elementId: string, event: PointerEvent<SVGGElement>) => {
    if (!manualEditMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startPoint = getSvgPoint(event);
    if (!startPoint) {
      return;
    }

    setSelectedElementId(elementId);
    const zoneMatch = elementId.match(/^riprap-zone:(.+)$/);
    const dragZone = zoneMatch ? ripRapZones.find((zone) => zone.id === zoneMatch[1]) : undefined;
    const customMatch = elementId.match(/^custom:(.+)$/);
    const dragCustom = customMatch ? customItems.find((item) => item.id === customMatch[1]) : undefined;
    setDragState({
      elementId,
      startPoint,
      startOffset: {
        x: dragZone ? dragZone.x : dragCustom ? dragCustom.x : manualElementTransforms[elementId]?.x ?? manualElementOffsets[elementId]?.x ?? 0,
        y: dragZone ? dragZone.y : dragCustom ? dragCustom.y : manualElementTransforms[elementId]?.y ?? manualElementOffsets[elementId]?.y ?? 0,
      },
      startRipRapTopPoints: dragZone ? dragZone.topPoints.map((point) => ({ ...point })) : undefined,
      startRipRapBottomPoints: dragZone ? dragZone.bottomPoints.map((point) => ({ ...point })) : undefined,
    });
  };

  const handleSvgPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (manualEditMode && pointDragState) {
      const point = getSvgPoint(event);
      if (point) {
        if (pointDragState.zoneId && pointDragState.boundary) {
          updateRipRapZonePoint(pointDragState.zoneId, pointDragState.boundary, pointDragState.pointIndex, point);
        } else {
          updateProfilePoint(pointDragState.lineId, pointDragState.pointIndex, point);
        }
      }
      return;
    }

    if (!manualEditMode || !dragState) {
      return;
    }

    const point = getSvgPoint(event);
    if (!point) {
      return;
    }

    const nextX = dragState.startOffset.x + point.x - dragState.startPoint.x;
    const nextY = dragState.startOffset.y + point.y - dragState.startPoint.y;

    const zoneMatch = dragState.elementId.match(/^riprap-zone:(.+)$/);
    if (zoneMatch && dragState.startRipRapTopPoints && dragState.startRipRapBottomPoints) {
      moveRipRapSystem(zoneMatch[1], nextX, nextY, dragState.startOffset.x, dragState.startOffset.y, dragState.startRipRapTopPoints, dragState.startRipRapBottomPoints);
      return;
    }

    const customMatch = dragState.elementId.match(/^custom:(.+)$/);
    if (customMatch) {
      updateCustomItem(customMatch[1], {
        x: Math.round(nextX),
        y: Math.round(nextY),
      });
      return;
    }

    updateManualElementOffset(dragState.elementId, {
      x: nextX,
      y: nextY,
    });
  };

  const handleSvgPointerUp = () => {
    setDragState(null);
    setPointDragState(null);
  };

  const selectableTemplateElement = (elementId: string, children: ReactNode) => {
    if (hiddenElementSet.has(elementId) || deletedElementSet.has(elementId)) {
      return null;
    }

    return (
      <g
        key={elementId}
        onPointerDown={(event) => {
          if (!manualEditMode) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          setSelectedElementId(elementId);
          setDragState(null);
          setPointDragState(null);
        }}
        data-section-editable-id={elementId}
        style={{ cursor: manualEditMode ? 'pointer' : 'default', pointerEvents: 'all' }}
      >
        {children}
      </g>
    );
  };

  const editableElement = (elementId: string, children: ReactNode, handleX: number, handleY: number) => {
    if (hiddenElementSet.has(elementId) || deletedElementSet.has(elementId)) {
      return null;
    }

    const transform = {
      ...(manualElementOffsets[elementId] ?? {}),
      ...(manualElementTransforms[elementId] ?? {}),
    };
    const offset = {
      x: elementId.startsWith('riprap-zone:') ? 0 : transform.x ?? 0,
      y: elementId.startsWith('riprap-zone:') ? 0 : transform.y ?? 0,
    };
    const scaleX = elementId.startsWith('riprap-zone:') ? 1 : transform.scaleX ?? 1;
    const scaleY = elementId.startsWith('riprap-zone:') ? 1 : transform.scaleY ?? 1;
    const isSelected = selectedElementId === elementId;

    return (
      <g
        key={elementId}
        transform={`translate(${offset.x} ${offset.y}) scale(${scaleX} ${scaleY})`}
        onPointerDown={(event) => handleEditablePointerDown(elementId, event)}
        data-section-editable-id={elementId}
        style={{ cursor: manualEditMode ? 'move' : 'default', pointerEvents: 'all', touchAction: 'none' }}
      >
        {children}
        {manualEditMode && (
          <g pointerEvents="all" data-section-edit-handle="true">
            <circle cx={handleX} cy={handleY} r="18" fill="#ffffff" opacity="0.01" />
            <circle cx={handleX} cy={handleY} r={isSelected ? 7 : 5} fill="#ffffff" stroke={isSelected ? red : blue} strokeWidth="1.6" />
            {isSelected && (
              <text x={handleX + 10} y={handleY - 8} fill={red} fontSize="10" fontWeight="700">
                {editableElementLabels[elementId] ?? ripRapZones.find((zone) => `riprap-zone:${zone.id}` === elementId)?.label ?? 'Editable item'}
              </text>
            )}
          </g>
        )}
      </g>
    );
  };

  const profilePointHandles = (lineId: keyof SectionViewProfileGeometry, points: SectionViewPoint[]) => {
    if (!manualEditMode) {
      return null;
    }

    const ownerElementId = profileElementIds[lineId];
    if (ownerElementId && (hiddenElementSet.has(ownerElementId) || deletedElementSet.has(ownerElementId))) {
      return null;
    }

    return (
      <g data-section-edit-handle="true">
        {points.map((point, index) => {
          const elementId = `${lineId}:${index}`;
          if (hiddenElementSet.has(elementId) || deletedElementSet.has(elementId)) {
            return null;
          }
          const isSelected = selectedElementId === elementId;
          return (
            <g key={elementId}>
              <circle
                cx={point.x}
                cy={point.y}
                r="14"
                fill="#ffffff"
                opacity="0.01"
                onPointerDown={(event) => handleProfilePointPointerDown(lineId, index, event)}
                style={{ cursor: 'move', touchAction: 'none' }}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={isSelected ? 6 : 4}
                fill="#ffffff"
                stroke={isSelected ? red : blue}
                strokeWidth="1.6"
                pointerEvents="none"
              />
              {isSelected && (
                <text x={point.x + 10} y={point.y - 8} fill={red} fontSize="10" fontWeight="700" pointerEvents="none">
                  {profileLineLabels[lineId]} point {index + 1}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const ripRapZonePointHandles = (zone: SectionViewRipRapZone) => {
    if (!manualEditMode || hiddenElementSet.has(`riprap-zone:${zone.id}`) || deletedElementSet.has(`riprap-zone:${zone.id}`)) {
      return null;
    }

    return (
      <g data-section-edit-handle="true">
        {(['top', 'bottom'] as const).flatMap((boundary) =>
          zone[boundary === 'top' ? 'topPoints' : 'bottomPoints'].map((point, index) => {
            const elementId = `ripRapZone:${zone.id}:${boundary}:${index}`;
            if (hiddenElementSet.has(elementId) || deletedElementSet.has(elementId)) {
              return null;
            }
            const isSelected = selectedElementId === elementId;
            return (
              <g key={elementId}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="14"
                  fill="#ffffff"
                  opacity="0.01"
                  onPointerDown={(event) => handleRipRapZonePointPointerDown(zone.id, boundary, index, event)}
                  style={{ cursor: 'move', touchAction: 'none' }}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? 6 : 4}
                  fill="#ffffff"
                  stroke={isSelected ? red : blue}
                  strokeWidth="1.6"
                  pointerEvents="none"
                />
              </g>
            );
          }),
        )}
      </g>
    );
  };

  const duplicateSelectedElement = () => {
    if (!selectedElementId) {
      return;
    }

    const zoneMatch = selectedElementId.match(/^riprap-zone:(.+)$/);
    if (zoneMatch) {
      const sourceZone = ripRapZones.find((zone) => zone.id === zoneMatch[1]);
      if (!sourceZone) {
        return;
      }

      const duplicateId = `riprap-${Date.now().toString(36)}`;
      const offset = 34;
      const duplicateZone = normalizeRipRapZone({
        ...sourceZone,
        id: duplicateId,
        label: `${sourceZone.label} copy`,
        x: sourceZone.x + offset,
        y: sourceZone.y + offset,
        topPoints: sourceZone.topPoints.map((point) => ({ x: point.x + offset, y: point.y + offset })),
        bottomPoints: sourceZone.bottomPoints.map((point) => ({ x: point.x + offset, y: point.y + offset })),
      });
      updateRipRapZones([...ripRapZones, duplicateZone]);
      setSelectedElementId(`riprap-zone:${duplicateId}`);
      return;
    }

    const customMatch = selectedElementId.match(/^custom:(.+)$/);
    const sourceCustom = customMatch ? customItems.find((item) => item.id === customMatch[1]) : undefined;
    const duplicateCustomId = `custom-${Date.now().toString(36)}`;
    const duplicateLabel = sourceCustom ? customItemText(sourceCustom) : labelText(selectedElementId, defaultElementText[selectedElementId] ?? editableElementLabels[selectedElementId] ?? 'Custom label');
    const sourceTransform = {
      ...(manualElementOffsets[selectedElementId] ?? {}),
      ...(manualElementTransforms[selectedElementId] ?? {}),
    };
    const duplicateItem: SectionViewCustomItem = {
      ...(sourceCustom ?? defaultCustomItem('label')),
      id: duplicateCustomId,
      text: `${duplicateLabel} copy`,
      label: undefined,
      x: (sourceCustom?.x ?? 170 + (sourceTransform.x ?? 0)) + 28,
      y: (sourceCustom?.y ?? 170 + (sourceTransform.y ?? 0)) + 28,
    };
    onChange({
      ...sectionView,
      customItems: [...customItems, duplicateItem],
      manualElementTransforms: {
        ...manualElementTransforms,
        [`custom:${duplicateCustomId}`]: {
          scaleX: sourceCustom?.scaleX ?? sourceTransform.scaleX ?? 1,
          scaleY: sourceCustom?.scaleY ?? sourceTransform.scaleY ?? 1,
        },
      },
    });
    setSelectedElementId(`custom:${duplicateCustomId}`);
  };

  const mirrorSelectedElement = (axis: 'horizontal' | 'vertical') => {
    if (!selectedElementId) {
      return;
    }

    const zoneMatch = selectedElementId.match(/^riprap-zone:(.+)$/);
    if (zoneMatch) {
      const sourceZone = ripRapZones.find((zone) => zone.id === zoneMatch[1]);
      if (!sourceZone) {
        return;
      }

      const bounds = pointBounds([...sourceZone.topPoints, ...sourceZone.bottomPoints]);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      updateRipRapZone(sourceZone.id, (zone) => ({
        ...zone,
        topPoints: zone.topPoints.map((point) => ({
          x: Math.round(axis === 'horizontal' ? centerX - (point.x - centerX) : point.x),
          y: Math.round(axis === 'vertical' ? centerY - (point.y - centerY) : point.y),
        })),
        bottomPoints: zone.bottomPoints.map((point) => ({
          x: Math.round(axis === 'horizontal' ? centerX - (point.x - centerX) : point.x),
          y: Math.round(axis === 'vertical' ? centerY - (point.y - centerY) : point.y),
        })),
      }));
      return;
    }

    const customMatch = selectedElementId.match(/^custom:(.+)$/);
    if (customMatch) {
      updateManualElementTransform(selectedElementId, {
        [axis === 'horizontal' ? 'scaleX' : 'scaleY']: axis === 'horizontal' ? -selectedScaleX : -selectedScaleY,
      });
      return;
    }

    updateManualElementTransform(selectedElementId, {
      [axis === 'horizontal' ? 'scaleX' : 'scaleY']: axis === 'horizontal' ? -selectedScaleX : -selectedScaleY,
    });
  };

  const hideSelectedElement = () => {
    if (!selectedElementId || hiddenElementSet.has(selectedElementId) || deletedElementSet.has(selectedElementId)) {
      return;
    }

    updateField('hiddenElements', Array.from(new Set([...hiddenElementIds, selectedElementId])));
    setSelectedElementId(null);
    setDragState(null);
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId) {
      return;
    }

    const nextOffsets = { ...manualElementOffsets };
    const nextTransforms = { ...manualElementTransforms };
    const nextLabelOverrides = { ...labelOverrides };
    delete nextOffsets[selectedElementId];
    delete nextTransforms[selectedElementId];
    delete nextLabelOverrides[selectedElementId];

    const customMatch = selectedElementId.match(/^custom:(.+)$/);
    if (customMatch) {
      onChange({
        ...sectionView,
        customItems: customItems.filter((item) => item.id !== customMatch[1]),
        manualElementOffsets: nextOffsets,
        manualElementTransforms: nextTransforms,
        labelOverrides: nextLabelOverrides,
        hiddenElements: hiddenElementIds.filter((elementId) => elementId !== selectedElementId),
      });
      setSelectedElementId(null);
      setDragState(null);
      return;
    }

    const zoneMatch = selectedElementId.match(/^riprap-zone:(.+)$/);
    if (zoneMatch) {
      const zoneId = zoneMatch[1];
      const isDuplicatedZone = zoneId !== 'riprap-main' || ripRapZones.length > 1;
      if (isDuplicatedZone) {
        const nextZones = ripRapZones.filter((zone) => zone.id !== zoneId);
        updateRipRapZones(nextZones.length > 0 ? nextZones : ripRapZones);
        setSelectedElementId(null);
        setDragState(null);
        return;
      }
    }

    onChange({
      ...sectionView,
      manualElementOffsets: nextOffsets,
      manualElementTransforms: nextTransforms,
      labelOverrides: nextLabelOverrides,
      hiddenElements: hiddenElementIds.filter((elementId) => elementId !== selectedElementId),
      deletedElements: Array.from(new Set([...deletedElementIds, selectedElementId])),
    });
    setSelectedElementId(null);
    setDragState(null);
  };

  const showHiddenElements = () => {
    updateField('hiddenElements', []);
    setSelectedElementId(null);
    setDragState(null);
  };

  const resetAllManualEdits = () => {
    onChange({
      ...sectionView,
      manualElementOffsets: {},
      manualElementTransforms: {},
      ripRapSettings: undefined,
      ripRapZones: undefined,
      customItems: [],
      profileGeometry: undefined,
      labelOverrides: {},
      hiddenElements: [],
      deletedElements: [],
    });
    setSelectedElementId(null);
    setDragState(null);
  };

  const updateNumberField = (
    field: 'waterLevelFt' | 'shorelineHeightFt' | 'lakebedDropFt' | 'ripRapDepthFt' | 'armourStoneRows',
    value: string,
  ) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    if (field === 'armourStoneRows') {
      updateField(field, Math.round(clampNumber(parsedValue, 0, 6)));
      return;
    }

    if (field === 'waterLevelFt') {
      updateField(field, clampNumber(parsedValue, -6, 6));
      return;
    }

    updateField(field, clampNumber(parsedValue, 0, 12));
  };

  const updateDockRampReference = (field: keyof NonNullable<SectionViewData['dockRampReference']>, value: number | string) => {
    updateField('dockRampReference', {
      source: 'manual',
      ...(sectionView.dockRampReference ?? {}),
      [field]: value,
    });
  };

  const handleTemplateChange = (templateId: SectionViewTemplateId) => {
    onChange(applySectionTemplate(templateId));
  };

  const handleExportPng = async () => {
    const svgElement = svgRef.current;
    if (!svgElement) {
      return;
    }

    const exportSvg = svgElement.cloneNode(true) as SVGSVGElement;
    exportSvg.querySelectorAll('[data-section-edit-handle="true"]').forEach((element) => element.remove());
    const serializedSvg = new XMLSerializer().serializeToString(exportSvg);
    const svgBlob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = SVG_WIDTH * 2;
      canvas.height = SVG_HEIGHT * 2;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      downloadDataUrl(canvas.toDataURL('image/png'), `${toFilename(projectName)}-section-view.png`);
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  };

  const sectionHeight = clampNumber(sectionView.shorelineHeightFt, 0, 10);
  const lakebedDrop = clampNumber(sectionView.lakebedDropFt, 0, 10);
  const ripRapDepth = clampNumber(sectionView.ripRapDepthFt, 0, 4);
  const armourRows = Math.round(clampNumber(sectionView.armourStoneRows, 0, 6));
  const highWaterY = baseHighWaterY - clampNumber(sectionView.waterLevelFt, -6, 6) * 4;
  const lowWaterY = highWaterY + lowWaterOffset;
  const gradeStartY = 218 - sectionHeight * 9;
  const gradeMidY = gradeStartY + 40;
  const shorelineToeY = highWaterY + 4;
  const lakebedEndY = 495 + lakebedDrop * 7;
  const ripRapTop = gradeMidY + 24;
  const ripRapBottom = ripRapTop + Math.max(30, ripRapDepth * 19);
  const ripRapSettings: SectionViewRipRapSettings = {
    ...defaultRipRapSettings,
    y: ripRapTop,
    depth: Math.max(58, ripRapBottom - ripRapTop + 36),
    ...(sectionView.ripRapSettings ?? {}),
  };
  const defaultRipRapBoundary = buildRipRapBoundary(ripRapSettings);
  const defaultProfileGeometry: Required<SectionViewProfileGeometry> = {
    gradePoints: [
      { x: 120, y: gradeStartY },
      { x: 218, y: gradeStartY + 16 },
      { x: 328, y: gradeMidY + 12 },
      { x: 520, y: shorelineToeY + 14 },
    ],
    lakebedPoints: [
      { x: 112, y: lakebedEndY - 22 },
      { x: 300, y: lakebedEndY - 10 },
      { x: 470, y: lakebedEndY + 28 },
      { x: 720, y: lakebedEndY + 28 },
      { x: 990, y: lakebedEndY + 16 },
    ],
    ripRapTopPoints: defaultRipRapBoundary.topPoints,
    ripRapBottomPoints: defaultRipRapBoundary.bottomPoints,
  };
  const profileGeometry: Required<SectionViewProfileGeometry> = {
    gradePoints: sectionView.profileGeometry?.gradePoints ?? defaultProfileGeometry.gradePoints,
    lakebedPoints: sectionView.profileGeometry?.lakebedPoints ?? defaultProfileGeometry.lakebedPoints,
    ripRapTopPoints: sectionView.profileGeometry?.ripRapTopPoints ?? defaultProfileGeometry.ripRapTopPoints,
    ripRapBottomPoints: sectionView.profileGeometry?.ripRapBottomPoints ?? defaultProfileGeometry.ripRapBottomPoints,
  };
  const legacyRipRapZone = makeRipRapZone('riprap-main', 'Rip rap zone', ripRapSettings, profileGeometry.ripRapTopPoints, profileGeometry.ripRapBottomPoints);
  const ripRapZones = (sectionView.ripRapZones && sectionView.ripRapZones.length > 0 ? sectionView.ripRapZones : [legacyRipRapZone]).map(normalizeRipRapZone);
  const selectedRipRapZoneId = selectedElementId?.startsWith('riprap-zone:') ? selectedElementId.replace('riprap-zone:', '') : undefined;
  const selectedRipRapZone = selectedRipRapZoneId ? ripRapZones.find((zone) => zone.id === selectedRipRapZoneId) : undefined;
  const selectedPointMatch = selectedElementId?.match(/^(gradePoints|lakebedPoints|ripRapTopPoints|ripRapBottomPoints):(\d+)$/);
  const selectedZonePointMatch = selectedElementId?.match(/^ripRapZone:(.+):(top|bottom):(\d+)$/);
  const selectedPointLine = selectedPointMatch?.[1] as keyof SectionViewProfileGeometry | undefined;
  const selectedPointIndex = selectedPointMatch ? Number(selectedPointMatch[2]) : undefined;
  const selectedZonePoint = selectedZonePointMatch
    ? ripRapZones
        .find((zone) => zone.id === selectedZonePointMatch[1])
        ?.[selectedZonePointMatch[2] === 'top' ? 'topPoints' : 'bottomPoints']?.[Number(selectedZonePointMatch[3])]
    : undefined;
  const selectedPoint = selectedPointLine && selectedPointIndex !== undefined ? profileGeometry[selectedPointLine][selectedPointIndex] : selectedZonePoint;
  const selectedZoneName = selectedElementId?.startsWith('riprap-zone:')
    ? ripRapZones.find((zone) => `riprap-zone:${zone.id}` === selectedElementId)?.label
    : undefined;
  const selectedCustomItem = selectedElementId?.startsWith('custom:')
    ? customItems.find((item) => `custom:${item.id}` === selectedElementId)
    : undefined;
  const selectedCustomName = selectedCustomItem
    ? `${customItemTypes.find((itemType) => itemType.type === selectedCustomItem.type)?.label.replace(/^Add /, '') ?? 'Custom item'}${customItemText(selectedCustomItem) ? `: ${customItemText(selectedCustomItem)}` : ''}`
    : undefined;
  const buildPlanReferences = sectionView.buildPlanReferences ?? [];
  const buildPlanProjection = sectionView.buildPlanProjection;
  const selectedItemName = selectedZoneName ?? selectedCustomName ?? (
    selectedZonePointMatch
      ? `Rip rap ${selectedZonePointMatch[2]} boundary point ${Number(selectedZonePointMatch[3]) + 1}`
      : selectedElementId?.includes(':')
        ? `${profileLineLabels[selectedElementId.split(':')[0] as keyof SectionViewProfileGeometry]} point ${Number(selectedElementId.split(':')[1]) + 1}`
        : selectedElementId
          ? editableElementLabels[selectedElementId]
          : 'None selected'
  );
  const useArmourTemplate = sectionView.templateId === 'armour_stone' || sectionView.showArmourStone;
  const useDockTemplate = sectionView.templateId === 'floating_dock_shoreline' || sectionView.showDockReference;
  const showWaterLines = sectionView.showWaterLines ?? true;
  const showGradeProfile = sectionView.showGradeProfile ?? sectionView.showProfileLines ?? true;
  const showLakebedProfile = sectionView.showLakebedProfile ?? sectionView.showProfileLines ?? true;
  const primaryRipRapZone = ripRapZones[0] ?? legacyRipRapZone;
  const dockReferenceLabel = labelText('dock-profile', dimensionLabel(sectionView.dockRampReference?.dockLengthFt, sectionView.dockRampReference?.dockWidthFt, 'Floating Dock'));
  const rampReferenceLabel = labelText('dock-profile-ramp', `${dimensionLabel(sectionView.dockRampReference?.rampLengthFt, sectionView.dockRampReference?.rampWidthFt, 'Access Ramp')} Access Ramp`);

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex min-h-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 p-4">
        <div className="flex h-full w-full items-center justify-center">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            role="img"
            aria-label="Section view permit drawing sheet"
            className="max-h-full max-w-full bg-white shadow-sm"
            style={{ aspectRatio: '11 / 8.5' }}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
            onPointerLeave={handleSvgPointerUp}
          >
            <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#ffffff" />

            <defs>
              <marker id="red-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L9,4.5 L0,9 z" fill={red} />
              </marker>
              <marker id="black-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 z" fill={ink} />
              </marker>
              <pattern id="clear-stone" width="18" height="18" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="5" r="1.2" fill={ink} />
                <circle cx="13" cy="12" r="1" fill={ink} />
                <circle cx="9" cy="3" r="0.9" fill={ink} />
              </pattern>
            </defs>

            <text x="72" y="82" fill={ink} fontSize="24" fontWeight="800">
              {sectionView.title}
            </text>
            <text x="72" y="108" fill={mutedInk} fontSize="12">
              Permit-support visual only - not an engineered stamped drawing
            </text>

            {showWaterLines && (
              <>
                <line x1={drawingLeft} y1={highWaterY} x2={drawingRight} y2={highWaterY} stroke={blue} strokeWidth="1.5" strokeDasharray="8 7" />
                {editableElement(
                  'water-high-label',
                  <text x={drawingRight - 162} y={highWaterY - 12} fill={blue} fontSize="12">
                    {labelText('water-high-label', 'HIGH WATER LEVEL')}
                  </text>,
                  drawingRight - 162,
                  highWaterY - 20,
                )}
                <line x1={drawingLeft} y1={lowWaterY} x2={drawingRight} y2={lowWaterY} stroke={blue} strokeWidth="1.3" strokeDasharray="8 8" />
                {editableElement(
                  'water-low-label',
                  <text x={drawingRight - 158} y={lowWaterY + 22} fill={blue} fontSize="12">
                    {labelText('water-low-label', 'LOW WATER LEVEL')}
                  </text>,
                  drawingRight - 158,
                  lowWaterY + 14,
                )}
              </>
            )}

            {showGradeProfile &&
              selectableTemplateElement(
                'grade-profile',
                <>
                  <polyline points={pointsToPolyline(profileGeometry.gradePoints)} fill="none" stroke="#ffffff" strokeWidth="16" opacity="0.01" />
                  <polyline points={pointsToPolyline(profileGeometry.gradePoints)} fill="none" stroke={ink} strokeWidth="2" pointerEvents="none" />
                </>,
              )}
            {showLakebedProfile &&
              selectableTemplateElement(
                'lakebed-profile',
                <>
                  <polyline points={pointsToPolyline(profileGeometry.lakebedPoints)} fill="none" stroke="#ffffff" strokeWidth="16" opacity="0.01" />
                  <polyline points={pointsToPolyline(profileGeometry.lakebedPoints)} fill="none" stroke={ink} strokeWidth="1.8" pointerEvents="none" />
                </>,
              )}

            {sectionView.showRipRap && !useArmourTemplate &&
              ripRapZones.map((zone) => {
                const zoneBounds = pointBounds([...zone.topPoints, ...zone.bottomPoints]);
                const clipId = `rip-rap-zone-clip-${zone.id}`;
                return editableElement(
                  `riprap-zone:${zone.id}`,
                  <g>
                    <rect
                      x={zoneBounds.minX - 18}
                      y={zoneBounds.minY - 18}
                      width={zoneBounds.maxX - zoneBounds.minX + 36}
                      height={zoneBounds.maxY - zoneBounds.minY + 36}
                      fill="#ffffff"
                      opacity="0.01"
                    />
                    <g>
                      <clipPath id={clipId}>
                        <polygon points={ripRapBoundaryPoints(zone.topPoints, zone.bottomPoints)} />
                      </clipPath>
                      <path
                        d={`${pointsToPath(zone.topPoints)} L ${zone.bottomPoints
                          .slice()
                          .reverse()
                          .map((point) => `${point.x} ${point.y}`)
                          .join(' L ')} Z`}
                        fill="#ffffff"
                        opacity="0.12"
                        stroke={ink}
                        strokeWidth="0.8"
                      />
                      <g clipPath={`url(#${clipId})`}>{ripRapStoneField(zone, zone.topPoints, zone.bottomPoints)}</g>
                      {zone.showFilterLayer && (
                        <>
                          <path
                            d={pointsToPath(zone.bottomPoints)}
                            fill="none"
                            stroke={ink}
                            strokeWidth="1"
                            strokeDasharray="5 5"
                          />
                          <text x={zone.bottomPoints[1]?.x ?? zone.x + zone.length * 0.36} y={(zone.bottomPoints[1]?.y ?? zone.y + zone.depth) + 34} fill={mutedInk} fontSize="10">
                            CLEAR STONE / FILTER LAYER
                          </text>
                          <line x1={zone.bottomPoints[0]?.x ?? zone.x} y1={(zone.bottomPoints[0]?.y ?? zone.y + zone.depth) + 24} x2={zone.bottomPoints[1]?.x ?? zone.x + zone.length * 0.35} y2={(zone.bottomPoints[1]?.y ?? zone.y + zone.depth) + 34} stroke={ink} strokeWidth="5" strokeLinecap="round" />
                          <line
                            x1={zone.bottomPoints[0]?.x ?? zone.x}
                            y1={(zone.bottomPoints[0]?.y ?? zone.y + zone.depth) + 24}
                            x2={zone.bottomPoints[1]?.x ?? zone.x + zone.length * 0.35}
                            y2={(zone.bottomPoints[1]?.y ?? zone.y + zone.depth) + 34}
                            stroke="#ffffff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="3 5"
                          />
                        </>
                      )}
                    </g>
                  </g>,
                  zone.x,
                  zone.y - 12,
                );
              })}

            {sectionView.showArmourStone && armourRows > 0 &&
              editableElement(
                'armour-group',
                <g>
                <rect x="485" y={highWaterY - 58 - armourRows * 30} width="220" height={150 + armourRows * 30} fill="#ffffff" opacity="0.01" />
                <polygon
                  points={`500,${highWaterY - 8} 686,${highWaterY - 8} 686,${highWaterY + 68 + armourRows * 7} 500,${highWaterY + 68 + armourRows * 7}`}
                  fill="url(#clear-stone)"
                  stroke={ink}
                  strokeWidth="1"
                />
                {Array.from({ length: armourRows }, (_, row) =>
                  Array.from({ length: 2 }, (_, column) => (
                    <rect
                      key={`${row}-${column}`}
                      x={530 + column * 78 + (row % 2) * 19}
                      y={highWaterY - 42 - row * 30}
                      width="76"
                      height="26"
                      fill="#ffffff"
                      stroke={ink}
                      strokeWidth="1.4"
                    />
                  )),
                )}
                </g>,
                500,
                highWaterY - 56,
              )}

            {useDockTemplate && buildPlanProjection &&
              editableElement(
                'build-plan-projection',
                projectedBuildPlanSection(highWaterY, buildPlanProjection),
                170,
                highWaterY - 116,
              )}

            {useDockTemplate && !buildPlanProjection &&
              editableElement(
                'dock-profile',
                dockRampProfile(highWaterY, sectionView.dockRampReference, dockReferenceLabel, rampReferenceLabel),
                500,
                highWaterY - 118,
              )}

            {sectionView.showDimensions && (
              <g stroke={ink} strokeWidth="1.2" fill="none">
                {editableElement(
                  'dimension-bank',
                  <>
                    <line x1="92" y1={gradeStartY} x2="92" y2={highWaterY} markerStart="url(#black-arrow)" markerEnd="url(#black-arrow)" />
                    <text x="55" y={(gradeStartY + highWaterY) / 2} fill={ink} stroke="none" fontSize="11">
                      {labelText('dimension-bank', `BANK ${sectionHeight.toFixed(1)} ft`)}
                    </text>
                  </>,
                  92,
                  (gradeStartY + highWaterY) / 2 - 20,
                )}
                {editableElement(
                  'dimension-drop',
                  <>
                    <line x1="958" y1={lowWaterY} x2="958" y2={lakebedEndY - 70} markerStart="url(#black-arrow)" markerEnd="url(#black-arrow)" />
                    <text x="888" y={(lowWaterY + lakebedEndY - 70) / 2} fill={ink} stroke="none" fontSize="11">
                      {labelText('dimension-drop', `DROP ${lakebedDrop.toFixed(1)} ft`)}
                    </text>
                  </>,
                  958,
                  (lowWaterY + lakebedEndY - 70) / 2 - 20,
                )}
              </g>
            )}

            {showGradeProfile && editableElement('callout-grade', callout(labelText('callout-grade', 'EXISTING GRADE'), 126, 176, 285, gradeStartY + 18, 'grade'), 126, 164)}
            {showLakebedProfile && editableElement('callout-lakebed', callout(labelText('callout-lakebed', 'LAKEBED PROFILE'), 710, 488, 625, lakebedEndY - 44, 'lakebed'), 710, 476)}
            {sectionView.showRipRap && !useArmourTemplate &&
              editableElement('callout-riprap', callout(labelText('callout-riprap', 'BOULDERS / RIP RAP'), 612, 522, 265, ripRapBottom + 12, 'riprap'), 612, 510)}
            {sectionView.showRipRap && !useArmourTemplate && primaryRipRapZone.showFilterLayer &&
              editableElement('callout-pipe', callout(labelText('callout-pipe', 'FILTER LAYER'), 156, 496, 252, ripRapBottom + 35, 'pipe'), 156, 484)}
            {useArmourTemplate &&
              editableElement('callout-armour', callout(labelText('callout-armour', 'ARMOUR STONE WALL'), 736, 238, 632, highWaterY - 46, 'armour'), 736, 226)}
            {useArmourTemplate &&
              editableElement('callout-clear-stone', callout(labelText('callout-clear-stone', 'CLEAR STONE BASE'), 724, 454, 616, highWaterY + 76, 'clear-stone'), 724, 442)}
            {useDockTemplate && !buildPlanProjection && editableElement('callout-ramp', callout(labelText('callout-ramp', rampReferenceLabel.toUpperCase()), 486, 178, 535, highWaterY - 62, 'ramp'), 486, 166)}
            {useDockTemplate && !buildPlanProjection &&
              editableElement('callout-dock', callout(labelText('callout-dock', `FLOATING DOCK ${feetLabel(sectionView.dockRampReference?.dockLengthFt, '')}`.trim()), 786, 202, 716, highWaterY - 56, 'dock'), 786, 190)}

            {!buildPlanProjection && buildPlanReferences.length > 0 &&
              editableElement('build-plan-context', buildPlanContextGroup(buildPlanReferences), 88, 494)}

            {editableElement(
              'notes',
              <text x="72" y="742" fill={mutedInk} fontSize="11">
                {sectionView.notes}
              </text>,
              72,
              728,
            )}
            {editableElement('title-block', titleBlock(projectName, sectionView.title, drawingDate, sectionView.titleBlock, drawingInfo), 728, 646)}
            {customItems.map((item) =>
              editableElement(
                `custom:${item.id}`,
                renderCustomItem(item),
                item.x,
                item.y - 12,
              ),
            )}
            {showGradeProfile && profilePointHandles('gradePoints', profileGeometry.gradePoints)}
            {showLakebedProfile && profilePointHandles('lakebedPoints', profileGeometry.lakebedPoints)}
            {sectionView.showRipRap && !useArmourTemplate && ripRapZones.map((zone) => ripRapZonePointHandles(zone))}
          </svg>
        </div>
      </section>

      <aside className="min-h-0 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section View</p>
            <p className="mt-1 text-sm text-slate-700">Permit sheet layout.</p>
          </div>
          <button
            type="button"
            onClick={handleExportPng}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Export PNG
          </button>
        </div>

        <button
          type="button"
          onClick={onGenerateFromBuildPlan}
          className="mt-4 min-h-11 w-full rounded-md border border-brand-600 bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {buildPlanSummary ? 'Refresh from Build Plan' : 'Generate from Build Plan'}
        </button>

        <div className="mt-4 space-y-4">
          {controlGroup(
            'Build Plan Data',
            buildPlanSummary ? (
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">{buildPlanSummary.scaleLabel}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                    {buildPlanSummary.hasProjectScale ? 'Scaled' : 'Approx'}
                  </span>
                </div>
                <ul className="space-y-1">
                  {buildPlanSummary.detectedItems.slice(0, 12).map((item) => (
                    <li key={item} className="rounded bg-slate-50 px-2 py-1">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No Build Plan data imported yet.</p>
            ),
          )}

          {controlGroup(
            'Add Custom Item',
            <div className="grid grid-cols-1 gap-2">
              {customItemTypes.map((itemType) => (
                <button
                  key={itemType.type}
                  type="button"
                  onClick={() => addCustomItem(itemType.type)}
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  {itemType.label}
                </button>
              ))}
            </div>,
          )}

          {controlGroup(
            'Manual Edit Mode',
            <div className="space-y-3">
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                <span>Enable drag editing</span>
                <input
                  type="checkbox"
                  checked={manualEditMode}
                  onChange={(event) => {
                    setManualEditMode(event.target.checked);
                    setSelectedElementId(null);
                    setDragState(null);
                  }}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>
              <div className="rounded-md bg-slate-50 p-2 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected item</p>
                <p className="mt-1">{selectedItemName}</p>
              </div>
              {selectedElementId && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                  {selectedPoint ? (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Point X', value: selectedPoint.x, field: 'x' },
                        { label: 'Point Y', value: selectedPoint.y, field: 'y' },
                      ].map((control) => (
                        <label key={control.field} className="block">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{control.label}</span>
                          <input
                            type="number"
                            step={5}
                            value={control.value}
                            onChange={(event) => {
                              const parsedValue = Number(event.target.value);
                              if (Number.isFinite(parsedValue)) {
                                if (selectedZonePointMatch) {
                                  updateRipRapZonePoint(selectedZonePointMatch[1], selectedZonePointMatch[2] as 'top' | 'bottom', Number(selectedZonePointMatch[3]), {
                                    ...selectedPoint,
                                    [control.field]: parsedValue,
                                  });
                                } else if (selectedPointLine && selectedPointIndex !== undefined) {
                                  updateProfilePoint(selectedPointLine, selectedPointIndex, {
                                    ...selectedPoint,
                                    [control.field]: parsedValue,
                                  });
                                }
                              }
                            }}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <>
                  {selectedCustomItem && (
                    <div className="mb-3 rounded-md border border-slate-200 bg-white p-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Custom Item</p>
                      <label className="mt-2 block">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Item type</span>
                        <select
                          value={selectedCustomItem.type}
                          onChange={(event) => updateCustomItem(selectedCustomItem.id, {
                            type: event.target.value as SectionViewCustomItemType,
                            text: customItemText(selectedCustomItem) || defaultCustomItem(event.target.value as SectionViewCustomItemType).text,
                          })}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                        >
                          {customItemTypes.map((itemType) => (
                            <option key={itemType.type} value={itemType.type}>
                              {itemType.label.replace(/^Add /, '')}
                            </option>
                          ))}
                        </select>
                      </label>
                      {selectedCustomItem.type !== 'line' && selectedCustomItem.type !== 'rectangle' && (
                        <label className="mt-2 block">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Text</span>
                          <input
                            value={customItemText(selectedCustomItem)}
                            onChange={(event) => updateCustomItem(selectedCustomItem.id, { text: event.target.value, label: undefined })}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                          />
                        </label>
                      )}
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[
                          { label: 'X position', value: selectedCustomItem.x, field: 'x', min: 0, max: SVG_WIDTH, step: 5 },
                          { label: 'Y position', value: selectedCustomItem.y, field: 'y', min: 0, max: SVG_HEIGHT, step: 5 },
                          { label: 'Width', value: selectedCustomItem.width ?? 120, field: 'width', min: 0, max: 800, step: 5 },
                          { label: 'Height', value: selectedCustomItem.height ?? 40, field: 'height', min: -400, max: 400, step: 5 },
                          { label: 'Rotation', value: selectedCustomItem.rotation ?? 0, field: 'rotation', min: -180, max: 180, step: 5 },
                        ].map((control) => (
                          <label key={control.field} className="block">
                            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{control.label}</span>
                            <input
                              type="number"
                              min={control.min}
                              max={control.max}
                              step={control.step}
                              value={control.value}
                              onChange={(event) => {
                                const parsedValue = Number(event.target.value);
                                if (Number.isFinite(parsedValue)) {
                                  updateCustomItem(selectedCustomItem.id, {
                                    [control.field]: clampNumber(parsedValue, control.min, control.max),
                                  });
                                }
                              }}
                              className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                            />
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Outline</span>
                          <input
                            type="color"
                            value={selectedCustomItem.strokeColor ?? (selectedCustomItem.type === 'arrow' ? red : ink)}
                            onChange={(event) => updateCustomItem(selectedCustomItem.id, { strokeColor: event.target.value })}
                            className="h-11 w-full rounded-md border border-slate-300 bg-white px-2 py-1"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Fill</span>
                          <input
                            type="color"
                            value={selectedCustomItem.fillColor ?? (selectedCustomItem.type === 'material_area' ? '#f1f5f9' : '#ffffff')}
                            onChange={(event) => updateCustomItem(selectedCustomItem.id, { fillColor: event.target.value })}
                            className="h-11 w-full rounded-md border border-slate-300 bg-white px-2 py-1"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                  {!selectedElementId.startsWith('custom:') && !selectedElementId.startsWith('riprap-zone:') && selectedElementId !== 'title-block' && selectedElementId !== 'notes' && (
                    <label className="mb-2 block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Label text</span>
                      <input
                        value={labelText(selectedElementId, defaultElementText[selectedElementId] ?? editableElementLabels[selectedElementId] ?? '')}
                        onChange={(event) => {
                          updateLabelOverride(selectedElementId, event.target.value);
                        }}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                      />
                    </label>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'X offset', value: selectedX, field: 'x' },
                      { label: 'Y offset', value: selectedY, field: 'y' },
                    ].map((control) => (
                      <label key={control.field} className="block">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{control.label}</span>
                        <input
                          type="number"
                          step={5}
                          value={control.value}
                          onChange={(event) => {
                            const parsedValue = Number(event.target.value);
                            if (Number.isFinite(parsedValue)) {
                              updateManualElementTransform(selectedElementId, { [control.field]: parsedValue });
                            }
                          }}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                        />
                      </label>
                    ))}
                  </div>
                  {selectedCanResize ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        { label: 'Scale width', value: selectedScaleX, field: 'scaleX' },
                        { label: 'Scale height', value: selectedScaleY, field: 'scaleY' },
                      ].map((control) => (
                        <label key={control.field} className="block">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{control.label}</span>
                          <input
                            type="number"
                            min={0.35}
                            max={2.5}
                            step={0.05}
                            value={control.value}
                            onChange={(event) => {
                              const parsedValue = Number(event.target.value);
                              if (Number.isFinite(parsedValue)) {
                                updateManualElementTransform(selectedElementId, {
                                  [control.field]: clampNumber(parsedValue, 0.35, 2.5),
                                });
                              }
                            }}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">This item is move-only for now.</p>
                  )}
                  {selectedRipRapZone && (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rip Rap Zone</p>
                      <label className="mt-2 block">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Layer label</span>
                        <input
                          value={selectedRipRapZone.label}
                          onChange={(event) => updateRipRapZone(selectedRipRapZone.id, (zone) => ({ ...zone, label: event.target.value }))}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                        />
                      </label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[
                          { label: 'Position X', value: selectedRipRapZone.x, field: 'x', min: 0, max: SVG_WIDTH, step: 5 },
                          { label: 'Position Y', value: selectedRipRapZone.y, field: 'y', min: 0, max: SVG_HEIGHT, step: 5 },
                          { label: 'Length', value: selectedRipRapZone.length, field: 'length', min: 80, max: 720, step: 10 },
                          { label: 'Depth', value: selectedRipRapZone.depth, field: 'depth', min: 24, max: 260, step: 5 },
                          { label: 'Slope', value: selectedRipRapZone.slopeDegrees, field: 'slopeDegrees', min: -35, max: 45, step: 1 },
                        ].map((control) => (
                          <label key={control.field} className="block">
                            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{control.label}</span>
                            <input
                              type="number"
                              min={control.min}
                              max={control.max}
                              step={control.step}
                              value={control.value}
                              onChange={(event) => {
                                const parsedValue = Number(event.target.value);
                                if (Number.isFinite(parsedValue)) {
                                  updateRipRapSettings(selectedRipRapZone.id, {
                                    [control.field]: clampNumber(parsedValue, control.min, control.max),
                                  });
                                }
                              }}
                              className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                            />
                          </label>
                        ))}
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Stone Size</span>
                          <select
                            value={closestOptionValue(ripRapStoneSizeOptions, selectedRipRapZone.stoneSize)}
                            onChange={(event) => updateRipRapSettings(selectedRipRapZone.id, { stoneSize: Number(event.target.value) })}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                          >
                            {ripRapStoneSizeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Density</span>
                          <select
                            value={closestOptionValue(ripRapDensityOptions, selectedRipRapZone.density)}
                            onChange={(event) => updateRipRapSettings(selectedRipRapZone.id, { density: Number(event.target.value) })}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                          >
                            {ripRapDensityOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="mt-2 flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                        <span>Show filter layer</span>
                        <input
                          type="checkbox"
                          checked={selectedRipRapZone.showFilterLayer}
                          onChange={(event) => updateRipRapSettings(selectedRipRapZone.id, { showFilterLayer: event.target.checked })}
                          className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </label>
                    </div>
                  )}
                    </>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!selectedElementId || Boolean(selectedPoint)}
                  onClick={duplicateSelectedElement}
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Duplicate selected
                </button>
                <button
                  type="button"
                  disabled={!selectedElementId || Boolean(selectedPoint)}
                  onClick={() => mirrorSelectedElement('horizontal')}
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mirror horizontal
                </button>
                <button
                  type="button"
                  disabled={!selectedElementId || Boolean(selectedPoint)}
                  onClick={() => mirrorSelectedElement('vertical')}
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mirror vertical
                </button>
                <button
                  type="button"
                  disabled={!selectedElementId}
                  onClick={() => selectedElementId && resetElementOffset(selectedElementId)}
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset selected
                </button>
                <button
                  type="button"
                  disabled={!selectedElementId}
                  onClick={hideSelectedElement}
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hide selected
                </button>
                <button
                  type="button"
                  disabled={!selectedElementId || Boolean(selectedPoint)}
                  onClick={deleteSelectedElement}
                  className="min-h-11 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete selected
                </button>
                <button
                  type="button"
                  disabled={hiddenElementIds.length === 0}
                  onClick={showHiddenElements}
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Show hidden
                </button>
                <button
                  type="button"
                  onClick={resetAllManualEdits}
                  className="min-h-11 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  Reset all
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Drag handles appear on the drawing while edit mode is on. Export PNG includes the adjusted layout.
              </p>
            </div>,
          )}

          {controlGroup(
            'Template',
            <div className="grid gap-2">
              {(Object.keys(sectionTemplates) as SectionViewTemplateId[]).map((templateId) => (
                <button
                  key={templateId}
                  type="button"
                  onClick={() => handleTemplateChange(templateId)}
                  className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm ${
                    sectionView.templateId === templateId
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {sectionTemplates[templateId].title}
                </button>
              ))}
            </div>,
          )}

          {controlGroup(
            'Dock / Ramp Reference',
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Source: {sectionView.dockRampReference?.source === 'buildPlan' ? 'Build Plan' : sectionView.dockRampReference?.source === 'manual' ? 'Manual' : 'Default schematic'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Dock length', field: 'dockLengthFt', value: sectionView.dockRampReference?.dockLengthFt },
                  { label: 'Dock width', field: 'dockWidthFt', value: sectionView.dockRampReference?.dockWidthFt },
                  { label: 'Ramp length', field: 'rampLengthFt', value: sectionView.dockRampReference?.rampLengthFt },
                  { label: 'Ramp width', field: 'rampWidthFt', value: sectionView.dockRampReference?.rampWidthFt },
                ].map((control) => (
                  <label key={control.field} className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{control.label}</span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={control.value ?? ''}
                      placeholder="Not set"
                      onChange={(event) => {
                        const parsedValue = Number(event.target.value);
                        if (Number.isFinite(parsedValue)) {
                          updateDockRampReference(control.field as keyof NonNullable<SectionViewData['dockRampReference']>, clampNumber(parsedValue, 0, 200));
                        }
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                ))}
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Ramp type</span>
                <select
                  value={sectionView.dockRampReference?.rampType ?? 'unknown'}
                  onChange={(event) => updateDockRampReference('rampType', event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="unknown">Access ramp</option>
                  <option value="with_rails">Ramp with rails</option>
                  <option value="without_rails">Ramp without rails</option>
                </select>
              </label>
            </div>,
          )}

          {controlGroup(
            'Project / Title Block',
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Sheet title</span>
                <input
                  value={sectionView.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                />
              </label>
              {[
                ['client', 'Client', drawingInfo?.client],
                ['location', 'Location', drawingInfo?.location],
                ['description', 'Description', drawingInfo?.description],
                ['drawingNumber', 'Drawing #', drawingInfo?.drawingNumber],
                ['revision', 'Revision', drawingInfo?.revision],
                ['completedBy', 'Completed by', drawingInfo?.completedBy],
                ['date', 'Date', drawingInfo?.date],
              ].map(([field, label, sharedValue]) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
                  <input
                    value={sectionView.titleBlock?.[field as keyof NonNullable<SectionViewData['titleBlock']>] ?? ''}
                    onChange={(event) => updateTitleBlockField(field as keyof NonNullable<SectionViewData['titleBlock']>, event.target.value)}
                    placeholder={sharedValue || (field === 'client' ? projectName : undefined)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  />
                </label>
              ))}
            </div>,
          )}

          {controlGroup(
            'Site Conditions',
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Build Plan data does not define shoreline, water, stone, or lakebed conditions. Enable these only when they are known for the permit drawing.
              </p>
            </div>,
          )}

          {controlGroup(
            'Water Levels',
            <div className="space-y-3">
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                <span>Show high / low water lines</span>
                <input
                  type="checkbox"
                  checked={showWaterLines}
                  onChange={(event) => updateField('showWaterLines', event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">High water label</span>
                  <input
                    value={labelText('water-high-label', 'HIGH WATER LEVEL')}
                    onChange={(event) => updateLabelOverride('water-high-label', event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Low water label</span>
                  <input
                    value={labelText('water-low-label', 'LOW WATER LEVEL')}
                    onChange={(event) => updateLabelOverride('water-low-label', event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Water line offset</span>
                <input
                  type="number"
                  step={0.25}
                  value={sectionView.waterLevelFt}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateNumberField('waterLevelFt', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                />
              </label>
            </div>,
          )}

          {controlGroup(
            'Shoreline / Lakebed',
            <div className="space-y-3">
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                <span>Show existing grade profile</span>
                <input
                  type="checkbox"
                  checked={showGradeProfile}
                  onChange={(event) => updateProfileVisibility('showGradeProfile', event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                <span>Show lakebed profile</span>
                <input
                  type="checkbox"
                  checked={showLakebedProfile}
                  onChange={(event) => updateProfileVisibility('showLakebedProfile', event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Bank height', field: 'shorelineHeightFt', value: sectionView.shorelineHeightFt },
                  { label: 'Lakebed drop', field: 'lakebedDropFt', value: sectionView.lakebedDropFt },
                ].map((control) => (
                  <label key={control.field} className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{control.label}</span>
                    <input
                      type="number"
                      min={0}
                      step={0.25}
                      value={control.value}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateNumberField(control.field as 'shorelineHeightFt' | 'lakebedDropFt', event.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                ))}
              </div>
            </div>,
          )}

          {controlGroup(
            'Rip Rap',
            <div className="space-y-3">
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                <span>Enable rip rap stone</span>
                <input
                  type="checkbox"
                  checked={sectionView.showRipRap}
                  onChange={(event) => updateField('showRipRap', event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Length', value: primaryRipRapZone.length, field: 'length', min: 60, max: 520, step: 5 },
                  { label: 'Depth', value: primaryRipRapZone.depth, field: 'depth', min: 24, max: 260, step: 5 },
                  { label: 'Slope', value: primaryRipRapZone.slopeDegrees, field: 'slopeDegrees', min: -35, max: 45, step: 1 },
                ].map((control) => (
                  <label key={control.field} className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{control.label}</span>
                    <input
                      type="number"
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={control.value}
                      onChange={(event) => {
                        const parsedValue = Number(event.target.value);
                        if (Number.isFinite(parsedValue)) {
                          updateRipRapSettings(primaryRipRapZone.id, {
                            [control.field]: clampNumber(parsedValue, control.min, control.max),
                          });
                        }
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Stone Size</span>
                  <select
                    value={closestOptionValue(ripRapStoneSizeOptions, primaryRipRapZone.stoneSize)}
                    onChange={(event) => updateRipRapSettings(primaryRipRapZone.id, { stoneSize: Number(event.target.value) })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {ripRapStoneSizeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Density</span>
                  <select
                    value={closestOptionValue(ripRapDensityOptions, primaryRipRapZone.density)}
                    onChange={(event) => updateRipRapSettings(primaryRipRapZone.id, { density: Number(event.target.value) })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {ripRapDensityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                <span>Show filter layer</span>
                <input
                  type="checkbox"
                  checked={primaryRipRapZone.showFilterLayer}
                  onChange={(event) => updateRipRapSettings(primaryRipRapZone.id, { showFilterLayer: event.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>
            </div>,
          )}

          {controlGroup(
            'Armour Stone',
            <div className="space-y-3">
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                <span>Enable armour stone wall</span>
                <input
                  type="checkbox"
                  checked={sectionView.showArmourStone}
                  onChange={(event) => updateField('showArmourStone', event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Stone rows</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={sectionView.armourStoneRows}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateNumberField('armourStoneRows', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Armour stone label</span>
                <input
                  value={labelText('callout-armour', 'ARMOUR STONE WALL')}
                  onChange={(event) => updateLabelOverride('callout-armour', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                />
              </label>
            </div>,
          )}

          {controlGroup(
            'Dock / Ramp Reference',
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
              <span>Show dock and ramp profile</span>
              <input
                type="checkbox"
                checked={sectionView.showDockReference}
                onChange={(event) => updateField('showDockReference', event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>,
          )}

          {controlGroup(
            'Labels / Notes',
            <>
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                <span>Show dimensions</span>
                <input
                  type="checkbox"
                  checked={sectionView.showDimensions}
                  onChange={(event) => updateField('showDimensions', event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Notes</span>
                <textarea
                  value={sectionView.notes ?? ''}
                  onChange={(event) => updateField('notes', event.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                />
              </label>
            </>,
          )}

          {controlGroup(
            'Export',
            <button
              type="button"
              onClick={handleExportPng}
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Export Section PNG
            </button>,
          )}
        </div>
      </aside>
    </div>
  );
}
