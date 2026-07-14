import type { DockObject, DockProject, ProjectScale } from '@/types/dock';
import type { SectionViewData } from '@/features/sectionView/sectionTypes';

const FEET_PER_METER = 3.28084;

function hasScale(scale: ProjectScale): boolean {
  return scale.pixels > 0 && scale.realLength > 0;
}

function objectLengthFeet(object: DockObject, scale: ProjectScale, axis: 'width' | 'height') {
  if (!hasScale(scale)) {
    return null;
  }

  const lengthInScaleUnits = (object[axis] / scale.pixels) * scale.realLength;
  return scale.unit === 'm' ? lengthInScaleUnits * FEET_PER_METER : lengthInScaleUnits;
}

function objectDimensionsFeet(object: DockObject, scale: ProjectScale) {
  return {
    lengthFt: objectLengthFeet(object, scale, 'width') ?? undefined,
    widthFt: objectLengthFeet(object, scale, 'height') ?? undefined,
  };
}

function formatDimension(object: DockObject, scale: ProjectScale) {
  const length = objectLengthFeet(object, scale, 'width');
  const width = objectLengthFeet(object, scale, 'height');

  if (length === null || width === null) {
    return `${object.width.toFixed(0)} px x ${object.height.toFixed(0)} px`;
  }

  return `${length.toFixed(1)} ft x ${width.toFixed(1)} ft`;
}

function formatObjectSize(object: DockObject, scale: ProjectScale) {
  return formatDimension(object, scale);
}

function formatBoardDirection(object: DockObject) {
  if (object.metadata?.boardDirection === 'vertical') {
    return 'boards lengthwise';
  }

  if (object.metadata?.boardDirection === 'horizontal') {
    return 'boards across';
  }

  if (object.metadata?.boardDirection === 'none') {
    return 'boards hidden';
  }

  return undefined;
}

function formatRampType(type: DockObject['type']) {
  if (type === 'ramp_with_rails') {
    return 'ramp with rails';
  }

  if (type === 'ramp_without_rails') {
    return 'ramp without rails';
  }

  return 'ramp';
}

function formatBoatPortDetails(object: DockObject) {
  const details = [
    object.metadata?.boatPortWallHeightFt ? `wall ${object.metadata.boatPortWallHeightFt} ft` : undefined,
    object.metadata?.boatPortRoofRiseFt ? `roof rise ${object.metadata.boatPortRoofRiseFt} ft` : undefined,
    object.metadata?.boatPortRoofType ? `${object.metadata.boatPortRoofType} roof` : undefined,
  ].filter(Boolean);

  return details.length > 0 ? details.join(', ') : undefined;
}

function formatBoathouseDetails(object: DockObject) {
  const details = [
    object.metadata?.boathouseWallHeightFt ? `wall ${object.metadata.boathouseWallHeightFt} ft` : undefined,
    object.metadata?.boathouseRoofRiseFt ? `roof rise ${object.metadata.boathouseRoofRiseFt} ft` : undefined,
    object.metadata?.boathouseRoofType ? `${object.metadata.boathouseRoofType} roof` : undefined,
    object.metadata?.boathouseSlipCount ? `${object.metadata.boathouseSlipCount} slip${object.metadata.boathouseSlipCount === 1 ? '' : 's'}` : undefined,
    object.metadata?.boathouseDoorStyle ? `door ${object.metadata.boathouseDoorStyle.replace(/_/g, ' ')}` : undefined,
  ].filter(Boolean);

  return details.length > 0 ? details.join(', ') : undefined;
}

function formatAccessoryType(type: string | undefined) {
  return type ? type.replace(/_/g, ' ') : 'accessory';
}

function accessorySummary(project: DockProject) {
  const counts = new Map<string, number>();
  project.objects
    .filter((object) => object.type === 'accessory')
    .forEach((object) => {
      const type = formatAccessoryType(object.metadata?.accessoryType);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    });

  return Array.from(counts.entries()).map(([type, count]) => `${count} ${type}${count === 1 ? '' : 's'}`);
}

function elementSummary(object: DockObject, scale: ProjectScale) {
  const size = formatObjectSize(object, scale);
  const sizeSuffix = size ? `, ${size}` : ', size not set';

  if (object.type === 'floating_dock') {
    const boardDirection = formatBoardDirection(object);
    return `Floating dock${sizeSuffix}${boardDirection ? `, ${boardDirection}` : ''}`;
  }

  if (object.type === 'ramp_with_rails' || object.type === 'ramp_without_rails') {
    return `${formatRampType(object.type)}${sizeSuffix}`;
  }

  if (object.type === 'boat_lift') {
    return `Boat lift${sizeSuffix}`;
  }

  if (object.type === 'boat_port') {
    const details = formatBoatPortDetails(object);
    return `Boat port${sizeSuffix}${details ? `, ${details}` : ''}`;
  }

  if (object.type === 'boathouse') {
    const details = formatBoathouseDetails(object);
    return `Boathouse${sizeSuffix}${details ? `, ${details}` : ''}`;
  }

  return `${object.label || object.type}${sizeSuffix}`;
}

function firstOfType(project: DockProject, types: DockObject['type'][]): DockObject | undefined {
  return project.objects.find((object) => types.includes(object.type));
}

function countTypes(project: DockProject, types: DockObject['type'][]): number {
  return project.objects.filter((object) => types.includes(object.type)).length;
}

export function generateSectionViewFromBuildPlan(
  project: DockProject,
  currentScale: ProjectScale,
  currentSectionView: SectionViewData,
): SectionViewData {
  const floatingDock = firstOfType(project, ['floating_dock']);
  const ramp = firstOfType(project, ['ramp_with_rails', 'ramp_without_rails']);
  const boatLiftCount = countTypes(project, ['boat_lift']);
  const boatPortCount = countTypes(project, ['boat_port']);
  const boathouseCount = countTypes(project, ['boathouse']);
  const accessoryCount = countTypes(project, ['accessory']);
  const detectedItems: string[] = [];
  const structureSummary: string[] = [];
  const supportedObjects = project.objects.filter((object) =>
    ['floating_dock', 'ramp_with_rails', 'ramp_without_rails', 'boat_lift', 'boat_port', 'boathouse'].includes(object.type),
  );
  const floatingDockDimensions = floatingDock ? objectDimensionsFeet(floatingDock, currentScale) : undefined;
  const rampDimensions = ramp ? objectDimensionsFeet(ramp, currentScale) : undefined;

  detectedItems.push(...supportedObjects.map((object) => elementSummary(object, currentScale)));

  if (boatLiftCount > 0) {
    structureSummary.push(`${boatLiftCount} boat lift${boatLiftCount === 1 ? '' : 's'} present`);
  }

  if (boatPortCount > 0) {
    structureSummary.push(`${boatPortCount} boat port${boatPortCount === 1 ? '' : 's'} present`);
  }

  if (boathouseCount > 0) {
    structureSummary.push(`${boathouseCount} boathouse${boathouseCount === 1 ? '' : 's'} present`);
  }

  if (accessoryCount > 0) {
    const accessories = accessorySummary(project);
    structureSummary.push(`Accessories: ${accessories.length > 0 ? accessories.join(', ') : `${accessoryCount} item${accessoryCount === 1 ? '' : 's'}`}`);
  }

  if (structureSummary.length > 0) {
    detectedItems.push(...structureSummary);
  }

  if (project.shorelinePoints.length >= 2) {
    detectedItems.push(`Shoreline points: ${project.shorelinePoints.length}`);
  }

  if (detectedItems.length === 0) {
    detectedItems.push('No supported Build Plan objects detected yet');
  }

  return {
    ...currentSectionView,
    templateId: floatingDock ? 'floating_dock_shoreline' : currentSectionView.templateId,
    title: floatingDock && currentSectionView.title.trim().length === 0 ? 'Floating Dock / Shoreline Section' : currentSectionView.title,
    showDockReference: floatingDock ? true : currentSectionView.showDockReference,
    dockRampReference: floatingDock || ramp
      ? {
        source: currentSectionView.dockRampReference?.source === 'manual' ? 'manual' : 'buildPlan',
        dockLengthFt: currentSectionView.dockRampReference?.source === 'manual' ? currentSectionView.dockRampReference.dockLengthFt : floatingDockDimensions?.lengthFt,
        dockWidthFt: currentSectionView.dockRampReference?.source === 'manual' ? currentSectionView.dockRampReference.dockWidthFt : floatingDockDimensions?.widthFt,
        rampLengthFt: currentSectionView.dockRampReference?.source === 'manual' ? currentSectionView.dockRampReference.rampLengthFt : rampDimensions?.lengthFt,
        rampWidthFt: currentSectionView.dockRampReference?.source === 'manual' ? currentSectionView.dockRampReference.rampWidthFt : rampDimensions?.widthFt,
        rampType: currentSectionView.dockRampReference?.source === 'manual'
          ? currentSectionView.dockRampReference.rampType
          : ramp?.type === 'ramp_with_rails'
            ? 'with_rails'
            : ramp?.type === 'ramp_without_rails'
              ? 'without_rails'
              : 'unknown',
      }
      : currentSectionView.dockRampReference,
    labelOverrides: {
      ...(floatingDock && !currentSectionView.labelOverrides?.['callout-dock']
        ? { 'callout-dock': `FLOATING DOCK ${formatDimension(floatingDock, currentScale)}` }
        : {}),
      ...(ramp && !currentSectionView.labelOverrides?.['callout-ramp'] ? { 'callout-ramp': `${ramp.type.replace(/_/g, ' ').toUpperCase()} ${formatDimension(ramp, currentScale)}` } : {}),
      ...(currentSectionView.labelOverrides ?? {}),
    },
    buildPlanSummary: {
      generatedAt: new Date().toISOString(),
      hasProjectScale: hasScale(currentScale),
      scaleLabel: hasScale(currentScale) ? `${currentScale.pixels.toFixed(0)} px = ${currentScale.realLength} ${currentScale.unit}` : 'No project scale set',
      detectedItems,
      floatingDockLabel: floatingDock ? `${floatingDock.label}: ${formatDimension(floatingDock, currentScale)}` : undefined,
      rampLabel: ramp ? `${ramp.label}: ${formatDimension(ramp, currentScale)}` : undefined,
      structureSummary,
    },
    notes:
      currentSectionView.notes?.trim()
        ? currentSectionView.notes
        : 'Build Plan data loaded where available. Shoreline profile, stone depth, slope, and permit labels remain manual.',
  };
}
