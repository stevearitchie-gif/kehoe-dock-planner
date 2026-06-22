import type { DockObject, DockObjectType, DockProject } from '@/types/dock';
import type { ProjectRenderElement, ProjectRenderElementType, ProjectRenderModel } from '@/components/render3d/types';

const FEET_PER_METER = 3.28084;
const FALLBACK_PIXELS_PER_FOOT = 20;

const supportedObjectTypes = new Set<DockObjectType>([
  'floating_dock',
  'stationary_dock',
  'ramp_with_rails',
  'ramp_without_rails',
  'steps',
  'boat_lift',
  'roof_overlay',
]);

function isProjectRenderElementType(type: DockObjectType): type is ProjectRenderElementType {
  return supportedObjectTypes.has(type);
}

function getFeetPerPixel(project: DockProject): { feetPerPixel: number; sourceUnitLabel: string; hasProjectScale: boolean } {
  const scale = project.scale;

  if (scale && scale.pixels > 0 && scale.realLength > 0) {
    const realLengthInFeet = scale.unit === 'm' ? scale.realLength * FEET_PER_METER : scale.realLength;
    return {
      feetPerPixel: realLengthInFeet / scale.pixels,
      sourceUnitLabel: `project scale (${scale.unit})`,
      hasProjectScale: true,
    };
  }

  return {
    feetPerPixel: 1 / FALLBACK_PIXELS_PER_FOOT,
    sourceUnitLabel: 'fallback scale',
    hasProjectScale: false,
  };
}

function getObjectCenter(object: DockObject) {
  return {
    x: object.x + object.width / 2,
    y: object.y + object.height / 2,
  };
}

export function buildProjectRenderModel(project: DockProject): ProjectRenderModel | null {
  const supportedObjects = project.objects.filter((object) => isProjectRenderElementType(object.type));
  const unsupportedTypes = Array.from(
    new Set(project.objects.filter((object) => !isProjectRenderElementType(object.type)).map((object) => object.type)),
  ).sort();

  if (supportedObjects.length === 0) {
    return null;
  }

  const { feetPerPixel, sourceUnitLabel, hasProjectScale } = getFeetPerPixel(project);
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
      elevation: object.metadata?.elevation ?? 0,
    };
  });

  return {
    projectName: project.name,
    elements,
    sourceUnitLabel,
    hasProjectScale,
    unsupportedCount: project.objects.length - supportedObjects.length,
    unsupportedTypes,
  };
}
