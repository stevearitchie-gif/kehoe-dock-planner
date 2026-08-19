export type DeckFinish = 'pressure-treated' | 'composite-grey' | 'composite-brown';

export interface DockRenderSettings {
  dockLength: number;
  dockWidth: number;
  dockHeight: number;
  rampEnabled: boolean;
  rampLength: number;
  rampWidth: number;
  railingsEnabled: boolean;
  deckFinish: DeckFinish;
}

export type CameraPreset = 'isometric' | 'top' | 'side' | 'front';

export type RenderViewMode = 'customer' | 'internal';

export type FloatingDockBoardDirection = 'none' | 'horizontal' | 'vertical';
export type BoatPortRoofType = 'flat' | 'pitched';
export type BoathouseRoofType = 'flat' | 'gable';
export type BoathouseSlipCount = 1 | 2;
export type BoathouseDoorStyle = 'open' | 'single_door' | 'double_doors' | 'two_slip_doors' | 'none';
export type BoathouseWallFinish = 'neutral' | 'wood' | 'metal';
export type BoathouseRoofFinish = 'neutral' | 'metal' | 'shingle';
export type AccessoryType = 'cleat' | 'bumper' | 'ladder' | 'bench' | 'post' | 'tie_up_point';
export type AccessoryFinish = 'metal' | 'rubber' | 'wood' | 'neutral';

export type ProjectRenderElementType =
  | 'floating_dock'
  | 'stationary_dock'
  | 'ramp_with_rails'
  | 'ramp_without_rails'
  | 'steps'
  | 'boat_lift'
  | 'boat_port'
  | 'boathouse'
  | 'accessory'
  | 'roof_overlay';

export interface ProjectRenderElement {
  id: string;
  type: ProjectRenderElementType;
  label: string;
  x: number;
  z: number;
  length: number;
  width: number;
  rotation: number;
  color: string;
  opacity: number;
  elevation: number;
  scaleSourceLabel: string;
  sourceX: number;
  sourceY: number;
  sourceCenterX: number;
  sourceCenterY: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceRotation: number;
  anchorInterpretation: string;
  deckFinish?: DeckFinish;
  boardDirection?: FloatingDockBoardDirection;
  showStandardCleats?: boolean;
  tubeDiameterFt?: number;
  productSourceLabel?: string;
  boatPortWallHeightFt?: number;
  boatPortRoofRiseFt?: number;
  boatPortRoofType?: BoatPortRoofType;
  boatPortPostSideInsetFt?: number;
  boatPortPostEndInsetFt?: number;
  boathouseWallHeightFt?: number;
  boathouseRoofRiseFt?: number;
  boathouseRoofType?: BoathouseRoofType;
  boathouseSlipCount?: BoathouseSlipCount;
  boathouseDoorStyle?: BoathouseDoorStyle;
  boathouseWallFinish?: BoathouseWallFinish;
  boathouseRoofFinish?: BoathouseRoofFinish;
  accessoryType?: AccessoryType;
  accessoryFinish?: AccessoryFinish;
}

export interface ProjectRenderShorelinePoint {
  x: number;
  z: number;
  sourceX: number;
  sourceY: number;
}

export interface ProjectRenderModel {
  projectName: string;
  elements: ProjectRenderElement[];
  shorelinePoints: ProjectRenderShorelinePoint[];
  sourceUnitLabel: string;
  hasProjectScale: boolean;
  scalePixels: number | null;
  scaleRealLength: number | null;
  scaleUnit: string | null;
  unsupportedCount: number;
  unsupportedTypes: string[];
}

export const deckFinishLabels: Record<DeckFinish, string> = {
  'pressure-treated': 'Pressure treated',
  'composite-grey': 'Composite grey',
  'composite-brown': 'Composite brown',
};

export const deckFinishColors: Record<DeckFinish, string> = {
  'pressure-treated': '#9a8f63',
  'composite-grey': '#8d99a6',
  'composite-brown': '#8a5f3d',
};
