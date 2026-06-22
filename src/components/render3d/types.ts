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
