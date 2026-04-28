export type UnitType = 'ft' | 'm';

export type DockObjectType =
  | 'floating_dock'
  | 'stationary_dock'
  | 'ramp_with_rails'
  | 'ramp_without_rails'
  | 'steps'
  | 'roof_overlay'
  | 'boat_lift'
  | 'text_note'
  | 'dimension_line';

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
  metadata?: {
    elevation?: number;
    material?: string;
    textureRef?: string;
    connectionPoints?: Point[];
    modelType3D?: string;
    text?: string;
    dimensionValue?: number;
  };
}

export interface ProjectScale {
  pixels: number;
  realLength: number;
  unit: UnitType;
}

export interface DockProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  backgroundImageUrl?: string;
  scale?: ProjectScale;
  shorelinePoints: Point[];
  objects: DockObject[];
  notes?: string;
  exportSettings?: {
    paperSize?: 'letter' | 'legal' | 'tabloid';
    orientation?: 'portrait' | 'landscape';
    showGrid?: boolean;
    showDimensions?: boolean;
    showNotes?: boolean;
  };
}
