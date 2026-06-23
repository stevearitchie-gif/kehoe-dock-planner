import type { ProductConfiguration } from '@/components/render3d/productConfigTypes';
import type {
  NormalizedQuoteImportData,
  QuoteImportDeckMaterial,
  QuoteImportRampMaterial,
  QuoteImportRampType,
  QuoteImportResult,
} from '@/components/render3d/quoteImportTypes';

type JsonObject = Record<string, unknown>;

const DOCK_LENGTH_ALIASES = ['dockLengthFt', 'dockLength', 'floatingDockLengthFt', 'floatingDockLength', 'lengthFt'];
const DOCK_WIDTH_ALIASES = ['dockWidthFt', 'dockWidth', 'floatingDockWidthFt', 'floatingDockWidth', 'widthFt'];
const DECK_MATERIAL_ALIASES = ['deckMaterial', 'material', 'finish', 'deckFinish'];
const TUBE_DIAMETER_ALIASES = ['tubeDiameterFt', 'tubeDiameter', 'floatTubeDiameterFt', 'floatTubeDiameter'];
const RAMP_ENABLED_ALIASES = ['rampEnabled', 'enabled', 'includeRamp'];
const RAMP_TYPE_ALIASES = ['rampType', 'type', 'productType'];
const RAMP_LENGTH_ALIASES = ['rampLengthFt', 'rampLength', 'lengthFt'];
const RAMP_WIDTH_ALIASES = ['rampWidthFt', 'rampWidth', 'widthFt'];
const RAMP_MATERIAL_ALIASES = ['rampMaterial', 'material', 'frameMaterial'];

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function firstObject(root: JsonObject, keys: string[]): JsonObject | null {
  for (const key of keys) {
    const value = root[key];
    if (isObject(value)) {
      return value;
    }
  }

  return null;
}

function findValue(candidates: JsonObject[], aliases: string[]): unknown {
  for (const candidate of candidates) {
    for (const alias of aliases) {
      if (candidate[alias] !== undefined) {
        return candidate[alias];
      }
    }
  }

  return undefined;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'y', '1', 'included', 'include'].includes(normalized)) {
      return true;
    }
    if (['false', 'no', 'n', '0', 'none', 'excluded', 'exclude'].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function normalizeDeckMaterial(value: unknown, warnings: string[]): QuoteImportDeckMaterial {
  if (typeof value !== 'string') {
    warnings.push('Deck material was not supplied; using pressure treated wood.');
    return 'pressure_treated_wood';
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (
    normalized === 'pvc' ||
    normalized.includes('trunorth') ||
    normalized.includes('vinyl') ||
    normalized.includes('composite')
  ) {
    return 'tru_north_pvc';
  }

  if (normalized.includes('grey') || normalized.includes('gray')) {
    return 'composite_grey';
  }

  if (normalized.includes('wood') || normalized.includes('pressure') || normalized.includes('treated')) {
    return 'pressure_treated_wood';
  }

  warnings.push(`Deck material "${value}" was not recognized; using pressure treated wood.`);
  return 'pressure_treated_wood';
}

function normalizeRampType(value: unknown, warnings: string[]): QuoteImportRampType {
  if (typeof value !== 'string') {
    warnings.push('Ramp type was not supplied; using ramp_with_rails.');
    return 'ramp_with_rails';
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized.includes('without') || normalized.includes('no_rail') || normalized === 'ramp_without_rails') {
    return 'ramp_without_rails';
  }

  if (normalized.includes('rail') || normalized === 'ramp' || normalized === 'ramp_with_rails') {
    return 'ramp_with_rails';
  }

  warnings.push(`Ramp type "${value}" was not recognized; using ramp_with_rails.`);
  return 'ramp_with_rails';
}

function normalizeRampMaterial(value: unknown, warnings: string[]): QuoteImportRampMaterial {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized.includes('aluminum') || normalized.includes('aluminium')) {
      return 'aluminum';
    }

    warnings.push(`Ramp material "${value}" was not recognized; using aluminum.`);
    return 'aluminum';
  }

  warnings.push('Ramp material was not supplied; using aluminum.');
  return 'aluminum';
}

function getQuoteId(root: JsonObject): string | undefined {
  const raw = root.quoteId ?? root.quoteNumber ?? root.id;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function hasRampSignal(root: JsonObject, rampObject: JsonObject | null): boolean {
  if (rampObject) {
    return true;
  }

  return (
    findValue([root], RAMP_ENABLED_ALIASES) !== undefined ||
    findValue([root], RAMP_TYPE_ALIASES) !== undefined ||
    findValue([root], ['rampLength', 'rampLengthFt', 'rampWidth', 'rampWidthFt']) !== undefined
  );
}

function normalizeQuoteImportData(root: JsonObject): QuoteImportResult {
  const warnings: string[] = [];
  const dockObject = firstObject(root, ['floatingDock', 'floating_dock', 'dock', 'dockItem']) ?? root;
  const rampObject = firstObject(root, ['ramp', 'accessRamp', 'rampItem']);
  const dockCandidates = [dockObject, root];
  const rampCandidates = rampObject ? [rampObject, root] : [root];

  const dockLengthFt = toNumber(findValue(dockCandidates, DOCK_LENGTH_ALIASES));
  const dockWidthFt = toNumber(findValue(dockCandidates, DOCK_WIDTH_ALIASES));

  if (!dockLengthFt || !dockWidthFt) {
    return {
      ok: false,
      error: 'Quote import needs a floating dock length and width in feet.',
      warnings,
    };
  }

  const tubeDiameterFt = toNumber(findValue(dockCandidates, TUBE_DIAMETER_ALIASES)) ?? 2;
  if (findValue(dockCandidates, TUBE_DIAMETER_ALIASES) === undefined) {
    warnings.push('Tube diameter was not supplied; using the standard 2 ft steel tube.');
  }

  const rampSignal = hasRampSignal(root, rampObject);
  const explicitRampEnabled = toBoolean(findValue(rampCandidates, RAMP_ENABLED_ALIASES));
  const rampEnabled = explicitRampEnabled ?? rampSignal;
  const rampLengthFt = toNumber(findValue(rampCandidates, RAMP_LENGTH_ALIASES));
  const rampWidthFt = toNumber(findValue(rampCandidates, RAMP_WIDTH_ALIASES));

  if (rampEnabled && (!rampLengthFt || !rampWidthFt)) {
    return {
      ok: false,
      error: 'Ramp is enabled, but the pasted quote data is missing a ramp length or ramp width in feet.',
      warnings,
    };
  }

  const normalized: NormalizedQuoteImportData = {
    quoteId: getQuoteId(root),
    dockLengthFt,
    dockWidthFt,
    deckMaterial: normalizeDeckMaterial(findValue(dockCandidates, DECK_MATERIAL_ALIASES), warnings),
    tubeDiameterFt,
    rampEnabled,
    rampType: rampEnabled ? normalizeRampType(findValue(rampCandidates, RAMP_TYPE_ALIASES), warnings) : 'ramp_with_rails',
    rampLengthFt: rampLengthFt ?? 24,
    rampWidthFt: rampWidthFt ?? 4,
    rampMaterial: rampEnabled ? normalizeRampMaterial(findValue(rampCandidates, RAMP_MATERIAL_ALIASES), warnings) : 'aluminum',
  };

  return {
    ok: true,
    configurations: buildConfigurations(normalized),
    normalized,
    warnings,
  };
}

function buildConfigurations(data: NormalizedQuoteImportData): ProductConfiguration[] {
  const quoteSuffix = data.quoteId ? data.quoteId.replace(/[^a-zA-Z0-9_-]/g, '-') : 'pasted';
  const floatingDockId = `quote-import-floating-dock-${quoteSuffix}`;
  const floatingDock: ProductConfiguration = {
    id: floatingDockId,
    source: 'quote',
    quoteLineItemId: data.quoteId ? `${data.quoteId}:floating-dock` : 'pasted-quote-floating-dock',
    productType: 'floating_dock',
    productFamily: 'kehoe_floating_dock',
    displayName: `Floating Dock, ${data.dockLengthFt} ft x ${data.dockWidthFt} ft`,
    quantity: 1,
    dimensions: {
      lengthFt: data.dockLengthFt,
      widthFt: data.dockWidthFt,
    },
    material: {
      deck: data.deckMaterial,
      frame: 'steel',
      finish: 'standard',
    },
    floatingDock: {
      layout: 'single',
      sectionRole: 'main',
      tubeType: 'standard_steel',
      tubeDiameterFt: data.tubeDiameterFt,
      tubeSpecificationText: `${data.tubeDiameterFt} ft steel floatation tubes`,
    },
    layout: {
      xFt: 0,
      yFt: 0,
      rotationDeg: 0,
    },
    notes: {
      customerWording: 'Generated from pasted quote-style JSON for internal 3D preview testing.',
    },
  };

  if (!data.rampEnabled) {
    return [floatingDock];
  }

  const hasRails = data.rampType === 'ramp_with_rails';
  return [
    floatingDock,
    {
      id: `quote-import-ramp-${quoteSuffix}`,
      source: 'quote',
      quoteLineItemId: data.quoteId ? `${data.quoteId}:ramp` : 'pasted-quote-ramp',
      productType: data.rampType,
      productFamily: hasRails ? 'kehoe_ramp_with_rails' : 'quote_ramp_without_rails',
      displayName: `${hasRails ? 'Ramp With Rails' : 'Ramp Without Rails'}, ${data.rampWidthFt} ft x ${data.rampLengthFt} ft`,
      quantity: 1,
      dimensions: {
        lengthFt: data.rampLengthFt,
        widthFt: data.rampWidthFt,
      },
      material: {
        deck: 'composite_grey',
        frame: data.rampMaterial,
        finish: 'standard',
      },
      ramp: {
        hasRails,
        connectionPoint: 'Dock edge',
      },
      layout: {
        xFt: 0,
        yFt: data.dockWidthFt / 2 + data.rampLengthFt / 2,
        rotationDeg: 0,
        connectedToId: floatingDockId,
        connectionEdge: 'bottom',
      },
      notes: {
        customerWording: 'Generated from pasted quote-style JSON for internal 3D preview testing.',
      },
    },
  ];
}

export function parseQuoteImportJson(rawText: string): QuoteImportResult {
  if (!rawText.trim()) {
    return {
      ok: false,
      error: 'Paste quote JSON before applying an import.',
      warnings: [],
    };
  }

  try {
    const parsed: unknown = JSON.parse(rawText);
    if (!isObject(parsed)) {
      return {
        ok: false,
        error: 'Quote import must be a JSON object.',
        warnings: [],
      };
    }

    return normalizeQuoteImportData(parsed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `Invalid JSON: ${error.message}` : 'Invalid JSON.',
      warnings: [],
    };
  }
}
