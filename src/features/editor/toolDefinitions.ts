export const coreToolModes = ['select', 'pan', 'scale', 'shoreline'] as const;

export type ToolMode = (typeof coreToolModes)[number];

export const objectToolPlaceholders = [
  'floating dock',
  'stationary dock',
  'ramp with rails',
  'ramp without rails',
  'steps',
  'roof overlay',
  'boat lift',
  'text note',
  'dimension line',
] as const;

const editorTools = [...coreToolModes, ...objectToolPlaceholders] as const;

export default editorTools;
