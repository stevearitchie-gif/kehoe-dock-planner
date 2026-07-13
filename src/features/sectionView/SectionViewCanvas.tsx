import type { ChangeEvent } from 'react';
import { useMemo, useRef } from 'react';
import { applySectionTemplate, sectionTemplates } from '@/features/sectionView/sectionTemplates';
import type { SectionViewData, SectionViewTemplateId } from '@/features/sectionView/sectionTypes';

interface SectionViewCanvasProps {
  sectionView: SectionViewData;
  projectName: string;
  onChange: (sectionView: SectionViewData) => void;
  onGenerateFromBuildPlan: () => void;
}

const SVG_WIDTH = 960;
const SVG_HEIGHT = 540;
const drawingLeft = 70;
const drawingRight = 870;
const waterY = 275;
const lowWaterY = 306;
const gradeStart = { x: 110, y: 170 };
const gradeEnd = { x: 515, y: 272 };
const lakebedStart = { x: 105, y: 408 };
const lakebedEnd = { x: 855, y: 356 };
const red = '#dc2626';
const blue = '#0f70b7';
const ink = '#111827';
const mutedInk = '#475569';

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

function callout(label: string, labelX: number, labelY: number, targetX: number, targetY: number, key: string) {
  return (
    <g key={key} stroke={red} fill="none" strokeWidth="1.6">
      <line x1={labelX} y1={labelY + 5} x2={targetX} y2={targetY} markerEnd="url(#red-arrow)" />
      <text x={labelX} y={labelY} fill={red} stroke="none" fontSize="12" fontWeight="700">
        {label}
      </text>
    </g>
  );
}

function rockSymbols(startX: number, startY: number, count: number, slope = 0.42) {
  return Array.from({ length: count }, (_, index) => {
    const column = index % 10;
    const row = Math.floor(index / 10);
    const x = startX + column * 34 + row * 9;
    const y = startY + column * slope * 12 + row * 26;
    const size = 9 + (index % 4) * 2;
    const points = [
      `${x - size},${y + 2}`,
      `${x - size / 2},${y - size}`,
      `${x + size * 0.7},${y - size * 0.5}`,
      `${x + size},${y + size * 0.3}`,
      `${x + size * 0.15},${y + size}`,
    ].join(' ');
    return <polygon key={index} points={points} fill="none" stroke={ink} strokeWidth="1" />;
  });
}

function titleBlock(projectName: string, title: string, drawingDate: string) {
  const x = 610;
  const y = 392;
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
      <rect x={x} y={y} width="300" height="128" fill="#ffffff" stroke={ink} strokeWidth="1.4" />
      <rect x={x} y={y} width="300" height="26" fill="#ffffff" stroke={ink} strokeWidth="1.2" />
      <text x={x + 10} y={y + 18} fill={ink} fontSize="14" fontWeight="800">
        KEHOE SECTION VIEW
      </text>
      {rows.map(([label, value], index) => {
        const rowY = y + 26 + index * rowHeight;
        return (
          <g key={label}>
            <line x1={x} y1={rowY} x2={x + 300} y2={rowY} stroke={ink} strokeWidth="0.7" />
            <line x1={x + 86} y1={rowY} x2={x + 86} y2={rowY + rowHeight} stroke={ink} strokeWidth="0.7" />
            <text x={x + 7} y={rowY + 14} fill={mutedInk} fontSize="9" fontWeight="700">
              {label}
            </text>
            <text x={x + 94} y={rowY + 14} fill={ink} fontSize="10">
              {value.length > 34 ? `${value.slice(0, 31)}...` : value}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function SectionViewCanvas({ sectionView, projectName, onChange, onGenerateFromBuildPlan }: SectionViewCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const buildPlanSummary = sectionView.buildPlanSummary;
  const drawingDate = useMemo(() => formatDate(new Date()), []);

  const updateField = <Key extends keyof SectionViewData>(field: Key, value: SectionViewData[Key]) => {
    onChange({
      ...sectionView,
      [field]: value,
    });
  };

  const updateNumberField = (field: 'shorelineHeightFt' | 'lakebedDropFt' | 'ripRapDepthFt' | 'armourStoneRows', value: string) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    if (field === 'armourStoneRows') {
      updateField(field, Math.round(clampNumber(parsedValue, 0, 6)));
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
  const adjustedGradeStartY = gradeStart.y - sectionHeight * 7;
  const adjustedLakebedEndY = lakebedEnd.y + lakebedDrop * 6;
  const ripRapTop = adjustedGradeStartY + 62;
  const ripRapBottom = ripRapTop + Math.max(26, ripRapDepth * 18);
  const useArmourTemplate = sectionView.templateId === 'armour_stone' || sectionView.showArmourStone;
  const useDockTemplate = sectionView.templateId === 'floating_dock_shoreline' || sectionView.showDockReference;

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-h-0 overflow-auto rounded-md border border-slate-200 bg-white p-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          role="img"
          aria-label="Section view drawing"
          className="min-h-[360px] w-full rounded border border-slate-200 bg-white"
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
              <circle cx="4" cy="5" r="1.3" fill={ink} />
              <circle cx="13" cy="12" r="1" fill={ink} />
              <circle cx="9" cy="3" r="0.9" fill={ink} />
            </pattern>
          </defs>

          <text x="42" y="42" fill={ink} fontSize="22" fontWeight="800">
            {sectionView.title}
          </text>
          <text x="42" y="66" fill={mutedInk} fontSize="12">
            Permit-support visual only - not an engineered stamped drawing
          </text>

          <line x1={drawingLeft} y1={waterY} x2={drawingRight} y2={waterY} stroke={blue} strokeWidth="1.8" />
          <text x={drawingLeft + 8} y={waterY - 8} fill={blue} fontSize="12" fontWeight="700">
            HIGH WATER LEVEL
          </text>
          <line x1={drawingLeft} y1={lowWaterY} x2={drawingRight} y2={lowWaterY} stroke={blue} strokeWidth="1.4" strokeDasharray="10 7" />
          <text x={drawingLeft + 8} y={lowWaterY + 18} fill={blue} fontSize="12" fontWeight="700">
            LOW WATER LEVEL
          </text>

          <polyline
            points={`${gradeStart.x},${adjustedGradeStartY} 250,${adjustedGradeStartY + 20} 370,${adjustedGradeStartY + 56} ${gradeEnd.x},${gradeEnd.y}`}
            fill="none"
            stroke={ink}
            strokeWidth="2"
          />
          <polyline
            points={`${lakebedStart.x},${lakebedStart.y} 315,${lakebedStart.y - 14} 560,${adjustedLakebedEndY - 20} ${lakebedEnd.x},${adjustedLakebedEndY}`}
            fill="none"
            stroke={ink}
            strokeWidth="1.8"
          />

          {sectionView.showRipRap && !useArmourTemplate && (
            <g>
              <line x1="200" y1={ripRapTop} x2="545" y2={ripRapTop + 82} stroke={ink} strokeWidth="1.2" />
              <line x1="190" y1={ripRapBottom} x2="548" y2={ripRapBottom + 72} stroke={ink} strokeWidth="1.2" strokeDasharray="5 5" />
              {rockSymbols(230, ripRapTop + 14, 28)}
              <path d={`M205 ${ripRapBottom + 16} C286 ${ripRapBottom + 34}, 385 ${ripRapBottom + 43}, 520 ${ripRapBottom + 74}`} fill="none" stroke={ink} strokeWidth="1" />
              <text x="360" y={ripRapBottom + 82} fill={ink} fontSize="11" fontWeight="700">
                CLEAR STONE / FILTER LAYER
              </text>
              <line x1="285" y1={ripRapBottom + 54} x2="372" y2={ripRapBottom + 72} stroke={ink} strokeWidth="5" strokeLinecap="round" />
              <line x1="285" y1={ripRapBottom + 54} x2="372" y2={ripRapBottom + 72} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" />
            </g>
          )}

          {sectionView.showArmourStone && armourRows > 0 && (
            <g>
              <polygon
                points={`470,${waterY - 10} 650,${waterY - 10} 650,${waterY + 42 + armourRows * 8} 470,${waterY + 42 + armourRows * 8}`}
                fill="url(#clear-stone)"
                stroke={ink}
                strokeWidth="1"
              />
              {Array.from({ length: armourRows }, (_, row) =>
                Array.from({ length: 2 }, (_, column) => (
                  <rect
                    key={`${row}-${column}`}
                    x={500 + column * 74 + (row % 2) * 18}
                    y={waterY - 38 - row * 29}
                    width="72"
                    height="25"
                    fill="#ffffff"
                    stroke={ink}
                    strokeWidth="1.4"
                  />
                )),
              )}
            </g>
          )}

          {useDockTemplate && (
            <g stroke={ink} fill="none">
              <line x1="440" y1={waterY - 55} x2="568" y2={waterY - 36} strokeWidth="2.3" />
              <line x1="440" y1={waterY - 49} x2="568" y2={waterY - 30} strokeWidth="1.2" />
              <rect x="575" y={waterY - 45} width="166" height="14" strokeWidth="1.8" />
              <line x1="590" y1={waterY - 31} x2="728" y2={waterY - 31} strokeWidth="1.2" />
              <ellipse cx="628" cy={waterY - 13} rx="38" ry="11" strokeWidth="1.4" />
              <ellipse cx="696" cy={waterY - 13} rx="38" ry="11" strokeWidth="1.4" />
            </g>
          )}

          {sectionView.showDimensions && (
            <g stroke={ink} strokeWidth="1.2" fill="none">
              <line x1="90" y1={adjustedGradeStartY} x2="90" y2={waterY} markerStart="url(#black-arrow)" markerEnd="url(#black-arrow)" />
              <text x="34" y={(adjustedGradeStartY + waterY) / 2} fill={ink} stroke="none" fontSize="11">
                BANK {sectionHeight.toFixed(1)} ft
              </text>
              <line x1="838" y1={lowWaterY} x2="838" y2={adjustedLakebedEndY} markerStart="url(#black-arrow)" markerEnd="url(#black-arrow)" />
              <text x="760" y={(lowWaterY + adjustedLakebedEndY) / 2} fill={ink} stroke="none" fontSize="11">
                DROP {lakebedDrop.toFixed(1)} ft
              </text>
            </g>
          )}

          {[
            callout('EXISTING GRADE', 120, 102, 248, adjustedGradeStartY + 20, 'grade'),
            callout('LAKEBED PROFILE', 112, 452, 284, lakebedStart.y - 12, 'lakebed'),
            sectionView.showRipRap && !useArmourTemplate ? callout('RIP RAP STONE', 566, 175, 420, ripRapTop + 62, 'riprap') : null,
            useArmourTemplate ? callout('ARMOUR STONE WALL', 680, 170, 610, waterY - 54, 'armour') : null,
            useDockTemplate ? callout('FLOATING DOCK / RAMP REF.', 610, 120, 604, waterY - 44, 'dock') : null,
          ]}

          <text x="42" y="492" fill={mutedInk} fontSize="11">
            {sectionView.notes}
          </text>
          {titleBlock(projectName, sectionView.title, drawingDate)}
        </svg>
      </section>

      <aside className="min-h-0 overflow-y-auto rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section View</p>
            <p className="mt-1 text-sm text-slate-700">Permit-support cross-section visual.</p>
          </div>
          <button
            type="button"
            onClick={handleExportPng}
            className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
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

        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Build Plan Data</p>
              <p className="mt-1 text-xs text-slate-500">
                Imported fields are summarized only. Section geometry remains manually editable.
              </p>
            </div>
            {buildPlanSummary && (
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">
                {buildPlanSummary.hasProjectScale ? 'Scaled' : 'Approx'}
              </span>
            )}
          </div>

          {buildPlanSummary ? (
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p className="text-xs text-slate-500">{buildPlanSummary.scaleLabel}</p>
              <ul className="space-y-1">
                {buildPlanSummary.detectedItems.map((item) => (
                  <li key={item} className="rounded bg-white px-2 py-1">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              No Build Plan data imported yet. Use Generate from Build Plan to pull reliable project dimensions and object summaries.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-2">
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
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Title</span>
          <input
            value={sectionView.title}
            onChange={(event) => updateField('title', event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: 'Bank height', field: 'shorelineHeightFt', value: sectionView.shorelineHeightFt },
            { label: 'Lakebed drop', field: 'lakebedDropFt', value: sectionView.lakebedDropFt },
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
                  updateNumberField(control.field as 'shorelineHeightFt' | 'lakebedDropFt' | 'ripRapDepthFt' | 'armourStoneRows', event.target.value)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
            </label>
          ))}
        </div>

        <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          {[
            { label: 'Show rip rap stone', field: 'showRipRap' },
            { label: 'Show armour stone wall', field: 'showArmourStone' },
            { label: 'Show dock reference', field: 'showDockReference' },
            { label: 'Show dimensions', field: 'showDimensions' },
          ].map((control) => (
            <label key={control.field} className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
              <span>{control.label}</span>
              <input
                type="checkbox"
                checked={Boolean(sectionView[control.field as keyof SectionViewData])}
                onChange={(event) => updateField(control.field as 'showRipRap' | 'showArmourStone' | 'showDockReference' | 'showDimensions', event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Notes</span>
          <textarea
            value={sectionView.notes ?? ''}
            onChange={(event) => updateField('notes', event.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
          />
        </label>
      </aside>
    </div>
  );
}
