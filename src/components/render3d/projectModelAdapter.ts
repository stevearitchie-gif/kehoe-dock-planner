import type { DockObject, DockObjectType, DockProject } from '@/types/dock';
import type {
  AccessoryFinish,
  AccessoryType,
  BoatPortRoofType,
  BoathouseDoorStyle,
  BoathouseRoofFinish,
  BoathouseRoofType,
  BoathouseSlipCount,
  BoathouseWallFinish,
  FloatingDockBoardDirection,
  ProjectRenderElement,
  ProjectRenderElementType,
  ProjectRenderModel,
} from '@/components/render3d/types';

const FEET_PER_METER = 3.28084;
const FALLBACK_PIXELS_PER_FOOT = 20;

const supportedObjectTypes = new Set<DockObjectType>([
  'floating_dock',
  'stationary_dock',
  'custom_stationary_dock',
  'ramp_with_rails',
  'ramp_without_rails',
  'steps',
  'boat_lift',
  'boat_port',
  'boathouse',
  'accessory',
  'roof_overlay',
]);

function isProjectRenderElementType(type: DockObjectType): type is ProjectRenderElementType {
  return supportedObjectTypes.has(type);
}

function getFeetPerPixel(project: DockProject): {
  feetPerPixel: number;
  sourceUnitLabel: string;
  hasProjectScale: boolean;
  scalePixels: number | null;
  scaleRealLength: number | null;
  scaleUnit: string | null;
} {
  const scale = project.scale;
  const scalePixels = Number(scale?.pixels);
  const scaleRealLength = Number(scale?.realLength);

  if (scale && Number.isFinite(scalePixels) && Number.isFinite(scaleRealLength) && scalePixels > 0 && scaleRealLength > 0) {
    const realLengthInFeet = scale.unit === 'm' ? scaleRealLength * FEET_PER_METER : scaleRealLength;
    return {
      feetPerPixel: realLengthInFeet / scalePixels,
      sourceUnitLabel: `${scalePixels.toFixed(0)} px = ${scaleRealLength} ${scale.unit}`,
      hasProjectScale: true,
      scalePixels,
      scaleRealLength,
      scaleUnit: scale.unit,
    };
  }

  return {
    feetPerPixel: 1 / FALLBACK_PIXELS_PER_FOOT,
    sourceUnitLabel: 'fallback scale',
    hasProjectScale: false,
    scalePixels: Number.isFinite(scalePixels) ? scalePixels : null,
    scaleRealLength: Number.isFinite(scaleRealLength) ? scaleRealLength : null,
    scaleUnit: scale?.unit ?? null,
  };
}

function getObjectCenter(object: DockObject) {
  const rotationRadians = (object.rotation * Math.PI) / 180;
  const halfWidth = object.width / 2;
  const halfHeight = object.height / 2;

  return {
    x: object.x + halfWidth * Math.cos(rotationRadians) - halfHeight * Math.sin(rotationRadians),
    y: object.y + halfWidth * Math.sin(rotationRadians) + halfHeight * Math.cos(rotationRadians),
  };
}

function getPlatformBoardDirection(object: DockObject): FloatingDockBoardDirection | undefined {
  if (object.type !== 'floating_dock' && object.type !== 'stationary_dock' && object.type !== 'custom_stationary_dock') {
    return undefined;
  }

  const boardDirection = object.metadata?.boardDirection;
  if (boardDirection === 'none' || boardDirection === 'horizontal' || boardDirection === 'vertical') {
    return boardDirection;
  }

  return undefined;
}

function getFloatingDockShowStandardCleats(object: DockObject): boolean | undefined {
  if (object.type !== 'floating_dock') {
    return undefined;
  }

  return object.metadata?.showStandardCleats;
}

function getDockShowSideBumper(object: DockObject): boolean | undefined {
  if (object.type !== 'floating_dock' && object.type !== 'stationary_dock' && object.type !== 'custom_stationary_dock') {
    return undefined;
  }

  return object.metadata?.showSideBumper;
}

function getDockVerticalStavingEnabled(object: DockObject): boolean | undefined {
  if (object.type !== 'floating_dock' && object.type !== 'stationary_dock' && object.type !== 'custom_stationary_dock') {
    return undefined;
  }

  return object.metadata?.verticalStavingEnabled;
}

function getDockVerticalStavingColor(object: DockObject): string | undefined {
  if (object.type !== 'floating_dock' && object.type !== 'stationary_dock' && object.type !== 'custom_stationary_dock') {
    return undefined;
  }

  const color = object.metadata?.verticalStavingColor?.trim();
  return color || undefined;
}

function getBoatPortRoofType(object: DockObject): BoatPortRoofType | undefined {
  if (object.type !== 'boat_port') {
    return undefined;
  }

  const roofType = object.metadata?.boatPortRoofType;
  return roofType === 'flat' || roofType === 'pitched' ? roofType : undefined;
}

function getBoathouseRoofType(object: DockObject): BoathouseRoofType | undefined {
  if (object.type !== 'boathouse') {
    return undefined;
  }

  const roofType = object.metadata?.boathouseRoofType;
  return roofType === 'flat' || roofType === 'gable' ? roofType : undefined;
}

function getBoathouseSlipCount(object: DockObject): BoathouseSlipCount | undefined {
  if (object.type !== 'boathouse') {
    return undefined;
  }

  const slipCount = object.metadata?.boathouseSlipCount;
  return slipCount === 1 || slipCount === 2 ? slipCount : undefined;
}

function getBoathouseDoorStyle(object: DockObject): BoathouseDoorStyle | undefined {
  if (object.type !== 'boathouse') {
    return undefined;
  }

  const doorStyle = object.metadata?.boathouseDoorStyle;
  return doorStyle === 'open' || doorStyle === 'single_door' || doorStyle === 'double_doors' || doorStyle === 'two_slip_doors' || doorStyle === 'none'
    ? doorStyle
    : undefined;
}

function getBoathouseWallFinish(object: DockObject): BoathouseWallFinish | undefined {
  if (object.type !== 'boathouse') {
    return undefined;
  }

  const wallFinish = object.metadata?.boathouseWallFinish;
  return wallFinish === 'neutral' || wallFinish === 'wood' || wallFinish === 'metal' ? wallFinish : undefined;
}

function getBoathouseRoofFinish(object: DockObject): BoathouseRoofFinish | undefined {
  if (object.type !== 'boathouse') {
    return undefined;
  }

  const roofFinish = object.metadata?.boathouseRoofFinish;
  return roofFinish === 'neutral' || roofFinish === 'metal' || roofFinish === 'shingle' ? roofFinish : undefined;
}

function getAccessoryType(object: DockObject): AccessoryType | undefined {
  if (object.type !== 'accessory') {
    return undefined;
  }

  const accessoryType = object.metadata?.accessoryType;
  return accessoryType === 'cleat' ||
    accessoryType === 'bumper' ||
    accessoryType === 'ladder' ||
    accessoryType === 'bench' ||
    accessoryType === 'post' ||
    accessoryType === 'tie_up_point'
    ? accessoryType
    : undefined;
}

function getAccessoryFinish(object: DockObject): AccessoryFinish | undefined {
  if (object.type !== 'accessory') {
    return undefined;
  }

  const accessoryFinish = object.metadata?.accessoryFinish;
  return accessoryFinish === 'metal' || accessoryFinish === 'rubber' || accessoryFinish === 'wood' || accessoryFinish === 'neutral'
    ? accessoryFinish
    : undefined;
}

function getPositiveMetadataNumber(value: unknown): number | undefined {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

function getCustomFootprintPoints(object: DockObject, feetPerPixel: number): Array<{ x: number; z: number }> | undefined {
  if (object.type !== 'custom_stationary_dock') {
    return undefined;
  }

  const sourcePoints = object.metadata?.customPoints;
  const points = Array.isArray(sourcePoints) && sourcePoints.length >= 3
    ? sourcePoints
    : [
        { x: 0, y: 0 },
        { x: object.width, y: 0 },
        { x: object.width, y: object.height },
        { x: 0, y: object.height },
      ];

  const localPoints = points
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map((point) => ({
      x: (Math.max(0, Math.min(object.width, point.x)) - object.width / 2) * feetPerPixel,
      z: (Math.max(0, Math.min(object.height, point.y)) - object.height / 2) * feetPerPixel,
    }));

  return localPoints.length >= 3 ? localPoints : undefined;
}

export function buildProjectRenderModel(project: DockProject): ProjectRenderModel | null {
  const supportedObjects = project.objects.filter((object) => isProjectRenderElementType(object.type));
  const unsupportedTypes = Array.from(
    new Set(project.objects.filter((object) => !isProjectRenderElementType(object.type)).map((object) => object.type)),
  ).sort();

  if (supportedObjects.length === 0) {
    return null;
  }

  const { feetPerPixel, sourceUnitLabel, hasProjectScale, scalePixels, scaleRealLength, scaleUnit } = getFeetPerPixel(project);
  const centers = supportedObjects.map(getObjectCenter);
  const originX = centers.reduce((total, point) => total + point.x, 0) / centers.length;
  const originY = centers.reduce((total, point) => total + point.y, 0) / centers.length;

  const elements: ProjectRenderElement[] = supportedObjects.map((object) => {
    const center = getObjectCenter(object);

    return {
      id: object.id,
      type: object.type as ProjectRenderElementType,
      label: object.label,
      x: (center.x - originX) * feetPerPixel,
      z: (center.y - originY) * feetPerPixel,
      length: Math.max(0.5, object.width * feetPerPixel),
      width: Math.max(0.5, object.height * feetPerPixel),
      rotation: -(object.rotation * Math.PI) / 180,
      color: object.color || '#9a8f63',
      opacity: object.opacity ?? 1,
      elevation: 0,
      scaleSourceLabel: hasProjectScale ? 'project scale' : 'fallback scale',
      sourceX: object.x,
      sourceY: object.y,
      sourceCenterX: center.x,
      sourceCenterY: center.y,
      sourceWidth: object.width,
      sourceHeight: object.height,
      sourceRotation: object.rotation,
      anchorInterpretation: 'top-left group origin, center adjusted for rotation',
      customFootprintPoints: getCustomFootprintPoints(object, feetPerPixel),
      boardDirection: getPlatformBoardDirection(object),
      showStandardCleats: getFloatingDockShowStandardCleats(object),
      showSideBumper: getDockShowSideBumper(object),
      verticalStavingEnabled: getDockVerticalStavingEnabled(object),
      verticalStavingColor: getDockVerticalStavingColor(object),
      verticalStavingSpacingFt: getPositiveMetadataNumber(object.metadata?.verticalStavingSpacingFt),
      boatPortWallHeightFt: getPositiveMetadataNumber(object.metadata?.boatPortWallHeightFt),
      boatPortRoofRiseFt: getPositiveMetadataNumber(object.metadata?.boatPortRoofRiseFt),
      boatPortRoofType: getBoatPortRoofType(object),
      boatPortPostSideInsetFt: getPositiveMetadataNumber(object.metadata?.boatPortPostSideInsetFt),
      boatPortPostEndInsetFt: getPositiveMetadataNumber(object.metadata?.boatPortPostEndInsetFt),
      boathouseWallHeightFt: getPositiveMetadataNumber(object.metadata?.boathouseWallHeightFt),
      boathouseRoofRiseFt: getPositiveMetadataNumber(object.metadata?.boathouseRoofRiseFt),
      boathouseRoofType: getBoathouseRoofType(object),
      boathouseSlipCount: getBoathouseSlipCount(object),
      boathouseDoorStyle: getBoathouseDoorStyle(object),
      boathouseWallFinish: getBoathouseWallFinish(object),
      boathouseRoofFinish: getBoathouseRoofFinish(object),
      accessoryType: getAccessoryType(object),
      accessoryFinish: getAccessoryFinish(object),
    };
  });

  const shorelinePoints = project.shorelinePoints
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map((point) => ({
      x: (point.x - originX) * feetPerPixel,
      z: (point.y - originY) * feetPerPixel,
      sourceX: point.x,
      sourceY: point.y,
    }));

  return {
    projectName: project.name,
    elements,
    shorelinePoints,
    sourceUnitLabel,
    hasProjectScale,
    scalePixels,
    scaleRealLength,
    scaleUnit,
    unsupportedCount: project.objects.length - supportedObjects.length,
    unsupportedTypes,
  };
}
