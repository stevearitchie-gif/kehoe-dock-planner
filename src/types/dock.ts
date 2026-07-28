import type { SectionViewData } from '@/features/sectionView/sectionTypes';

export type UnitType = 'ft' | 'm';

export type DockObjectType =
  | 'floating_dock'
  | 'stationary_dock'
  | 'ramp_with_rails'
  | 'ramp_without_rails'
  | 'steps'
  | 'roof_overlay'
  | 'boat_lift'
  | 'boat_port'
  | 'boathouse'
  | 'accessory'
  | 'rip_rap'
  | 'armour_stone'
  | 'text_note'
  | 'dimension_line'
  | 'shape_rectangle'
  | 'shape_rounded_rectangle'
  | 'shape_oval'
  | 'shape_circle'
  | 'shape_triangle'
  | 'shape_right_triangle'
  | 'shape_diamond'
  | 'shape_parallelogram'
  | 'shape_trapezoid'
  | 'shape_pentagon'
  | 'shape_hexagon'
  | 'shape_octagon'
  | 'shape_cross'
  | 'shape_plus'
  | 'shape_right_arrow'
  | 'shape_left_arrow'
  | 'shape_up_arrow'
  | 'shape_down_arrow'
  | 'shape_left_right_arrow'
  | 'shape_up_down_arrow'
  | 'shape_chevron_right'
  | 'shape_chevron_left'
  | 'shape_callout'
  | 'shape_cube'
  | 'shape_cylinder'
  | 'shape_line'
  | 'shape_arrow_line'
  | 'shape_double_arrow_line'
  | 'shape_elbow_connector'
  | 'shape_double_elbow_connector'
  | 'shape_elbow_arrow_connector';

export interface Point {
  x: number;
  y: number;
}

export interface DockObject {
  id: string;
  type: DockObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  color: string;
  zIndex: number;
  locked: boolean;
  flippedX?: boolean;
  flippedY?: boolean;
  opacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelColor?: string;
  labelRotation?: 0 | 90 | -90;
  labelHidden?: boolean;
  dimensionWidthOffsetX?: number;
  dimensionWidthOffsetY?: number;
  dimensionHeightOffsetX?: number;
  dimensionHeightOffsetY?: number;
  dimensionsHidden?: boolean;
  metadata?: {
    elevation?: number;
    material?: string;
    boardDirection?: 'none' | 'horizontal' | 'vertical';
    showStandardCleats?: boolean;
    textureRef?: string;
    connectionPoints?: Point[];
    modelType3D?: string;
    boatPortWallHeightFt?: number;
    boatPortRoofRiseFt?: number;
    boatPortRoofType?: 'flat' | 'pitched';
    boathouseWallHeightFt?: number;
    boathouseRoofRiseFt?: number;
    boathouseRoofType?: 'flat' | 'gable';
    boathouseSlipCount?: 1 | 2;
    boathouseDoorStyle?: 'open' | 'single_door' | 'double_doors' | 'two_slip_doors' | 'none';
    boathouseWallFinish?: 'neutral' | 'wood' | 'metal';
    boathouseRoofFinish?: 'neutral' | 'metal' | 'shingle';
    accessoryType?: 'cleat' | 'bumper' | 'ladder' | 'bench' | 'post' | 'tie_up_point';
    accessoryFinish?: 'metal' | 'rubber' | 'wood' | 'neutral';
    ripRapStoneSize?: 'small' | 'medium' | '10in-20in' | 'large';
    ripRapDepthFt?: number;
    ripRapFilterLayer?: boolean;
    armourStoneRows?: number;
    armourStoneWallHeightFt?: number;
    siteElementNotes?: string;
    text?: string;
    dimensionValue?: number;
  };
}

export interface ProjectScale {
  pixels: number;
  realLength: number;
  unit: UnitType;
}

export interface DrawingInfo {
  client?: string;
  location?: string;
  description?: string;
  drawingNumber?: string;
  revision?: string;
  completedBy?: string;
  date?: string;
}

export interface DockProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  backgroundImageUrl?: string;
  backgroundImagePath?: string;
  scale?: ProjectScale;
  shorelinePoints: Point[];
  shorelineFinished?: boolean;
  shorelineLabelHidden?: boolean;
  shorelineLabelOffsetX?: number;
  shorelineLabelOffsetY?: number;
  objects: DockObject[];
  sectionView?: SectionViewData;
  notes?: string;
  drawingInfo?: DrawingInfo;
  clientName?: string;
  projectLocation?: string;
  description?: string;
  completedBy?: string;
  drawingNumber?: string;
  revision?: string;
  drawingDate?: string;
  exportSettings?: {
    paperSize?: 'letter' | 'legal' | 'tabloid';
    orientation?: 'portrait' | 'landscape';
    showGrid?: boolean;
    showDimensions?: boolean;
    showNotes?: boolean;
    showScaleReference?: boolean;
    titleBlockPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'hidden';
    titleBlockOffsetX?: number;
    titleBlockOffsetY?: number;
  };
}
