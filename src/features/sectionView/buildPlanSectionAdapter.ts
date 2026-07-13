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

function formatDimension(object: DockObject, scale: ProjectScale) {
  const length = objectLengthFeet(object, scale, 'width');
  const width = objectLengthFeet(object, scale, 'height');

  if (length === null || width === null) {
    return `${object.width.toFixed(0)} px x ${object.height.toFixed(0)} px`;
  }

  return `${length.toFixed(1)} ft x ${width.toFixed(1)} ft`;
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

  if (floatingDock) {
    detectedItems.push(`Floating dock: ${formatDimension(floatingDock, currentScale)}`);
  }

  if (ramp) {
    detectedItems.push(`Ramp: ${formatDimension(ramp, currentScale)}`);
  }

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
    structureSummary.push(`${accessoryCount} accessory item${accessoryCount === 1 ? '' : 's'} present`);
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
