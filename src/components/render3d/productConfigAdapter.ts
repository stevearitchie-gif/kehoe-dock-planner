import type { ProductConfiguration } from '@/components/render3d/productConfigTypes';
import type { DeckFinish, ProjectRenderElement, ProjectRenderElementType, ProjectRenderModel } from '@/components/render3d/types';

type RenderableProductConfigurationType = Extract<ProductConfiguration['productType'], ProjectRenderElementType>;

const DEFAULT_DOCK_LENGTH_FT = 20;
const DEFAULT_DOCK_WIDTH_FT = 8;
const DEFAULT_RAMP_LENGTH_FT = 24;
const DEFAULT_RAMP_WIDTH_FT = 4;
const DEFAULT_BOAT_PORT_LENGTH_FT = 12;
const DEFAULT_BOAT_PORT_WIDTH_FT = 6;

function isRenderableProductType(type: ProductConfiguration['productType']): type is RenderableProductConfigurationType {
  return (
    type === 'floating_dock' ||
    type === 'stationary_dock' ||
    type === 'ramp_with_rails' ||
    type === 'ramp_without_rails' ||
    type === 'boat_lift' ||
    type === 'boat_port'
  );
}

function toDeckFinish(config: ProductConfiguration): DeckFinish | undefined {
  if (config.material?.deck === 'composite_grey' || config.material?.deck === 'tru_north_pvc') {
    return 'composite-grey';
  }

  if (config.material?.deck === 'composite_brown') {
    return 'composite-brown';
  }

  if (config.material?.deck === 'pressure_treated_wood') {
    return 'pressure-treated';
  }

  return undefined;
}

function toRotationRadians(rotationDeg?: number) {
  return -((rotationDeg ?? 0) * Math.PI) / 180;
}

function buildBaseElement(config: ProductConfiguration, type: ProjectRenderElementType): Omit<ProjectRenderElement, 'length' | 'width'> {
  return {
    id: config.id,
    type,
    label: config.displayName,
    x: config.layout?.xFt ?? 0,
    z: config.layout?.yFt ?? 0,
    rotation: toRotationRadians(config.layout?.rotationDeg),
    color: '#9a8f63',
    opacity: 1,
    elevation: 0,
    scaleSourceLabel: 'quote ProductConfiguration dimensions',
    sourceX: config.layout?.xFt ?? 0,
    sourceY: config.layout?.yFt ?? 0,
    sourceCenterX: config.layout?.xFt ?? 0,
    sourceCenterY: config.layout?.yFt ?? 0,
    sourceWidth: config.dimensions?.widthFt ?? 0,
    sourceHeight: config.dimensions?.lengthFt ?? 0,
    sourceRotation: config.layout?.rotationDeg ?? 0,
    anchorInterpretation: 'quote standalone layout center in feet',
    deckFinish: toDeckFinish(config),
    tubeDiameterFt: config.floatingDock?.tubeDiameterFt,
    productSourceLabel: config.productFamily ?? config.source,
    boatPortWallHeightFt: config.boatPort?.wallHeightFt,
    boatPortRoofRiseFt: config.boatPort?.roofRiseFt,
    boatPortRoofType: config.boatPort?.roofType,
  };
}

function toRenderElement(config: ProductConfiguration): ProjectRenderElement | null {
  if (!isRenderableProductType(config.productType)) {
    return null;
  }

  const base = buildBaseElement(config, config.productType);

  if (config.productType === 'ramp_with_rails' || config.productType === 'ramp_without_rails') {
    // Existing ramp renderer expects local X as ramp width and local Z as ramp length.
    return {
      ...base,
      color: '#9ca3af',
      length: config.dimensions?.widthFt ?? DEFAULT_RAMP_WIDTH_FT,
      width: config.dimensions?.lengthFt ?? DEFAULT_RAMP_LENGTH_FT,
    };
  }

  if (config.productType === 'boat_lift') {
    return {
      ...base,
      color: '#0e7490',
      length: config.dimensions?.lengthFt ?? 10,
      width: config.dimensions?.widthFt ?? 8,
    };
  }

  if (config.productType === 'boat_port') {
    return {
      ...base,
      color: '#dbeafe',
      length: config.dimensions?.lengthFt ?? DEFAULT_BOAT_PORT_LENGTH_FT,
      width: config.dimensions?.widthFt ?? DEFAULT_BOAT_PORT_WIDTH_FT,
    };
  }

  return {
    ...base,
    length: config.dimensions?.lengthFt ?? DEFAULT_DOCK_LENGTH_FT,
    width: config.dimensions?.widthFt ?? DEFAULT_DOCK_WIDTH_FT,
  };
}

export function buildProductConfigurationRenderModel(configurations: ProductConfiguration[]): ProjectRenderModel {
  const elements = configurations.map(toRenderElement).filter((element): element is ProjectRenderElement => Boolean(element));
  const unsupportedTypes = Array.from(
    new Set(configurations.filter((config) => !isRenderableProductType(config.productType)).map((config) => config.productType)),
  );

  return {
    projectName: 'Quote Product Preview',
    elements,
    sourceUnitLabel: 'quote ProductConfiguration dimensions (ft)',
    hasProjectScale: true,
    scalePixels: null,
    scaleRealLength: null,
    scaleUnit: 'ft',
    unsupportedCount: configurations.length - elements.length,
    unsupportedTypes,
  };
}
