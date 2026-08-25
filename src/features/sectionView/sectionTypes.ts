export type SectionViewTemplateId = 'rip_rap' | 'armour_stone' | 'floating_dock_shoreline' | 'build_plan_reference';

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

export type SectionViewCustomItemType = 'label' | 'arrow' | 'line' | 'rectangle' | 'material_area';

export interface SectionViewCustomItem {
  id: string;
  type: SectionViewCustomItemType;
  text?: string;
  label?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  strokeColor?: string;
  fillColor?: string;
  scaleX?: number;
  scaleY?: number;
  hidden?: boolean;
}

export interface SectionViewDockRampReference {
  source: 'buildPlan' | 'manual';
  dockLengthFt?: number;
  dockWidthFt?: number;
  rampLengthFt?: number;
  rampWidthFt?: number;
  rampType?: 'with_rails' | 'without_rails' | 'unknown';
}

export type SectionViewBuildPlanReferenceType =
  | 'floating_dock'
  | 'stationary_dock'
  | 'custom_stationary_dock'
  | 'ramp_with_rails'
  | 'ramp_without_rails'
  | 'boat_lift'
  | 'boat_port'
  | 'boathouse'
  | 'accessory'
  | 'rip_rap'
  | 'armour_stone';

export interface SectionViewBuildPlanReference {
  id?: string;
  type: SectionViewBuildPlanReferenceType;
  label: string;
  lengthFt?: number;
  widthFt?: number;
  color?: string;
  boardDirection?: 'none' | 'horizontal' | 'vertical';
  details?: string;
  source: 'buildPlan';
}

export interface SectionViewProjectedBuildPlanObject extends SectionViewBuildPlanReference {
  stationFt: number;
  startStationFt: number;
  endStationFt: number;
  offsetFt: number;
  isPrimary?: boolean;
}

export interface SectionViewBuildPlanProjection {
  source: 'auto-ramp-dock' | 'auto-dock' | 'fallback';
  corridorWidthFt: number;
  stationStartFt: number;
  stationEndFt: number;
  objects: SectionViewProjectedBuildPlanObject[];
  offSectionCount: number;
  note: string;
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
  showWaterLines?: boolean;
  showProfileLines?: boolean;
  showGradeProfile?: boolean;
  showLakebedProfile?: boolean;
  manualElementOffsets?: Record<string, SectionViewManualOffset>;
  manualElementTransforms?: Record<string, SectionViewManualTransform>;
  ripRapSettings?: SectionViewRipRapSettings;
  ripRapZones?: SectionViewRipRapZone[];
  customItems?: SectionViewCustomItem[];
  dockRampReference?: SectionViewDockRampReference;
  buildPlanReferences?: SectionViewBuildPlanReference[];
  buildPlanProjection?: SectionViewBuildPlanProjection;
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
