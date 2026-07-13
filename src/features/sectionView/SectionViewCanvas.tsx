import type { ChangeEvent } from 'react';
import { useRef } from 'react';
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
const gradeStart = { x: 120, y: 170 };
const gradeEnd = { x: 805, y: 275 };
const lakebedStart = { x: 120, y: 410 };
const lakebedEnd = { x: 820, y: 355 };
const waterY = 280;

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

export function SectionViewCanvas({ sectionView, projectName, onChange, onGenerateFromBuildPlan }: SectionViewCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const buildPlanSummary = sectionView.buildPlanSummary;

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
  const adjustedGradeStartY = gradeStart.y - sectionHeight * 8;
  const adjustedLakebedEndY = lakebedEnd.y + lakebedDrop * 7;
  const ripRapOffset = Math.max(16, ripRapDepth * 16);

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
          <text x="40" y="42" fill="#0f172a" fontSize="24" fontWeight="700">
            {sectionView.title}
          </text>
          <text x="40" y="70" fill="#475569" fontSize="13">
            {projectName} - permit-support visual, not an engineered stamped drawing
          </text>

          <rect x="60" y={waterY} width="835" height="100" fill="#dff4ff" opacity="0.78" />
          <line x1="60" y1={waterY} x2="895" y2={waterY} stroke="#0284c7" strokeWidth="3" />
          <text x="70" y={waterY - 10} fill="#0369a1" fontSize="15" fontWeight="600">
            Water level
          </text>

          <polygon
            points={`${gradeStart.x},${adjustedGradeStartY} ${gradeEnd.x},${gradeEnd.y} ${lakebedEnd.x},${adjustedLakebedEndY} ${lakebedStart.x},${lakebedStart.y}`}
            fill="#f4eadb"
          />
          <line x1={gradeStart.x} y1={adjustedGradeStartY} x2={gradeEnd.x} y2={gradeEnd.y} stroke="#7c5f42" strokeWidth="4" />
          <text x={gradeStart.x + 10} y={adjustedGradeStartY - 14} fill="#6b4f35" fontSize="15" fontWeight="600">
            Existing shoreline / grade
          </text>

          <line x1={lakebedStart.x} y1={lakebedStart.y} x2={lakebedEnd.x} y2={adjustedLakebedEndY} stroke="#475569" strokeWidth="3" />
          <text x={lakebedStart.x + 8} y={lakebedStart.y + 28} fill="#334155" fontSize="15" fontWeight="600">
            Lakebed
          </text>

          {sectionView.showRipRap && (
            <>
              <polygon
                points={`${gradeStart.x + 72},${adjustedGradeStartY + 54} ${gradeEnd.x - 40},${gradeEnd.y - 12} ${gradeEnd.x - 8},${gradeEnd.y + ripRapOffset} ${gradeStart.x + 52},${adjustedGradeStartY + 94}`}
                fill="#9ca3af"
                opacity="0.82"
                stroke="#64748b"
                strokeWidth="2"
              />
              {Array.from({ length: 22 }, (_, index) => {
                const x = gradeStart.x + 98 + (index % 11) * 56;
                const y = adjustedGradeStartY + 72 + Math.floor(index / 11) * 38 + (index % 2) * 8;
                return <circle key={index} cx={x} cy={y} r={6 + (index % 3)} fill="#6b7280" opacity="0.65" />;
              })}
              <text x="610" y="222" fill="#374151" fontSize="15" fontWeight="700">
                Rip rap
              </text>
            </>
          )}

          {sectionView.showArmourStone && armourRows > 0 && (
            <g>
              {Array.from({ length: armourRows }, (_, row) =>
                Array.from({ length: 3 }, (_, column) => (
                  <rect
                    key={`${row}-${column}`}
                    x={510 + column * 72 + (row % 2) * 18}
                    y={waterY - 42 - row * 30}
                    width="68"
                    height="26"
                    rx="3"
                    fill="#b8a48c"
                    stroke="#7c6b57"
                    strokeWidth="2"
                  />
                )),
              )}
              <text x="520" y={waterY - 58 - armourRows * 28} fill="#6b4f35" fontSize="15" fontWeight="700">
                Armour stone wall
              </text>
            </g>
          )}

          {sectionView.showDockReference && (
            <g>
              <rect x="610" y={waterY - 48} width="160" height="18" fill="#b98654" stroke="#7c5534" strokeWidth="2" />
              <rect x="632" y={waterY - 26} width="116" height="22" rx="10" fill="#2c2119" opacity="0.9" />
              <line x1="575" y1={waterY - 30} x2="610" y2={waterY - 39} stroke="#64748b" strokeWidth="3" />
              <text x="610" y={waterY - 64} fill="#7c5534" fontSize="15" fontWeight="700">
                Floating dock reference
              </text>
            </g>
          )}

          {sectionView.showDimensions && (
            <g stroke="#0f172a" strokeWidth="2" fill="none">
              <line x1="84" y1={adjustedGradeStartY} x2="84" y2={waterY} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
              <text x="28" y={(adjustedGradeStartY + waterY) / 2} fill="#0f172a" fontSize="14">
                Bank height {sectionHeight.toFixed(1)} ft
              </text>
              <line x1="855" y1={waterY} x2="855" y2={adjustedLakebedEndY} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
              <text x="762" y={(waterY + adjustedLakebedEndY) / 2} fill="#0f172a" fontSize="14">
                Lakebed drop {lakebedDrop.toFixed(1)} ft
              </text>
            </g>
          )}

          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L8,4 L0,8 z" fill="#0f172a" />
            </marker>
          </defs>

          <text x="40" y="500" fill="#475569" fontSize="13">
            {sectionView.notes}
          </text>
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
            { label: 'Show rip rap area', field: 'showRipRap' },
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
