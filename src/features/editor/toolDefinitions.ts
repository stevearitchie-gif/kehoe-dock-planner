export const coreToolModes = ['select', 'pan', 'scale', 'shoreline'] as const;
export const objectToolModes = ['floating_dock', 'stationary_dock', 'ramp_with_rails', 'ramp_without_rails', 'steps'] as const;

export type ToolMode = (typeof coreToolModes)[number] | (typeof objectToolModes)[number];

const editorTools = [...coreToolModes, ...objectToolModes] as const;

export const toolLabels: Record<ToolMode, string> = {
  select: 'select',
  pan: 'pan',
  scale: 'scale',
  shoreline: 'shoreline',
  floating_dock: 'floating dock',
  stationary_dock: 'stationary dock',
  ramp_with_rails: 'ramp with rails',
  ramp_without_rails: 'ramp without rails',
  steps: 'steps',
};

export default editorTools;
