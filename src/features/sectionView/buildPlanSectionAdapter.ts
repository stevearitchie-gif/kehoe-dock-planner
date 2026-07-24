import type { DockObject, DockProject, ProjectScale } from '@/types/dock';
import type { SectionViewBuildPlanReference, SectionViewData } from '@/features/sectionView/sectionTypes';
import { sectionTemplates } from '@/features/sectionView/sectionTemplates';

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

function objectProfileDimensionsFeet(object: DockObject, scale: ProjectScale) {
  const widthFt = objectLengthFeet(object, scale, 'width');
  const heightFt = objectLengthFeet(object, scale, 'height');

  if (widthFt === null || heightFt === null) {
    return undefined;
  }

  return {
    lengthFt: Math.max(widthFt, heightFt),
    widthFt: Math.min(widthFt, heightFt),
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

function formatProfileDimension(object: DockObject, scale: ProjectScale) {
  const dimensions = objectProfileDimensionsFeet(object, scale);

  if (!dimensions) {
    return formatDimension(object, scale);
  }

  return `${dimensions.lengthFt.toFixed(1)} ft x ${dimensions.widthFt.toFixed(1)} ft`;
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

function objectReferenceDimensionsFeet(object: DockObject, scale: ProjectScale) {
  const dimensions = objectProfileDimensionsFeet(object, scale);

  if (dimensions) {
    return dimensions;
  }

  return {
    lengthFt: object.width,
    widthFt: object.height,
  };
}

function buildPlanReference(object: DockObject, scale: ProjectScale): SectionViewBuildPlanReference | null {
  if (
    object.type !== 'floating_dock' &&
    object.type !== 'ramp_with_rails' &&
    object.type !== 'ramp_without_rails' &&
    object.type !== 'boat_lift' &&
    object.type !== 'boat_port' &&
    object.type !== 'boathouse' &&
    object.type !== 'accessory'
  ) {
    return null;
  }

  const dimensions = objectReferenceDimensionsFeet(object, scale);
  const details =
    object.type === 'floating_dock'
      ? formatBoardDirection(object)
      : object.type === 'boat_port'
        ? formatBoatPortDetails(object)
        : object.type === 'boathouse'
          ? formatBoathouseDetails(object)
          : object.type === 'accessory'
            ? formatAccessoryType(object.metadata?.accessoryType)
            : undefined;

  return {
    id: object.id,
    type: object.type,
    label: object.label || object.type.replace(/_/g, ' '),
    lengthFt: dimensions.lengthFt,
    widthFt: dimensions.widthFt,
    color: object.color,
    boardDirection: object.metadata?.boardDirection,
    details,
    source: 'buildPlan',
  };
}

function firstOfType(project: DockProject, types: DockObject['type'][]): DockObject | undefined {
  return project.objects.find((object) => types.includes(object.type));
}

function countTypes(project: DockProject, types: DockObject['type'][]): number {
  return project.objects.filter((object) => types.includes(object.type)).length;
}

function applyGeneratedLabel(
  labelOverrides: Record<string, string>,
  id: string,
  nextValue: string | undefined,
  previousGeneratedValues: string[],
) {
  if (!nextValue) {
    return;
  }

  const currentValue = labelOverrides[id];
  if (!currentValue || previousGeneratedValues.includes(currentValue)) {
    labelOverrides[id] = nextValue;
  }
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
  const floatingDockDimensions = floatingDock ? objectProfileDimensionsFeet(floatingDock, currentScale) : undefined;
  const rampDimensions = ramp ? objectProfileDimensionsFeet(ramp, currentScale) : undefined;
  const primaryReferenceIds = new Set([floatingDock?.id, ramp?.id].filter(Boolean));
  const buildPlanReferences = project.objects
    .filter((object) => !primaryReferenceIds.has(object.id))
    .map((object) => buildPlanReference(object, currentScale))
    .filter((reference): reference is SectionViewBuildPlanReference => Boolean(reference));

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

  const hasManualShorelineTemplate =
    currentSectionView.templateId === 'rip_rap' ||
    currentSectionView.templateId === 'armour_stone' ||
    currentSectionView.templateId === 'floating_dock_shoreline';
  const buildPlanReferenceTemplate = sectionTemplates.build_plan_reference;
  const nextLabelOverrides = { ...(currentSectionView.labelOverrides ?? {}) };

  applyGeneratedLabel(
    nextLabelOverrides,
    'callout-dock',
    floatingDock ? `FLOATING DOCK ${formatProfileDimension(floatingDock, currentScale)}` : undefined,
    floatingDock
      ? [
        `FLOATING DOCK ${formatDimension(floatingDock, currentScale)}`,
        `FLOATING DOCK ${formatProfileDimension(floatingDock, currentScale)}`,
      ]
      : [],
  );
  applyGeneratedLabel(
    nextLabelOverrides,
    'callout-ramp',
    ramp ? `${formatRampType(ramp.type).toUpperCase()} ${formatProfileDimension(ramp, currentScale)}` : undefined,
    ramp
      ? [
        `${ramp.type.replace(/_/g, ' ').toUpperCase()} ${formatDimension(ramp, currentScale)}`,
        `${formatRampType(ramp.type).toUpperCase()} ${formatProfileDimension(ramp, currentScale)}`,
      ]
      : [],
  );

  return {
    ...currentSectionView,
    templateId: hasManualShorelineTemplate ? currentSectionView.templateId : 'build_plan_reference',
    title:
      currentSectionView.title.trim().length === 0 || currentSectionView.templateId === 'build_plan_reference'
        ? buildPlanReferenceTemplate.title
        : currentSectionView.title,
    showDockReference: floatingDock || ramp ? true : currentSectionView.showDockReference,
    showRipRap: hasManualShorelineTemplate ? currentSectionView.showRipRap : false,
    showArmourStone: hasManualShorelineTemplate ? currentSectionView.showArmourStone : false,
    showDimensions: hasManualShorelineTemplate ? currentSectionView.showDimensions : false,
    showWaterLines: hasManualShorelineTemplate ? currentSectionView.showWaterLines : false,
    showProfileLines: hasManualShorelineTemplate ? currentSectionView.showProfileLines : false,
    showGradeProfile: hasManualShorelineTemplate
      ? currentSectionView.showGradeProfile ?? currentSectionView.showProfileLines
      : false,
    showLakebedProfile: hasManualShorelineTemplate
      ? currentSectionView.showLakebedProfile ?? currentSectionView.showProfileLines
      : false,
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
    buildPlanReferences,
    labelOverrides: nextLabelOverrides,
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
        : buildPlanReferenceTemplate.notes,
  };
}
