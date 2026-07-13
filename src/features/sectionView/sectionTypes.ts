export type SectionViewTemplateId = 'rip_rap' | 'armour_stone' | 'floating_dock_shoreline';

export interface SectionViewData {
  templateId: SectionViewTemplateId;
  title: string;
  waterLevelFt: number;
  shorelineHeightFt: number;
  lakebedDropFt: number;
  ripRapDepthFt: number;
  armourStoneRows: number;
  showRipRap: boolean;
  showArmourStone: boolean;
  showDockReference: boolean;
  showDimensions: boolean;
  notes?: string;
}

