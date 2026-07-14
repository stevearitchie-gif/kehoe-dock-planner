export type SectionViewTemplateId = 'rip_rap' | 'armour_stone' | 'floating_dock_shoreline';

export interface SectionViewManualOffset {
  x: number;
  y: number;
}

export interface SectionViewManualTransform {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface SectionViewRipRapSettings {
  x: number;
  y: number;
  length: number;
  depth: number;
  slopeDegrees: number;
  stoneSize: number;
  density: number;
  showFilterLayer: boolean;
}

export interface SectionViewRipRapZone extends SectionViewRipRapSettings {
  id: string;
  label: string;
  topPoints: SectionViewPoint[];
  bottomPoints: SectionViewPoint[];
}

export interface SectionViewPoint {
  x: number;
  y: number;
}

export interface SectionViewProfileGeometry {
  gradePoints?: SectionViewPoint[];
  lakebedPoints?: SectionViewPoint[];
  ripRapTopPoints?: SectionViewPoint[];
  ripRapBottomPoints?: SectionViewPoint[];
}

export interface SectionViewTitleBlock {
  client?: string;
  location?: string;
  description?: string;
  drawingNumber?: string;
  revision?: string;
  completedBy?: string;
  date?: string;
}

export interface SectionViewCustomItem {
  id: string;
  type: 'label';
  label: string;
  x: number;
  y: number;
  scaleX?: number;
  scaleY?: number;
  hidden?: boolean;
}

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
  manualElementOffsets?: Record<string, SectionViewManualOffset>;
  manualElementTransforms?: Record<string, SectionViewManualTransform>;
  ripRapSettings?: SectionViewRipRapSettings;
  ripRapZones?: SectionViewRipRapZone[];
  customItems?: SectionViewCustomItem[];
  profileGeometry?: SectionViewProfileGeometry;
  labelOverrides?: Record<string, string>;
  titleBlock?: SectionViewTitleBlock;
  hiddenElements?: string[];
  deletedElements?: string[];
  buildPlanSummary?: {
    generatedAt: string;
    hasProjectScale: boolean;
    scaleLabel: string;
    detectedItems: string[];
    floatingDockLabel?: string;
    rampLabel?: string;
    structureSummary?: string[];
  };
  notes?: string;
}
