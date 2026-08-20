import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useMatch, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { CameraPresetControls } from '@/components/render3d/CameraPresetControls';
import { DockScene, type DockSceneHandle } from '@/components/render3d/DockScene';
import { RenderControlPanel } from '@/components/render3d/RenderControlPanel';
import { buildProductConfigurationRenderModel } from '@/components/render3d/productConfigAdapter';
import { buildProjectRenderModel } from '@/components/render3d/projectModelAdapter';
import { parseQuoteImportJson } from '@/components/render3d/quoteImportAdapter';
import { sampleQuoteProductConfigurations } from '@/components/render3d/sampleQuoteProductConfig';
import { sampleQuoteImportPayloadText } from '@/components/render3d/sampleQuoteImportPayload';
import { getProject } from '@/features/projects/projectService';
import type { ProductConfiguration } from '@/components/render3d/productConfigTypes';
import type { NormalizedQuoteImportData } from '@/components/render3d/quoteImportTypes';
import type { CameraPreset, DockRenderSettings, ProjectRenderModel, RenderViewMode } from '@/components/render3d/types';
import type { DockProject } from '@/types/dock';

const defaultRenderSettings: DockRenderSettings = {
  dockLength: 24,
  dockWidth: 8,
  dockHeight: 1,
  rampEnabled: true,
  rampLength: 12,
  rampWidth: 4,
  railingsEnabled: true,
  deckFinish: 'pressure-treated',
};

const CONCEPT_NOTE_TITLE = 'Concept visualization only';
const CONCEPT_NOTE_BODY =
  'This 3D model is for initial review and layout discussion. It is not an engineered drawing, construction drawing, or exact representation of the finished installation. Final design, materials, dimensions, and site conditions may vary.';
const CONCEPT_NOTE_WIDTH = 360;
const CONCEPT_NOTE_HEIGHT = 148;
const CONCEPT_NOTE_MARGIN = 24;

function clampConceptNotePositionToViewport(position: { x: number; y: number }, viewport: { width: number; height: number }) {
  const maxX = Math.max(CONCEPT_NOTE_MARGIN, viewport.width - CONCEPT_NOTE_WIDTH - CONCEPT_NOTE_MARGIN);
  const maxY = Math.max(CONCEPT_NOTE_MARGIN, viewport.height - CONCEPT_NOTE_HEIGHT - CONCEPT_NOTE_MARGIN);

  return {
    x: Math.min(Math.max(CONCEPT_NOTE_MARGIN, position.x), maxX),
    y: Math.min(Math.max(CONCEPT_NOTE_MARGIN, position.y), maxY),
  };
}

type QuotePreviewDeckMaterial = 'pressure_treated_wood' | 'tru_north_pvc' | 'composite_grey';
type QuotePreviewRampMaterial = 'aluminum';
type QuotePreviewSourceLabel =
  | 'sample quote controls'
  | 'manual controls'
  | 'pasted quote data'
  | 'pasted quote data plus fallback defaults';

interface QuotePreviewControlState {
  dockLengthFt: number;
  dockWidthFt: number;
  deckMaterial: QuotePreviewDeckMaterial;
  tubeDiameterFt: number;
  rampEnabled: boolean;
  rampLengthFt: number;
  rampWidthFt: number;
  rampMaterial: QuotePreviewRampMaterial;
}

const materialLabels: Record<string, string> = {
  pressure_treated_wood: 'Pressure treated wood',
  tru_north_pvc: 'Tru North PVC',
  composite_grey: 'Composite grey',
  composite_brown: 'Composite brown',
  steel: 'Steel',
  painted_steel: 'Painted steel',
  aluminum: 'Aluminum',
  standard: 'Standard',
  sandblast_epoxy_paint: 'Sandblast and epoxy paint',
  unknown: 'Unknown',
};

function getDefaultQuotePreviewControls(): QuotePreviewControlState {
  const details = getQuotePreviewDetails(sampleQuoteProductConfigurations);

  return {
    dockLengthFt: details.floatingDock?.dimensions?.lengthFt ?? 20,
    dockWidthFt: details.floatingDock?.dimensions?.widthFt ?? 20,
    deckMaterial:
      details.floatingDock?.material?.deck === 'tru_north_pvc' || details.floatingDock?.material?.deck === 'composite_grey'
        ? details.floatingDock.material.deck
        : 'pressure_treated_wood',
    tubeDiameterFt: details.floatingDock?.floatingDock?.tubeDiameterFt ?? 2,
    rampEnabled: Boolean(details.ramp),
    rampLengthFt: details.ramp?.dimensions?.lengthFt ?? 24,
    rampWidthFt: details.ramp?.dimensions?.widthFt ?? 4,
    rampMaterial: 'aluminum',
  };
}

function buildQuotePreviewConfigurations(controls: QuotePreviewControlState): ProductConfiguration[] {
  const floatingDock: ProductConfiguration = {
    id: 'quote-floating-dock-20x20',
    source: 'quote',
    quoteLineItemId: 'sample-quote-line-floating-dock',
    productType: 'floating_dock',
    productFamily: 'kehoe_floating_dock',
    displayName: `Floating Dock, ${controls.dockLengthFt} ft x ${controls.dockWidthFt} ft`,
    quantity: 1,
    dimensions: {
      lengthFt: controls.dockLengthFt,
      widthFt: controls.dockWidthFt,
    },
    material: {
      deck: controls.deckMaterial,
      frame: 'steel',
      finish: 'standard',
    },
    floatingDock: {
      layout: 'single',
      sectionRole: 'main',
      tubeType: 'standard_steel',
      tubeDiameterFt: controls.tubeDiameterFt,
      tubeSpecificationText: `${controls.tubeDiameterFt} ft steel floatation tubes`,
    },
    layout: {
      xFt: 0,
      yFt: 0,
      rotationDeg: 0,
    },
    notes: {
      customerWording: 'Editable sample quote configuration for a steel tube floating dock.',
    },
  };

  if (!controls.rampEnabled) {
    return [floatingDock];
  }

  return [
    floatingDock,
    {
      id: 'quote-ramp-with-rails-24',
      source: 'quote',
      quoteLineItemId: 'sample-quote-line-ramp',
      productType: 'ramp_with_rails',
      productFamily: 'kehoe_ramp_with_rails',
      displayName: `${formatMaterial(controls.rampMaterial)} Ramp With Rails, ${controls.rampWidthFt} ft x ${controls.rampLengthFt} ft`,
      quantity: 1,
      dimensions: {
        lengthFt: controls.rampLengthFt,
        widthFt: controls.rampWidthFt,
      },
      material: {
        deck: 'composite_grey',
        frame: controls.rampMaterial,
        finish: 'standard',
      },
      ramp: {
        hasRails: true,
        connectionPoint: 'Dock edge',
      },
      layout: {
        xFt: 0,
        yFt: controls.dockWidthFt / 2 + controls.rampLengthFt / 2,
        rotationDeg: 0,
        connectedToId: floatingDock.id,
        connectionEdge: 'bottom',
      },
      notes: {
        customerWording: 'Editable sample quote configuration for a ramp with rails connected to the floating dock.',
      },
    },
  ];
}

function formatMaterial(value?: string) {
  return value ? materialLabels[value] ?? value : 'Not specified';
}

function formatFeet(value?: number) {
  return Number.isFinite(value) ? `${value} ft` : 'Not specified';
}

function getQuotePreviewDetails(configurations: ProductConfiguration[]) {
  const floatingDock = configurations.find((config) => config.productType === 'floating_dock');
  const ramp = configurations.find((config) => config.productType === 'ramp_with_rails' || config.productType === 'ramp_without_rails');

  return {
    floatingDock,
    ramp,
  };
}

function toPositiveNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function quoteControlsFromNormalizedImport(normalized: NormalizedQuoteImportData): QuotePreviewControlState {
  return {
    dockLengthFt: normalized.dockLengthFt,
    dockWidthFt: normalized.dockWidthFt,
    deckMaterial: normalized.deckMaterial,
    tubeDiameterFt: normalized.tubeDiameterFt,
    rampEnabled: normalized.rampEnabled,
    rampLengthFt: normalized.rampLengthFt,
    rampWidthFt: normalized.rampWidthFt,
    rampMaterial: normalized.rampMaterial,
  };
}

function QuotePreviewControlPanel({
  controls,
  onChange,
}: {
  controls: QuotePreviewControlState;
  onChange: (updates: Partial<QuotePreviewControlState>) => void;
}) {
  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Internal Quote Controls</p>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Floating Dock Length</span>
          <input
            type="number"
            min="1"
            step="1"
            value={controls.dockLengthFt}
            onChange={(event) => onChange({ dockLengthFt: toPositiveNumber(event.target.value, controls.dockLengthFt) })}
            className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Floating Dock Width</span>
          <input
            type="number"
            min="1"
            step="1"
            value={controls.dockWidthFt}
            onChange={(event) => onChange({ dockWidthFt: toPositiveNumber(event.target.value, controls.dockWidthFt) })}
            className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Deck Material</span>
          <select
            value={controls.deckMaterial}
            onChange={(event) => onChange({ deckMaterial: event.target.value as QuotePreviewDeckMaterial })}
            className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          >
            <option value="pressure_treated_wood">Pressure treated wood</option>
            <option value="tru_north_pvc">TruNorth PVC</option>
            <option value="composite_grey">Composite grey</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Tube Diameter</span>
          <input
            type="number"
            min="0.5"
            step="0.25"
            value={controls.tubeDiameterFt}
            onChange={(event) => onChange({ tubeDiameterFt: toPositiveNumber(event.target.value, controls.tubeDiameterFt) })}
            className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={controls.rampEnabled}
            onChange={(event) => onChange({ rampEnabled: event.target.checked })}
            className="h-6 w-6 rounded border-slate-300"
          />
          Ramp enabled
        </label>
        <div className={controls.rampEnabled ? 'grid gap-3' : 'grid gap-3 opacity-50'}>
          <label className="grid gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Ramp Length</span>
            <input
              type="number"
              min="1"
              step="1"
              value={controls.rampLengthFt}
              disabled={!controls.rampEnabled}
              onChange={(event) => onChange({ rampLengthFt: toPositiveNumber(event.target.value, controls.rampLengthFt) })}
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-100"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Ramp Width</span>
            <input
              type="number"
              min="1"
              step="0.5"
              value={controls.rampWidthFt}
              disabled={!controls.rampEnabled}
              onChange={(event) => onChange({ rampWidthFt: toPositiveNumber(event.target.value, controls.rampWidthFt) })}
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-100"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Ramp Material</span>
            <select
              value={controls.rampMaterial}
              disabled={!controls.rampEnabled}
              onChange={() => onChange({ rampMaterial: 'aluminum' })}
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-100"
            >
              <option value="aluminum">Aluminum</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

function QuoteImportPanel({
  importText,
  importError,
  importWarnings,
  previewSourceLabel,
  onImportTextChange,
  onApplyImport,
  onLoadSample,
  onUseManualControls,
}: {
  importText: string;
  importError: string | null;
  importWarnings: string[];
  previewSourceLabel: string;
  onImportTextChange: (value: string) => void;
  onApplyImport: () => void;
  onLoadSample: () => void;
  onUseManualControls: () => void;
}) {
  const isUsingImport = previewSourceLabel.startsWith('pasted quote data');

  return (
    <div className="mt-5 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Quote Import Test</p>
          <p className="mt-1 text-blue-950">Paste quote-style JSON to test ProductConfiguration import.</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            isUsingImport ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-blue-800'
          }`}
        >
          {previewSourceLabel}
        </span>
      </div>
      <textarea
        value={importText}
        onChange={(event) => onImportTextChange(event.target.value)}
        rows={10}
        spellCheck={false}
        className="mt-3 w-full rounded-md border border-blue-200 bg-white px-2 py-2 font-mono text-xs text-slate-900"
      />
      <div className="mt-3 grid gap-2">
        <button
          type="button"
          onClick={onApplyImport}
          className="min-h-11 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Apply Pasted Quote JSON
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onLoadSample}
            className="min-h-11 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
          >
            Load Sample JSON
          </button>
          <button
            type="button"
            onClick={onUseManualControls}
            className="min-h-11 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
          >
            Use Manual Controls
          </button>
        </div>
      </div>
      {importError && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">{importError}</p>}
      {importWarnings.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          <p className="font-medium">Import assumptions</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {importWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      {isUsingImport && (
        <p className="mt-3 text-xs text-blue-900">
          Manual controls remain available below. Use Manual Controls to return the preview to editable sample values.
        </p>
      )}
    </div>
  );
}

export function DockRender3DPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const dedicatedQuotePreviewMatch = useMatch('/quote-preview-3d/:previewId');
  const nestedQuotePreviewMatch = useMatch('/render3d/quote-preview/:previewId');
  const previewId = dedicatedQuotePreviewMatch?.params.previewId ?? nestedQuotePreviewMatch?.params.previewId;
  const isQueryQuotePreview = projectId === 'local-test' && searchParams.get('mode') === 'quote-preview';
  const isQuotePreview = (Boolean(dedicatedQuotePreviewMatch || nestedQuotePreviewMatch) && previewId === 'local-test') || isQueryQuotePreview;
  const { user } = useAuth();
  const sceneRef = useRef<DockSceneHandle | null>(null);
  const renderViewportRef = useRef<HTMLElement | null>(null);
  const conceptNoteDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [settings, setSettings] = useState<DockRenderSettings>(defaultRenderSettings);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [viewMode, setViewMode] = useState<RenderViewMode>('customer');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [conceptNotePosition, setConceptNotePosition] = useState<{ x: number; y: number } | null>(null);
  const [renderViewportSize, setRenderViewportSize] = useState({ width: 0, height: 0 });
  const [project, setProject] = useState<DockProject | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [quotePreviewControls, setQuotePreviewControls] = useState<QuotePreviewControlState>(() => getDefaultQuotePreviewControls());
  const [activeQuoteConfigurations, setActiveQuoteConfigurations] = useState<ProductConfiguration[]>(() =>
    buildQuotePreviewConfigurations(getDefaultQuotePreviewControls()),
  );
  const [quotePreviewSourceLabel, setQuotePreviewSourceLabel] = useState<QuotePreviewSourceLabel>('sample quote controls');
  const [quoteImportText, setQuoteImportText] = useState(sampleQuoteImportPayloadText);
  const [quoteImportError, setQuoteImportError] = useState<string | null>(null);
  const [quoteImportWarnings, setQuoteImportWarnings] = useState<string[]>([]);
  const canReturnToEditor = Boolean(projectId && projectId !== 'local-test' && !isQuotePreview);
  const toggleSidePanel = () => setIsSidePanelOpen((isOpen) => !isOpen);
  const handleExportPng = useCallback(() => {
    if (!sceneRef.current) {
      return;
    }

    if (!conceptNotePosition || renderViewportSize.width <= 0 || renderViewportSize.height <= 0) {
      sceneRef.current.exportPng();
      return;
    }

    sceneRef.current.exportPng({
      disclaimer: {
        x: conceptNotePosition.x,
        y: conceptNotePosition.y,
        width: CONCEPT_NOTE_WIDTH,
        height: CONCEPT_NOTE_HEIGHT,
        viewportWidth: renderViewportSize.width,
        viewportHeight: renderViewportSize.height,
        title: CONCEPT_NOTE_TITLE,
        body: CONCEPT_NOTE_BODY,
      },
    });
  }, [conceptNotePosition, renderViewportSize.height, renderViewportSize.width]);
  const handleConceptNotePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!conceptNotePosition) {
      return;
    }

    const viewportRect = renderViewportRef.current?.getBoundingClientRect();
    if (!viewportRect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    conceptNoteDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - viewportRect.left - conceptNotePosition.x,
      offsetY: event.clientY - viewportRect.top - conceptNotePosition.y,
    };
  };
  const handleConceptNotePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = conceptNoteDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const viewportRect = renderViewportRef.current?.getBoundingClientRect();
    if (!viewportRect) {
      return;
    }

    const nextPosition = {
      x: event.clientX - viewportRect.left - dragState.offsetX,
      y: event.clientY - viewportRect.top - dragState.offsetY,
    };
    setConceptNotePosition(clampConceptNotePositionToViewport(nextPosition, renderViewportSize));
  };
  const handleConceptNotePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = conceptNoteDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    conceptNoteDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const resetConceptNotePosition = () => {
    setConceptNotePosition(
      clampConceptNotePositionToViewport(
        {
          x: CONCEPT_NOTE_MARGIN,
          y: Math.max(CONCEPT_NOTE_MARGIN, renderViewportSize.height - CONCEPT_NOTE_HEIGHT - CONCEPT_NOTE_MARGIN),
        },
        renderViewportSize,
      ),
    );
  };

  useEffect(() => {
    let isActive = true;

    setProject(null);
    setLoadMessage(null);

    if (isQuotePreview || !projectId || projectId === 'local-test') {
      return () => {
        isActive = false;
      };
    }

    if (!user?.uid) {
      setLoadMessage('Project data unavailable. Showing local proof-of-concept fallback.');
      return () => {
        isActive = false;
      };
    }

    setIsLoadingProject(true);

    getProject(user.uid, projectId)
      .then((loadedProject) => {
        if (!isActive) {
          return;
        }

        if (!loadedProject) {
          setLoadMessage('Project not found. Showing local proof-of-concept fallback.');
          return;
        }

        setProject(loadedProject);
      })
      .catch((error) => {
        console.error('Failed to load project for 3D render', error);
        if (isActive) {
          setLoadMessage('Project load failed. Showing local proof-of-concept fallback.');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingProject(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isQuotePreview, projectId, user?.uid]);

  useEffect(() => {
    const viewportElement = renderViewportRef.current;
    if (!viewportElement) {
      return;
    }

    const updateViewportSize = () => {
      const rect = viewportElement.getBoundingClientRect();
      const viewport = { width: rect.width, height: rect.height };
      setRenderViewportSize(viewport);
      setConceptNotePosition((currentPosition) => {
        const defaultPosition = {
          x: CONCEPT_NOTE_MARGIN,
          y: Math.max(CONCEPT_NOTE_MARGIN, viewport.height - CONCEPT_NOTE_HEIGHT - CONCEPT_NOTE_MARGIN),
        };

        return clampConceptNotePositionToViewport(currentPosition ?? defaultPosition, viewport);
      });
    };

    updateViewportSize();
    const resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(viewportElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isSidePanelOpen]);

  const projectModel = useMemo<ProjectRenderModel | null>(() => {
    if (!project) {
      return null;
    }

    return buildProjectRenderModel(project);
  }, [project]);

  const handleApplyQuoteImport = () => {
    const result = parseQuoteImportJson(quoteImportText);
    setQuoteImportWarnings(result.warnings);

    if (!result.ok) {
      setQuoteImportError(result.error);
      return;
    }

    setQuoteImportError(null);
    setQuotePreviewControls(quoteControlsFromNormalizedImport(result.normalized));
    setActiveQuoteConfigurations(result.configurations);
    setQuotePreviewSourceLabel(result.warnings.length > 0 ? 'pasted quote data plus fallback defaults' : 'pasted quote data');
  };

  const handleUseManualQuoteControls = () => {
    setActiveQuoteConfigurations(buildQuotePreviewConfigurations(quotePreviewControls));
    setQuotePreviewSourceLabel('manual controls');
    setQuoteImportError(null);
    setQuoteImportWarnings([]);
  };

  const handleQuotePreviewControlsChange = (updates: Partial<QuotePreviewControlState>) => {
    setQuotePreviewControls((current) => {
      const nextControls = { ...current, ...updates };
      setActiveQuoteConfigurations(buildQuotePreviewConfigurations(nextControls));
      return nextControls;
    });
    setQuotePreviewSourceLabel('manual controls');
    setQuoteImportError(null);
    setQuoteImportWarnings([]);
  };

  const quotePreviewModel = useMemo<ProjectRenderModel | null>(() => {
    if (!isQuotePreview) {
      return null;
    }

    return buildProductConfigurationRenderModel(activeQuoteConfigurations);
  }, [isQuotePreview, activeQuoteConfigurations]);
  const quotePreviewDetails = useMemo(
    () => (isQuotePreview ? getQuotePreviewDetails(activeQuoteConfigurations) : null),
    [isQuotePreview, activeQuoteConfigurations],
  );

  const activeModel = quotePreviewModel ?? projectModel;
  const isModelFromQuote = Boolean(quotePreviewModel);
  const sourceNotice =
    isModelFromQuote
      ? `Rendering from quote ProductConfiguration (${quotePreviewSourceLabel})`
      : projectModel
        ? `Rendering from project data: ${projectModel.projectName}`
      : 'Rendering local proof-of-concept fallback';
  const detailNotice =
    activeModel
      ? `${isModelFromQuote ? 'Standalone quote preview. ' : ''}${
          activeModel.hasProjectScale ? '' : 'Project scale not found, using approximate fallback scale. '
        }${activeModel.elements.length} supported element${activeModel.elements.length === 1 ? '' : 's'} using ${
          activeModel.sourceUnitLabel
        }${
          activeModel.unsupportedCount > 0
            ? `; skipped ${activeModel.unsupportedCount} unsupported element${activeModel.unsupportedCount === 1 ? '' : 's'}${
                activeModel.unsupportedTypes.length > 0 ? ` (${activeModel.unsupportedTypes.join(', ')})` : ''
              }`
            : ''
        }`
      : loadMessage;
  const showTechnicalNotice = viewMode === 'internal' && (isLoadingProject || detailNotice);
  const sidePanelContent = activeModel ? (
    <aside className="max-h-[38vh] w-full shrink-0 overflow-y-auto border-t border-slate-200 bg-white p-4 lg:h-full lg:max-h-none lg:w-[18rem] lg:max-w-[32vw] lg:border-l lg:border-t-0 xl:w-80">
      <h2 className="text-base font-semibold text-slate-900">{isModelFromQuote ? 'Quote Preview' : 'Project Render'}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {isModelFromQuote
          ? `Standalone product geometry generated from ${quotePreviewSourceLabel}.`
          : 'Basic geometry generated from the saved 2D drawing.'}
      </p>
      <dl className="mt-5 grid gap-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</dt>
          <dd className="mt-1 text-slate-800">{activeModel.projectName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Elements</dt>
          <dd className="mt-1 text-slate-800">{activeModel.elements.length}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Scale</dt>
          <dd className="mt-1 text-slate-800">{activeModel.sourceUnitLabel}</dd>
        </div>
        {!activeModel.hasProjectScale && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
            Project scale not found, using approximate fallback scale.
          </div>
        )}
        {viewMode === 'internal' && activeModel.unsupportedTypes.length > 0 && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Skipped Types</dt>
            <dd className="mt-1 text-slate-800">{activeModel.unsupportedTypes.join(', ')}</dd>
          </div>
        )}
      </dl>
      {isModelFromQuote && (
        <QuoteImportPanel
          importText={quoteImportText}
          importError={quoteImportError}
          importWarnings={quoteImportWarnings}
          previewSourceLabel={quotePreviewSourceLabel}
          onImportTextChange={setQuoteImportText}
          onApplyImport={handleApplyQuoteImport}
          onLoadSample={() => {
            setQuoteImportText(sampleQuoteImportPayloadText);
            setQuoteImportError(null);
          }}
          onUseManualControls={handleUseManualQuoteControls}
        />
      )}
      {isModelFromQuote && (
        <QuotePreviewControlPanel
          controls={quotePreviewControls}
          onChange={handleQuotePreviewControlsChange}
        />
      )}
      {isModelFromQuote && quotePreviewDetails && (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Sample Quote Preview</p>
          <p className="mt-1 text-amber-950">
            Generated from ProductConfiguration ({quotePreviewSourceLabel}), not a saved Dock Planner layout.
          </p>
          <dl className="mt-4 grid gap-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-amber-800">Floating Dock Size</dt>
              <dd className="mt-1 text-slate-900">
                {formatFeet(quotePreviewDetails.floatingDock?.dimensions?.lengthFt)} x{' '}
                {formatFeet(quotePreviewDetails.floatingDock?.dimensions?.widthFt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-amber-800">Deck Material</dt>
              <dd className="mt-1 text-slate-900">{formatMaterial(quotePreviewDetails.floatingDock?.material?.deck)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-amber-800">Tube Diameter</dt>
              <dd className="mt-1 text-slate-900">
                {formatFeet(quotePreviewDetails.floatingDock?.floatingDock?.tubeDiameterFt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-amber-800">Ramp Type</dt>
              <dd className="mt-1 text-slate-900">{quotePreviewDetails.ramp?.displayName ?? 'Not specified'}</dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-amber-800">Ramp Length</dt>
                <dd className="mt-1 text-slate-900">{formatFeet(quotePreviewDetails.ramp?.dimensions?.lengthFt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-amber-800">Ramp Width</dt>
                <dd className="mt-1 text-slate-900">{formatFeet(quotePreviewDetails.ramp?.dimensions?.widthFt)}</dd>
              </div>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-amber-800">Ramp Material</dt>
              <dd className="mt-1 text-slate-900">
                {formatMaterial(quotePreviewDetails.ramp?.material?.frame)}
                {quotePreviewDetails.ramp?.material?.deck
                  ? ` frame with ${formatMaterial(quotePreviewDetails.ramp.material.deck).toLowerCase()} deck`
                  : ''}
              </dd>
            </div>
          </dl>
        </div>
      )}
      <button
        type="button"
        onClick={handleExportPng}
        className="mt-5 min-h-11 w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Export PNG
      </button>
    </aside>
  ) : (
    <RenderControlPanel
      settings={settings}
      onSettingsChange={setSettings}
      onExportPng={handleExportPng}
    />
  );

  return (
    <AppShell className="h-screen overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 xl:max-w-[34rem]">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {isModelFromQuote ? `Quote Preview ${previewId ?? ''}` : `Project ${projectId ?? 'local'}`}
            </p>
            <h1 className="truncate text-xl font-semibold text-slate-900">
              {isModelFromQuote ? 'Quote 3D Product Preview' : '3D Dock Render'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{sourceNotice}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-slate-300 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('customer')}
                className={`min-h-11 rounded px-3 py-2 text-sm font-medium ${
                  viewMode === 'customer' ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Customer View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('internal')}
                className={`min-h-11 rounded px-3 py-2 text-sm font-medium ${
                  viewMode === 'internal' ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Internal View
              </button>
            </div>
            <CameraPresetControls activePreset={cameraPreset} onPresetChange={setCameraPreset} />
            <button
              type="button"
              onClick={handleExportPng}
              className="min-h-11 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Export PNG
            </button>
            <button
              type="button"
              onClick={toggleSidePanel}
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              aria-expanded={isSidePanelOpen}
            >
              {isSidePanelOpen ? 'Hide Panel' : 'Show Panel'}
            </button>
            {canReturnToEditor ? (
              <Link
                to={`/editor/${projectId}`}
                className="flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back to Editor
              </Link>
            ) : isModelFromQuote ? (
              <Link
                to="/projects"
                className="flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="min-h-11 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400"
              >
                Back to Editor
              </button>
            )}
            <Link
              to="/projects"
              className="flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Projects
            </Link>
          </div>
        </header>

        <main
          className={`grid min-h-0 flex-1 ${
            isSidePanelOpen
              ? 'grid-rows-[minmax(360px,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)] lg:grid-rows-1'
              : 'grid-cols-1 grid-rows-1'
          }`}
        >
          <section ref={renderViewportRef} className="relative min-h-[360px] flex-1 bg-sky-50 md:min-h-[460px] lg:min-h-0">
            <DockScene
              ref={sceneRef}
              settings={settings}
              cameraPreset={cameraPreset}
              projectModel={activeModel}
              viewMode={viewMode}
              showFallbackModel={!isQuotePreview}
            />
            {conceptNotePosition && (
              <div
                className="absolute z-20 cursor-move select-none rounded-md border border-slate-300 bg-white/90 px-3 py-3 text-left text-slate-700 shadow-md backdrop-blur-sm"
                style={{
                  left: conceptNotePosition.x,
                  top: conceptNotePosition.y,
                  width: CONCEPT_NOTE_WIDTH,
                  minHeight: CONCEPT_NOTE_HEIGHT,
                  touchAction: 'none',
                }}
                onPointerDown={handleConceptNotePointerDown}
                onPointerMove={handleConceptNotePointerMove}
                onPointerUp={handleConceptNotePointerUp}
                onPointerCancel={handleConceptNotePointerUp}
                role="note"
                aria-label={CONCEPT_NOTE_TITLE}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-900">{CONCEPT_NOTE_TITLE}</p>
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      resetConceptNotePosition();
                    }}
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                  >
                    Reset
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-700">{CONCEPT_NOTE_BODY}</p>
              </div>
            )}
            {isModelFromQuote && (
              <div className="absolute left-4 top-4 max-w-xl rounded-lg border border-amber-300 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Sample Quote Preview</p>
                <p className="mt-1 font-medium">Generated from ProductConfiguration, not a saved Dock Planner layout</p>
                <p className="mt-1 text-xs text-amber-800">Preview source: {quotePreviewSourceLabel}</p>
              </div>
            )}
            {showTechnicalNotice && (
              <div
                className={`absolute left-4 ${
                  isModelFromQuote ? 'top-28' : 'top-4'
                } max-w-md rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm`}
              >
                {isLoadingProject ? 'Loading saved project data...' : detailNotice}
              </div>
            )}
          </section>
          {isSidePanelOpen && sidePanelContent}
        </main>
      </div>
    </AppShell>
  );
}
