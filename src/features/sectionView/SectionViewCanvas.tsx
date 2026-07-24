import type { ChangeEvent, PointerEvent, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { applySectionTemplate, sectionTemplates } from '@/features/sectionView/sectionTemplates';
import type {
  SectionViewData,
  SectionViewCustomItem,
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
  onChange: (sectionView: SectionViewData) => void;
  onGenerateFromBuildPlan: () => void;
}

const SVG_WIDTH = 1100;
const SVG_HEIGHT = 850;
const ink = '#111827';
const mutedInk = '#475569';
const red = '#dc2626';
const blue = '#0f70b7';
const sheetMargin = 42;
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
  'riprap-group': 'Rip rap stone group',
  'armour-group': 'Armour stone group',
  'dock-profile': 'Dock and ramp reference',
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
  gradePoints: 'Existing grade',
  lakebedPoints: 'Lakebed',
  ripRapTopPoints: 'Rip rap top boundary',
  ripRapBottomPoints: 'Rip rap bottom boundary',
};

const resizableElementIds = new Set(['armour-group', 'dock-profile', 'dimension-bank', 'dimension-drop']);

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

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
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

function titleBlock(projectName: string, title: string, drawingDate: string, titleBlock: SectionViewData['titleBlock']) {
  const x = 674;
  const y = 688;
  const width = 384;
  const height = 120;
  const colA = 162;
  const colB = 316;
  const row1 = y + 22;
  const row2 = y + 45;
  const row3 = y + 75;
  const row4 = y + 97;
  const row5 = y + height;
  const valueOrFallback = (value: string | undefined, fallback: string) => value || fallback;
  const truncated = (value: string, maxLength = 30) => (value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value);
  const fieldText = (label: string, value: string, tx: number, ty: number, maxLength = 30) => (
    <text x={tx} y={ty} fill={ink} fontSize="8.2">
      <tspan fill={mutedInk} fontSize="7.2" fontWeight="700">
        {label}:
      </tspan>{' '}
      <tspan fontWeight="600">{truncated(value, maxLength)}</tspan>
    </text>
  );

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#ffffff" stroke={ink} strokeWidth="1.2" />
      {[row1, row2, row3, row4].map((lineY) => (
        <line key={lineY} x1={x} y1={lineY} x2={x + width} y2={lineY} stroke={ink} strokeWidth="0.7" />
      ))}
      <line x1={x + colA} y1={y} x2={x + colA} y2={row5} stroke={ink} strokeWidth="0.7" />
      <line x1={x + colB} y1={y + 75} x2={x + colB} y2={row5} stroke={ink} strokeWidth="0.7" />
      <line x1={x + 82} y1={row2} x2={x + 82} y2={row4} stroke={ink} strokeWidth="0.7" />
      <text x={x + 22} y={row2 + 17} fill={ink} fontSize="14" fontWeight="800">
        Not to
      </text>
      <text x={x + 24} y={row2 + 37} fill={ink} fontSize="14" fontWeight="800">
        Scale
      </text>
      <rect x={x + 94} y={row2 + 12} width="58" height="22" fill="#cf2e2e" stroke="none" />
      <text x={x + 102} y={row2 + 27} fill="#ffffff" fontSize="12" fontStyle="italic" fontWeight="800">
        Kehoe
      </text>
      <text x={x + 94} y={row2 + 45} fill={mutedInk} fontSize="6.2" fontWeight="700">
        MARINE
      </text>
      <text x={x + 124} y={row2 + 45} fill={mutedInk} fontSize="6.2" fontWeight="700">
        CONSTRUCTION
      </text>
      {fieldText('Date', valueOrFallback(titleBlock?.date, drawingDate), x + 6, y + 15, 18)}
      {fieldText('Client', valueOrFallback(titleBlock?.client, projectName || 'Kehoe Dock Planner'), x + colA + 6, y + 15, 28)}
      {fieldText('Location', valueOrFallback(titleBlock?.location, 'Site visit / permit support'), x + colA + 6, row1 + 15, 28)}
      {fieldText('Description', valueOrFallback(titleBlock?.description, title), x + colA + 6, row2 + 18, 32)}
      {fieldText('Drawing #', valueOrFallback(titleBlock?.drawingNumber, 'SV-1'), x + colA + 6, row3 + 15, 20)}
      {fieldText('Rev', valueOrFallback(titleBlock?.revision, 'A'), x + colB + 8, row3 + 15, 6)}
      {fieldText('Completed By', valueOrFallback(titleBlock?.completedBy, 'Kehoe Marine'), x + 6, row4 + 15, 24)}
    </g>
  );
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

function controlGroup(title: string, children: ReactNode) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function SectionViewCanvas({ sectionView, projectName, onChange, onGenerateFromBuildPlan }: SectionViewCanvasProps) {
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
    setDragState({
      elementId,
      startPoint,
      startOffset: {
        x: dragZone ? dragZone.x : manualElementTransforms[elementId]?.x ?? manualElementOffsets[elementId]?.x ?? 0,
        y: dragZone ? dragZone.y : manualElementTransforms[elementId]?.y ?? manualElementOffsets[elementId]?.y ?? 0,
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

    updateManualElementOffset(dragState.elementId, {
      x: nextX,
      y: nextY,
    });
  };

  const handleSvgPointerUp = () => {
    setDragState(null);
    setPointDragState(null);
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
          <g pointerEvents="all">
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

    return (
      <g>
        {points.map((point, index) => {
          const elementId = `${lineId}:${index}`;
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
    if (!manualEditMode) {
      return null;
    }

    return (
      <g>
        {(['top', 'bottom'] as const).flatMap((boundary) =>
          zone[boundary === 'top' ? 'topPoints' : 'bottomPoints'].map((point, index) => {
            const elementId = `ripRapZone:${zone.id}:${boundary}:${index}`;
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
    const duplicateLabel = sourceCustom?.label ?? labelText(selectedElementId, defaultElementText[selectedElementId] ?? editableElementLabels[selectedElementId] ?? 'Custom label');
    const sourceTransform = {
      ...(manualElementOffsets[selectedElementId] ?? {}),
      ...(manualElementTransforms[selectedElementId] ?? {}),
    };
    const duplicateItem: SectionViewCustomItem = {
      id: duplicateCustomId,
      type: 'label',
      label: `${duplicateLabel} copy`,
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

    const serializedSvg = new XMLSerializer().serializeToString(svgElement);
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
  const selectedCustomName = selectedElementId?.startsWith('custom:')
    ? customItems.find((item) => `custom:${item.id}` === selectedElementId)?.label
    : undefined;
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
            <rect x={sheetMargin} y={sheetMargin} width={SVG_WIDTH - sheetMargin * 2} height={SVG_HEIGHT - sheetMargin * 2} fill="none" stroke={ink} strokeWidth="1.2" />

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

            <polyline points={pointsToPolyline(profileGeometry.gradePoints)} fill="none" stroke={ink} strokeWidth="2" />
            <polyline points={pointsToPolyline(profileGeometry.lakebedPoints)} fill="none" stroke={ink} strokeWidth="1.8" />

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

            {useDockTemplate &&
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

            {editableElement('callout-grade', callout(labelText('callout-grade', 'EXISTING GRADE'), 126, 176, 285, gradeStartY + 18, 'grade'), 126, 164)}
            {editableElement('callout-lakebed', callout(labelText('callout-lakebed', 'LAKEBED PROFILE'), 710, 488, 625, lakebedEndY - 44, 'lakebed'), 710, 476)}
            {sectionView.showRipRap && !useArmourTemplate &&
              editableElement('callout-riprap', callout(labelText('callout-riprap', 'BOULDERS / RIP RAP'), 612, 522, 265, ripRapBottom + 12, 'riprap'), 612, 510)}
            {sectionView.showRipRap && !useArmourTemplate &&
              editableElement('callout-pipe', callout(labelText('callout-pipe', 'FILTER LAYER'), 156, 496, 252, ripRapBottom + 35, 'pipe'), 156, 484)}
            {useArmourTemplate &&
              editableElement('callout-armour', callout(labelText('callout-armour', 'ARMOUR STONE WALL'), 736, 238, 632, highWaterY - 46, 'armour'), 736, 226)}
            {useArmourTemplate &&
              editableElement('callout-clear-stone', callout(labelText('callout-clear-stone', 'CLEAR STONE BASE'), 724, 454, 616, highWaterY + 76, 'clear-stone'), 724, 442)}
            {useDockTemplate && editableElement('callout-ramp', callout(labelText('callout-ramp', rampReferenceLabel.toUpperCase()), 486, 178, 535, highWaterY - 62, 'ramp'), 486, 166)}
            {useDockTemplate &&
              editableElement('callout-dock', callout(labelText('callout-dock', `FLOATING DOCK ${feetLabel(sectionView.dockRampReference?.dockLengthFt, '')}`.trim()), 786, 202, 716, highWaterY - 56, 'dock'), 786, 190)}

            {editableElement(
              'notes',
              <text x="72" y="742" fill={mutedInk} fontSize="11">
                {sectionView.notes}
              </text>,
              72,
              728,
            )}
            {editableElement('title-block', titleBlock(projectName, sectionView.title, drawingDate, sectionView.titleBlock), 728, 646)}
            {customItems.map((item) =>
              editableElement(
                `custom:${item.id}`,
                <text x={item.x} y={item.y} fill={red} fontSize="13" fontWeight="700">
                  {item.label}
                </text>,
                item.x,
                item.y - 12,
              ),
            )}
            {profilePointHandles('gradePoints', profileGeometry.gradePoints)}
            {profilePointHandles('lakebedPoints', profileGeometry.lakebedPoints)}
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
                  {!selectedElementId.startsWith('riprap-zone:') && selectedElementId !== 'title-block' && selectedElementId !== 'notes' && (
                    <label className="mb-2 block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Label text</span>
                      <input
                        value={selectedElementId.startsWith('custom:')
                          ? customItems.find((item) => `custom:${item.id}` === selectedElementId)?.label ?? ''
                          : labelText(selectedElementId, defaultElementText[selectedElementId] ?? editableElementLabels[selectedElementId] ?? '')}
                        onChange={(event) => {
                          const customMatch = selectedElementId.match(/^custom:(.+)$/);
                          if (customMatch) {
                            updateField('customItems', customItems.map((item) => item.id === customMatch[1] ? { ...item, label: event.target.value } : item));
                            return;
                          }
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
                ['client', 'Client'],
                ['location', 'Location'],
                ['description', 'Description'],
                ['drawingNumber', 'Drawing #'],
                ['revision', 'Revision'],
                ['completedBy', 'Completed by'],
                ['date', 'Date'],
              ].map(([field, label]) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
                  <input
                    value={sectionView.titleBlock?.[field as keyof NonNullable<SectionViewData['titleBlock']>] ?? ''}
                    onChange={(event) => updateTitleBlockField(field as keyof NonNullable<SectionViewData['titleBlock']>, event.target.value)}
                    placeholder={field === 'client' ? projectName : undefined}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  />
                </label>
              ))}
            </div>,
          )}

          {controlGroup(
            'Water Levels',
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Water line offset</span>
              <input
                type="number"
                step={0.25}
                value={sectionView.waterLevelFt}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateNumberField('waterLevelFt', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
            </label>,
          )}

          {controlGroup(
            'Shoreline / Lakebed',
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
            </div>,
          )}

          {controlGroup(
            'Materials',
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Rip rap depth', field: 'ripRapDepthFt', value: sectionView.ripRapDepthFt },
                  { label: 'Stone rows', field: 'armourStoneRows', value: sectionView.armourStoneRows },
                ].map((control) => (
                  <label key={control.field} className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{control.label}</span>
                    <input
                      type="number"
                      min={0}
                      step={control.field === 'armourStoneRows' ? 1 : 0.25}
                      value={control.value}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateNumberField(control.field as 'ripRapDepthFt' | 'armourStoneRows', event.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                ))}
              </div>
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                <span>Show rip rap stone</span>
                <input
                  type="checkbox"
                  checked={sectionView.showRipRap}
                  onChange={(event) => updateField('showRipRap', event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                <span>Show armour stone wall</span>
                <input
                  type="checkbox"
                  checked={sectionView.showArmourStone}
                  onChange={(event) => updateField('showArmourStone', event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
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
