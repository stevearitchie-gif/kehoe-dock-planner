import type { SectionViewData, SectionViewTemplateId } from '@/features/sectionView/sectionTypes';

export const sectionTemplates: Record<SectionViewTemplateId, SectionViewData> = {
  build_plan_reference: {
    templateId: 'build_plan_reference',
    title: 'Dock / Ramp Reference Section',
    waterLevelFt: 0,
    shorelineHeightFt: 0,
    lakebedDropFt: 0,
    ripRapDepthFt: 0,
    armourStoneRows: 0,
    showRipRap: false,
    showArmourStone: false,
    showDockReference: true,
    showDimensions: false,
    showWaterLines: false,
    showProfileLines: false,
    showGradeProfile: false,
    showLakebedProfile: false,
    notes: 'Build Plan data loaded where available. Shoreline profile, water levels, stone, rip rap, armour stone, and permit details remain manual.',
  },
  rip_rap: {
    templateId: 'rip_rap',
    title: 'Rip Rap Shoreline Section',
    waterLevelFt: 0,
    shorelineHeightFt: 3,
    lakebedDropFt: 4,
    ripRapDepthFt: 1.5,
    armourStoneRows: 0,
    showRipRap: true,
    showArmourStone: false,
    showDockReference: false,
    showDimensions: true,
    showWaterLines: true,
    showProfileLines: true,
    showGradeProfile: true,
    showLakebedProfile: true,
    notes: 'Permit-support visual only. Final design subject to site conditions and approvals.',
  },
  armour_stone: {
    templateId: 'armour_stone',
    title: 'Armour Stone Shoreline Section',
    waterLevelFt: 0,
    shorelineHeightFt: 4,
    lakebedDropFt: 3.5,
    ripRapDepthFt: 0.8,
    armourStoneRows: 3,
    showRipRap: true,
    showArmourStone: true,
    showDockReference: false,
    showDimensions: true,
    showWaterLines: true,
    showProfileLines: true,
    showGradeProfile: true,
    showLakebedProfile: true,
    notes: 'Armour stone layout is a visual placeholder for permit discussion.',
  },
  floating_dock_shoreline: {
    templateId: 'floating_dock_shoreline',
    title: 'Floating Dock / Shoreline Section',
    waterLevelFt: 0,
    shorelineHeightFt: 2.5,
    lakebedDropFt: 4.5,
    ripRapDepthFt: 1,
    armourStoneRows: 0,
    showRipRap: true,
    showArmourStone: false,
    showDockReference: true,
    showDimensions: true,
    showWaterLines: true,
    showProfileLines: true,
    showGradeProfile: true,
    showLakebedProfile: true,
    notes: 'Floating dock reference is schematic and not to scale.',
  },
};

export function getDefaultSectionView(): SectionViewData {
  return { ...sectionTemplates.build_plan_reference };
}

export function applySectionTemplate(templateId: SectionViewTemplateId): SectionViewData {
  return { ...sectionTemplates[templateId] };
}
