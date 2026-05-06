export const coreToolModes = ['select', 'pan', 'scale', 'shoreline'] as const;

export const dockElementToolModes = [
  'floating_dock',
  'stationary_dock',
  'ramp_with_rails',
  'ramp_without_rails',
  'steps',
  'roof_overlay',
  'boat_lift',
  'dimension_line',
] as const;

export const genericShapeToolModes = [
  'shape_rectangle',
  'shape_rounded_rectangle',
  'shape_oval',
  'shape_triangle',
  'shape_diamond',
  'shape_parallelogram',
  'shape_trapezoid',
  'shape_hexagon',
  'shape_right_arrow',
  'shape_line',
  'shape_arrow_line',
  'shape_double_arrow_line',
] as const;

export const objectToolModes = [...dockElementToolModes, ...genericShapeToolModes] as const;

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
  roof_overlay: 'roof overlay',
  boat_lift: 'boat lift',
  dimension_line: 'dimension line',
  shape_rectangle: 'rectangle',
  shape_rounded_rectangle: 'rounded rectangle',
  shape_oval: 'oval',
  shape_triangle: 'triangle',
  shape_diamond: 'diamond',
  shape_parallelogram: 'parallelogram',
  shape_trapezoid: 'trapezoid',
  shape_hexagon: 'hexagon',
  shape_right_arrow: 'right arrow',
  shape_line: 'line',
  shape_arrow_line: 'arrow line',
  shape_double_arrow_line: 'double arrow line',
};

export default editorTools;
