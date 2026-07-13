import type { ChangeEvent, PointerEvent, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { applySectionTemplate, sectionTemplates } from '@/features/sectionView/sectionTemplates';
import type {
  SectionViewData,
  SectionViewManualOffset,
  SectionViewManualTransform,
  SectionViewRipRapSettings,
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
  x: 238,
  y: 274,
  length: 352,
  depth: 92,
  slopeDegrees: 15,
  stoneSize: 16,
  density: 1.05,
  showFilterLayer: true,
};

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

const resizableElementIds = new Set(['riprap-group', 'armour-group', 'dock-profile', 'dimension-bank', 'dimension-drop']);

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

function ripRapStoneField(settings: SectionViewRipRapSettings) {
  const spacing = Math.max(10, settings.stoneSize * 1.18);
  const columns = Math.max(4, Math.ceil(settings.length / spacing));
  const rows = Math.max(2, Math.ceil(settings.depth / spacing));
  const stones = Math.max(8, Math.round(columns * rows * clampNumber(settings.density, 0.25, 2)));

  return Array.from({ length: stones }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns) % rows;
    const jitterX = (hashUnit(index + 3) - 0.5) * spacing * 0.62;
    const jitterY = (hashUnit(index + 17) - 0.5) * spacing * 0.62;
    const x = Math.min(settings.length - settings.stoneSize * 0.55, Math.max(settings.stoneSize * 0.55, column * spacing + spacing * 0.5 + jitterX));
    const y = Math.min(settings.depth - settings.stoneSize * 0.55, Math.max(settings.stoneSize * 0.55, row * spacing + spacing * 0.5 + jitterY));
    const size = settings.stoneSize * (0.72 + hashUnit(index + 31) * 0.7);
    const pointCount = 5 + Math.floor(hashUnit(index + 43) * 3);
    const points = Array.from({ length: pointCount }, (_, pointIndex) => {
      const angle = (Math.PI * 2 * pointIndex) / pointCount;
      const radius = size * (0.62 + hashUnit(index * 11 + pointIndex + 59) * 0.48);
      return `${(x + Math.cos(angle) * radius).toFixed(1)},${(y + Math.sin(angle) * radius).toFixed(1)}`;
    }).join(' ');

    return (
      <polygon
        key={index}
        points={points}
        fill={index % 3 === 0 ? '#cbd5e1' : '#e5e7eb'}
        stroke={ink}
        strokeWidth="1"
      />
    );
  });
}

function titleBlock(projectName: string, title: string, drawingDate: string) {
  const x = 728;
  const y = 658;
  const rowHeight = 20;
  const rows = [
    ['CLIENT', projectName || 'Kehoe Dock Planner'],
    ['LOCATION', 'Site visit / permit support'],
    ['DESCRIPTION', title],
    ['DRAWING #', 'SV-1'],
    ['REV', 'A'],
    ['COMPLETED BY', 'Kehoe Marine'],
    ['DATE', drawingDate],
    ['SCALE', 'NOT TO SCALE'],
  ];

  return (
    <g>
      <rect x={x} y={y} width="330" height="164" fill="#ffffff" stroke={ink} strokeWidth="1.5" />
      <rect x={x} y={y} width="330" height="28" fill="#ffffff" stroke={ink} strokeWidth="1.2" />
      <text x={x + 10} y={y + 19} fill={ink} fontSize="14" fontWeight="800">
        KEHOE SECTION VIEW
      </text>
      <text x={x + 236} y={y + 19} fill={ink} fontSize="11" fontWeight="800">
        NOT TO SCALE
      </text>
      {rows.map(([label, value], index) => {
        const rowY = y + 28 + index * rowHeight;
        return (
          <g key={label}>
            <line x1={x} y1={rowY} x2={x + 330} y2={rowY} stroke={ink} strokeWidth="0.7" />
            <line x1={x + 92} y1={rowY} x2={x + 92} y2={rowY + rowHeight} stroke={ink} strokeWidth="0.7" />
            <text x={x + 8} y={rowY + 14} fill={mutedInk} fontSize="9" fontWeight="700">
              {label}
            </text>
            <text x={x + 102} y={rowY + 14} fill={ink} fontSize="10">
              {value.length > 35 ? `${value.slice(0, 32)}...` : value}
            </text>
          </g>
        );
      })}
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
  } | null>(null);
  const buildPlanSummary = sectionView.buildPlanSummary;
  const drawingDate = useMemo(() => formatDate(new Date()), []);
  const manualElementOffsets = sectionView.manualElementOffsets ?? {};
  const manualElementTransforms = sectionView.manualElementTransforms ?? {};
  const hiddenElementIds = sectionView.hiddenElements ?? [];
  const hiddenElementSet = useMemo(() => new Set(hiddenElementIds), [hiddenElementIds]);
  const selectedTransform = selectedElementId ? manualElementTransforms[selectedElementId] : undefined;
  const selectedOffset = selectedElementId ? manualElementOffsets[selectedElementId] : undefined;
  const selectedX = selectedTransform?.x ?? selectedOffset?.x ?? 0;
  const selectedY = selectedTransform?.y ?? selectedOffset?.y ?? 0;
  const selectedScaleX = selectedTransform?.scaleX ?? 1;
  const selectedScaleY = selectedTransform?.scaleY ?? 1;
  const selectedCanResize = Boolean(selectedElementId && resizableElementIds.has(selectedElementId));

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

  const updateRipRapSettings = (settings: Partial<SectionViewRipRapSettings>) => {
    updateField('ripRapSettings', {
      ...ripRapSettings,
      ...settings,
    });
  };

  const resetElementOffset = (elementId: string) => {
    const nextOffsets = { ...manualElementOffsets };
    const nextTransforms = { ...manualElementTransforms };
    delete nextOffsets[elementId];
    delete nextTransforms[elementId];
    onChange({
      ...sectionView,
      manualElementOffsets: nextOffsets,
      manualElementTransforms: nextTransforms,
      ripRapSettings: elementId === 'riprap-group' ? undefined : sectionView.ripRapSettings,
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
    setDragState({
      elementId,
      startPoint,
      startOffset: {
        x: manualElementTransforms[elementId]?.x ?? manualElementOffsets[elementId]?.x ?? 0,
        y: manualElementTransforms[elementId]?.y ?? manualElementOffsets[elementId]?.y ?? 0,
      },
    });
  };

  const handleSvgPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!manualEditMode || !dragState) {
      return;
    }

    const point = getSvgPoint(event);
    if (!point) {
      return;
    }

    updateManualElementOffset(dragState.elementId, {
      x: dragState.startOffset.x + point.x - dragState.startPoint.x,
      y: dragState.startOffset.y + point.y - dragState.startPoint.y,
    });
  };

  const handleSvgPointerUp = () => {
    setDragState(null);
  };

  const editableElement = (elementId: string, children: ReactNode, handleX: number, handleY: number) => {
    if (hiddenElementSet.has(elementId)) {
      return null;
    }

    const transform = {
      ...(manualElementOffsets[elementId] ?? {}),
      ...(manualElementTransforms[elementId] ?? {}),
    };
    const offset = {
      x: transform.x ?? 0,
      y: transform.y ?? 0,
    };
    const scaleX = transform.scaleX ?? 1;
    const scaleY = transform.scaleY ?? 1;
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
                {editableElementLabels[elementId]}
              </text>
            )}
          </g>
        )}
      </g>
    );
  };

  const hideSelectedElement = () => {
    if (!selectedElementId || hiddenElementSet.has(selectedElementId)) {
      return;
    }

    updateField('hiddenElements', Array.from(new Set([...hiddenElementIds, selectedElementId])));
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
      hiddenElements: [],
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
  const useArmourTemplate = sectionView.templateId === 'armour_stone' || sectionView.showArmourStone;
  const useDockTemplate = sectionView.templateId === 'floating_dock_shoreline' || sectionView.showDockReference;

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

            <line x1={drawingLeft} y1={highWaterY} x2={drawingRight} y2={highWaterY} stroke={blue} strokeWidth="1.8" />
            {editableElement(
              'water-high-label',
              <text x={drawingLeft + 8} y={highWaterY - 10} fill={blue} fontSize="12" fontWeight="700">
                HIGH WATER LEVEL
              </text>,
              drawingLeft + 8,
              highWaterY - 18,
            )}
            <line x1={drawingLeft} y1={lowWaterY} x2={drawingRight} y2={lowWaterY} stroke={blue} strokeWidth="1.4" strokeDasharray="10 7" />
            {editableElement(
              'water-low-label',
              <text x={drawingLeft + 8} y={lowWaterY + 18} fill={blue} fontSize="12" fontWeight="700">
                LOW WATER LEVEL
              </text>,
              drawingLeft + 8,
              lowWaterY + 10,
            )}

            <polyline
              points={`120,${gradeStartY} 250,${gradeStartY + 12} 390,${gradeMidY} 540,${shorelineToeY}`}
              fill="none"
              stroke={ink}
              strokeWidth="2"
            />
            <polyline
              points={`120,${lakebedEndY + 30} 355,${lakebedEndY + 4} 630,${lakebedEndY - 46} 990,${lakebedEndY - 70}`}
              fill="none"
              stroke={ink}
              strokeWidth="1.8"
            />

            {sectionView.showRipRap && !useArmourTemplate &&
              editableElement(
                'riprap-group',
                <g>
                <rect
                  x={ripRapSettings.x - 12}
                  y={ripRapSettings.y - 16}
                  width={ripRapSettings.length + 30}
                  height={ripRapSettings.depth + 54}
                  fill="#ffffff"
                  opacity="0.01"
                  transform={`rotate(${ripRapSettings.slopeDegrees} ${ripRapSettings.x} ${ripRapSettings.y})`}
                />
                <g transform={`translate(${ripRapSettings.x} ${ripRapSettings.y}) rotate(${ripRapSettings.slopeDegrees})`}>
                  <clipPath id="rip-rap-zone-clip">
                    <polygon points={`0,0 ${ripRapSettings.length},0 ${ripRapSettings.length},${ripRapSettings.depth} 0,${ripRapSettings.depth}`} />
                  </clipPath>
                  <polygon
                    points={`0,0 ${ripRapSettings.length},0 ${ripRapSettings.length},${ripRapSettings.depth} 0,${ripRapSettings.depth}`}
                    fill="#f8fafc"
                    stroke={ink}
                    strokeWidth="1.2"
                  />
                  <g clipPath="url(#rip-rap-zone-clip)">{ripRapStoneField(ripRapSettings)}</g>
                  {ripRapSettings.showFilterLayer && (
                    <>
                      <path
                        d={`M0 ${ripRapSettings.depth + 18} C${ripRapSettings.length * 0.28} ${ripRapSettings.depth + 30}, ${ripRapSettings.length * 0.62} ${ripRapSettings.depth + 32}, ${ripRapSettings.length} ${ripRapSettings.depth + 18}`}
                        fill="none"
                        stroke={ink}
                        strokeWidth="1"
                        strokeDasharray="5 5"
                      />
                      <text x={ripRapSettings.length * 0.36} y={ripRapSettings.depth + 42} fill={ink} fontSize="11" fontWeight="700">
                        CLEAR STONE / FILTER LAYER
                      </text>
                      <line x1={ripRapSettings.length * 0.22} y1={ripRapSettings.depth + 30} x2={ripRapSettings.length * 0.46} y2={ripRapSettings.depth + 42} stroke={ink} strokeWidth="5" strokeLinecap="round" />
                      <line
                        x1={ripRapSettings.length * 0.22}
                        y1={ripRapSettings.depth + 30}
                        x2={ripRapSettings.length * 0.46}
                        y2={ripRapSettings.depth + 42}
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="3 5"
                      />
                    </>
                  )}
                </g>
                </g>,
                ripRapSettings.x,
                ripRapSettings.y - 12,
              )}

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
                <g stroke={ink} fill="none">
                <rect x="455" y={highWaterY - 96} width="380" height="100" fill="#ffffff" opacity="0.01" stroke="none" />
                <line x1="470" y1={highWaterY - 76} x2="620" y2={highWaterY - 47} strokeWidth="2.2" />
                <line x1="470" y1={highWaterY - 68} x2="620" y2={highWaterY - 39} strokeWidth="1.1" />
                <line x1="472" y1={highWaterY - 78} x2="472" y2={highWaterY - 58} strokeWidth="1.1" />
                <rect x="628" y={highWaterY - 58} width="186" height="16" strokeWidth="1.8" />
                <line x1="646" y1={highWaterY - 42} x2="794" y2={highWaterY - 42} strokeWidth="1.1" />
                <ellipse cx="688" cy={highWaterY - 23} rx="42" ry="12" strokeWidth="1.3" />
                <ellipse cx="764" cy={highWaterY - 23} rx="42" ry="12" strokeWidth="1.3" />
                </g>,
                470,
                highWaterY - 86,
              )}

            {sectionView.showDimensions && (
              <g stroke={ink} strokeWidth="1.2" fill="none">
                {editableElement(
                  'dimension-bank',
                  <>
                    <line x1="92" y1={gradeStartY} x2="92" y2={highWaterY} markerStart="url(#black-arrow)" markerEnd="url(#black-arrow)" />
                    <text x="55" y={(gradeStartY + highWaterY) / 2} fill={ink} stroke="none" fontSize="11">
                      BANK {sectionHeight.toFixed(1)} ft
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
                      DROP {lakebedDrop.toFixed(1)} ft
                    </text>
                  </>,
                  958,
                  (lowWaterY + lakebedEndY - 70) / 2 - 20,
                )}
              </g>
            )}

            {editableElement('callout-grade', callout('EXISTING GRADE', 136, 150, 282, gradeStartY + 15, 'grade'), 136, 138)}
            {editableElement('callout-lakebed', callout('LAKEBED PROFILE', 132, 592, 390, lakebedEndY, 'lakebed'), 132, 580)}
            {sectionView.showRipRap && !useArmourTemplate &&
              editableElement('callout-riprap', callout('RIP RAP STONE', 620, 236, 454, ripRapTop + 76, 'riprap'), 620, 224)}
            {sectionView.showRipRap && !useArmourTemplate &&
              editableElement('callout-pipe', callout('PERFORATED PIPE', 208, 530, 360, ripRapBottom + 65, 'pipe'), 208, 518)}
            {useArmourTemplate &&
              editableElement('callout-armour', callout('ARMOUR STONE WALL', 736, 238, 632, highWaterY - 46, 'armour'), 736, 226)}
            {useArmourTemplate &&
              editableElement('callout-clear-stone', callout('CLEAR STONE BASE', 724, 454, 616, highWaterY + 76, 'clear-stone'), 724, 442)}
            {useDockTemplate && editableElement('callout-ramp', callout('ACCESS RAMP', 486, 178, 535, highWaterY - 62, 'ramp'), 486, 166)}
            {useDockTemplate &&
              editableElement('callout-dock', callout('FLOATING DOCK', 786, 202, 716, highWaterY - 56, 'dock'), 786, 190)}

            {editableElement(
              'notes',
              <text x="72" y="742" fill={mutedInk} fontSize="11">
                {sectionView.notes}
              </text>,
              72,
              728,
            )}
            {editableElement('title-block', titleBlock(projectName, sectionView.title, drawingDate), 728, 646)}
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
                  {buildPlanSummary.detectedItems.slice(0, 4).map((item) => (
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
                <p className="mt-1">{selectedElementId ? editableElementLabels[selectedElementId] : 'None selected'}</p>
              </div>
              {selectedElementId && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
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
                  {selectedElementId === 'riprap-group' && (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rip Rap Zone</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[
                          { label: 'Position X', value: ripRapSettings.x, field: 'x', min: 0, max: SVG_WIDTH, step: 5 },
                          { label: 'Position Y', value: ripRapSettings.y, field: 'y', min: 0, max: SVG_HEIGHT, step: 5 },
                          { label: 'Length', value: ripRapSettings.length, field: 'length', min: 80, max: 720, step: 10 },
                          { label: 'Depth', value: ripRapSettings.depth, field: 'depth', min: 24, max: 260, step: 5 },
                          { label: 'Slope', value: ripRapSettings.slopeDegrees, field: 'slopeDegrees', min: -35, max: 45, step: 1 },
                          { label: 'Stone size', value: ripRapSettings.stoneSize, field: 'stoneSize', min: 6, max: 34, step: 1 },
                          { label: 'Density', value: ripRapSettings.density, field: 'density', min: 0.25, max: 2, step: 0.05 },
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
                                  updateRipRapSettings({
                                    [control.field]: clampNumber(parsedValue, control.min, control.max),
                                  });
                                }
                              }}
                              className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                            />
                          </label>
                        ))}
                      </div>
                      <label className="mt-2 flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                        <span>Show filter layer</span>
                        <input
                          type="checkbox"
                          checked={ripRapSettings.showFilterLayer}
                          onChange={(event) => updateRipRapSettings({ showFilterLayer: event.target.checked })}
                          className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
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
            'Project / Title Block',
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Description / Title</span>
              <input
                value={sectionView.title}
                onChange={(event) => updateField('title', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
            </label>,
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
