import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type DragEvent } from 'react';
import { Circle, Ellipse, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { DockObject, Point, ProjectScale } from '@/types/dock';
import type { ToolMode } from '@/features/editor/toolDefinitions';

interface EditorCanvasProps {
  activeTool: ToolMode;
  scalePoints: Point[];
  shorelinePoints: Point[];
  shorelineFinished?: boolean;
  shorelineLabelHidden?: boolean;
  shorelineLabelOffsetX?: number;
  shorelineLabelOffsetY?: number;
  objects: DockObject[];
  selectedObjectId: string | null;
  isLabelMoveModeEnabled: boolean;
  backgroundImageUrl?: string;
  onCanvasPointClick: (point: Point) => void;
  onCanvasScaleDoubleClick: (point: Point) => void;
  onCanvasObjectDraw: (tool: ToolMode, startPoint: Point, endPoint: Point) => void;
  onCanvasToolDrop: (tool: ToolMode, point: Point) => void;
  onObjectClick: (objectId: string) => void;
  onObjectDoubleClick?: (objectId: string) => void;
  onObjectPositionChange: (objectId: string, point: Point) => void;
  onObjectSizeChange: (objectId: string, size: { width: number; height: number }) => void;
  onObjectRotationChange: (objectId: string, rotation: number) => void;
  onObjectLabelOffsetChange: (objectId: string, offset: Point) => void;
  onShorelineLabelOffsetChange?: (offset: Point) => void;
  onObjectDimensionOffsetChange: (objectId: string, dimension: 'width' | 'height', offset: Point) => void;
  currentScale: ProjectScale;
  showScaleReference?: boolean;
  isSnapToGridEnabled: boolean;
  zoom: number;
  onZoomChange: (nextZoom: number) => void;
}

export interface EditorCanvasHandle {
  exportAsImage: (pixelRatio?: number) => string | null;
}

type ResizeHandle = 'right' | 'bottom' | 'corner';
type ConnectorEndpointHandle = 'start' | 'end';

type InteractionSession =
  | {
      type: 'resize';
      objectId: string;
      handle: ResizeHandle;
      startWidth: number;
      startHeight: number;
    }
  | {
      type: 'rotate';
      objectId: string;
      startRotation: number;
      startAngle: number;
      previewRotation: number;
    }
  | {
      type: 'connectorEndpoint';
      objectId: string;
      endpoint: ConnectorEndpointHandle;
      startWidth: number;
      startHeight: number;
    };

type DraftShapeBox = {
  tool: ToolMode;
  startPoint: Point;
  currentPoint: Point;
};

const GRID_SIZE = 40;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const MIN_OBJECT_SIZE = 10;
const ROTATION_HANDLE_OFFSET = 28;
const LABEL_BOX_MIN_WIDTH = 120;
const LABEL_BOX_HEIGHT = 24;

const DRAW_START_THRESHOLD = 8;

const CONNECTOR_SNAP_THRESHOLD = 32;

const drawableShapeTools: ToolMode[] = [
  'shape_rectangle', 'shape_rounded_rectangle', 'shape_oval', 'shape_triangle',
  'shape_circle',
  'shape_right_triangle', 'shape_diamond', 'shape_parallelogram', 'shape_trapezoid',
  'shape_pentagon', 'shape_hexagon', 'shape_octagon', 'shape_cross', 'shape_plus',
  'shape_right_arrow', 'shape_left_arrow', 'shape_up_arrow', 'shape_down_arrow',
  'shape_left_right_arrow', 'shape_up_down_arrow', 'shape_chevron_right',
  'shape_chevron_left', 'shape_callout', 'shape_cube', 'shape_cylinder', 'shape_line',
  'shape_arrow_line', 'shape_double_arrow_line', 'shape_elbow_connector',
  'shape_double_elbow_connector', 'shape_elbow_arrow_connector',
];

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function getObjectOpacity(opacity?: number): number {
  if (typeof opacity !== 'number' || Number.isNaN(opacity)) {
    return 1;
  }

  return Math.max(0, Math.min(1, opacity));
}

function getObjectStrokeColor(object: DockObject, fallback = '#334155'): string {
  return object.strokeColor ?? fallback;
}

function getObjectStrokeWidth(object: DockObject, fallback = 1): number {
  if (typeof object.strokeWidth !== 'number' || Number.isNaN(object.strokeWidth)) {
    return fallback;
  }

  return Math.max(0, object.strokeWidth);
}

function formatFeetAndInches(totalFeet: number): string {
  if (!Number.isFinite(totalFeet) || totalFeet <= 0) {
    return 'Set scale first';
  }

  const totalInches = Math.round(totalFeet * 12);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  if (feet <= 0) {
    return `${inches}"`;
  }

  if (inches === 0) {
    return `${feet}'`;
  }

  return `${feet}' ${inches}"`;
}

function canShowBoardTexture(object: DockObject): boolean {
  return (
    (object.metadata?.boardDirection === 'horizontal' || object.metadata?.boardDirection === 'vertical') &&
    ['floating_dock', 'stationary_dock', 'ramp_with_rails', 'ramp_without_rails'].includes(object.type)
  );
}

function buildBoardTextureLines(object: DockObject): number[][] {
  const spacing = 10;
  const lines: number[][] = [];

  if (object.metadata?.boardDirection === 'horizontal') {
    for (let y = spacing; y < object.height; y += spacing) {
      lines.push([0, y, object.width, y]);
    }
  }

  if (object.metadata?.boardDirection === 'vertical') {
    for (let x = spacing; x < object.width; x += spacing) {
      lines.push([x, 0, x, object.height]);
    }
  }

  return lines;
}

function sitePatternSeed(index: number) {
  const value = Math.sin(index * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function getDimensionLineLabel(object: DockObject, scale: ProjectScale): string {
  if (object.type !== 'dimension_line') {
    return object.label;
  }

  if (scale.pixels <= 0 || scale.realLength <= 0) {
    return 'Set scale first';
  }

  const realLengthInScaleUnits = (object.width / scale.pixels) * scale.realLength;
  const totalFeet =
    scale.unit === 'm' ? realLengthInScaleUnits * 3.28084 : realLengthInScaleUnits;

  return formatFeetAndInches(totalFeet);
}

function getObjectDimensionLabel(pixels: number, scale: ProjectScale): string {
  if (scale.pixels <= 0 || scale.realLength <= 0) {
    return `${Number(pixels.toFixed(1))} px`;
  }

  const realLengthInScaleUnits = (pixels / scale.pixels) * scale.realLength;

  if (scale.unit === 'm') {
    return `${Number(realLengthInScaleUnits.toFixed(2))} m`;
  }

  return formatFeetAndInches(realLengthInScaleUnits);
}

function formatScaleMeasurementLabel(scale: ProjectScale): string {
  if (scale.realLength <= 0) {
    return 'Set scale length';
  }

  if (scale.unit === 'ft') {
    return formatFeetAndInches(scale.realLength);
  }

  return `${scale.realLength} m`;
}

function getGenericShapePoints(object: DockObject): number[] | null {
  const width = object.width;
  const height = object.height;

  switch (object.type) {
    case 'shape_triangle':
      return [width / 2, 0, width, height, 0, height];

    case 'shape_right_triangle':
      return [0, 0, width, height, 0, height];

    case 'shape_diamond':
      return [width / 2, 0, width, height / 2, width / 2, height, 0, height / 2];

    case 'shape_parallelogram':
      return [width * 0.22, 0, width, 0, width * 0.78, height, 0, height];

    case 'shape_trapezoid':
      return [width * 0.22, 0, width * 0.78, 0, width, height, 0, height];

    case 'shape_pentagon':
      return [width / 2, 0, width, height * 0.38, width * 0.82, height, width * 0.18, height, 0, height * 0.38];


    case 'shape_hexagon':
      return [
        width * 0.25,
        0,
        width * 0.75,
        0,
        width,
        height / 2,
        width * 0.75,
        height,
        width * 0.25,
        height,
        0,
        height / 2,
      ];

    case 'shape_right_arrow':
      return [
        0,
        height * 0.25,
        width * 0.68,
        height * 0.25,
        width * 0.68,
        0,
        width,
        height / 2,
        width * 0.68,
        height,
        width * 0.68,
        height * 0.75,
        0,
        height * 0.75,
      ];


    case 'shape_octagon':
      return [width * 0.3, 0, width * 0.7, 0, width, height * 0.3, width, height * 0.7, width * 0.7, height, width * 0.3, height, 0, height * 0.7, 0, height * 0.3];

    case 'shape_cross':
    case 'shape_plus':
      return [width * 0.35, 0, width * 0.65, 0, width * 0.65, height * 0.35, width, height * 0.35, width, height * 0.65, width * 0.65, height * 0.65, width * 0.65, height, width * 0.35, height, width * 0.35, height * 0.65, 0, height * 0.65, 0, height * 0.35, width * 0.35, height * 0.35];

    case 'shape_left_arrow':
      return [width, height * 0.25, width * 0.32, height * 0.25, width * 0.32, 0, 0, height / 2, width * 0.32, height, width * 0.32, height * 0.75, width, height * 0.75];

    case 'shape_up_arrow':
      return [width * 0.25, height, width * 0.25, height * 0.32, 0, height * 0.32, width / 2, 0, width, height * 0.32, width * 0.75, height * 0.32, width * 0.75, height];

    case 'shape_down_arrow':
      return [width * 0.25, 0, width * 0.25, height * 0.68, 0, height * 0.68, width / 2, height, width, height * 0.68, width * 0.75, height * 0.68, width * 0.75, 0];

    case 'shape_left_right_arrow':
      return [width * 0.18, 0, width * 0.34, height * 0.25, width * 0.66, height * 0.25, width * 0.82, 0, width, height / 2, width * 0.82, height, width * 0.66, height * 0.75, width * 0.34, height * 0.75, width * 0.18, height, 0, height / 2];

    case 'shape_up_down_arrow':
      return [width / 2, 0, width, height * 0.18, width * 0.75, height * 0.34, width * 0.75, height * 0.66, width, height * 0.82, width / 2, height, 0, height * 0.82, width * 0.25, height * 0.66, width * 0.25, height * 0.34, 0, height * 0.18];

    case 'shape_chevron_right':
      return [0, 0, width * 0.55, 0, width, height / 2, width * 0.55, height, 0, height, width * 0.45, height / 2];

    case 'shape_chevron_left':
      return [width, 0, width * 0.45, 0, 0, height / 2, width * 0.45, height, width, height, width * 0.55, height / 2];

    case 'shape_callout':
      return [0, 0, width, 0, width, height * 0.72, width * 0.62, height * 0.72, width * 0.5, height, width * 0.4, height * 0.72, 0, height * 0.72];

    case 'shape_cube':
      return [0, height * 0.22, width * 0.22, 0, width, 0, width, height * 0.78, width * 0.78, height, 0, height];

    default:
      return null;
  }
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function getStagePointerPoint(stage: KonvaStage): Point | null {
  const pointerPosition = stage.getPointerPosition();
  if (!pointerPosition) {
    return null;
  }

  return stage.getAbsoluteTransform().copy().invert().point(pointerPosition);
}

function getObjectLocalPoint(object: DockObject, stagePoint: Point): Point {
  const radians = degreesToRadians(-object.rotation);
  const dx = stagePoint.x - object.x;
  const dy = stagePoint.y - object.y;

  return {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians),
  };
}

function getAngleFromStagePoint(object: DockObject, stagePoint: Point): number {
  const localPoint = getObjectLocalPoint(object, stagePoint);
  const angleRadians = Math.atan2(localPoint.y, localPoint.x - object.width / 2);
  return (angleRadians * 180) / Math.PI + 90;
}

function normalizeAngleDelta(delta: number): number {
  let normalized = delta;
  while (normalized > 180) {
    normalized -= 360;
  }
  while (normalized < -180) {
    normalized += 360;
  }
  return normalized;
}

function getDraftShapeBounds(draftShapeBox: DraftShapeBox) {
  const x = Math.min(draftShapeBox.startPoint.x, draftShapeBox.currentPoint.x);
  const y = Math.min(draftShapeBox.startPoint.y, draftShapeBox.currentPoint.y);
  const width = Math.abs(draftShapeBox.currentPoint.x - draftShapeBox.startPoint.x);
  const height = Math.abs(draftShapeBox.currentPoint.y - draftShapeBox.startPoint.y);

  return { x, y, width, height };
}

function isConnectorEndpointObject(object: DockObject): boolean {
  return (
    object.type === 'shape_elbow_connector' ||
    object.type === 'shape_double_elbow_connector' ||
    object.type === 'shape_elbow_arrow_connector'
  );
}

function getObjectSnapPoints(object: DockObject): Point[] {
  const left = object.x;
  const top = object.y;
  const right = object.x + object.width;
  const bottom = object.y + object.height;
  const centerX = object.x + object.width / 2;
  const centerY = object.y + object.height / 2;

  return [
    { x: left, y: top },
    { x: centerX, y: top },
    { x: right, y: top },
    { x: right, y: centerY },
    { x: right, y: bottom },
    { x: centerX, y: bottom },
    { x: left, y: bottom },
    { x: left, y: centerY },
  ];
}

function getNearestConnectorSnapPoint(point: Point, objects: DockObject[], activeObjectId: string) {
  let nearestPoint: Point | null = null;
  let nearestDistance = CONNECTOR_SNAP_THRESHOLD;

  objects.forEach((object) => {
    if (object.id === activeObjectId) {
      return;
    }

    getObjectSnapPoints(object).forEach((snapPoint) => {
      const distance = Math.hypot(point.x - snapPoint.x, point.y - snapPoint.y);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = snapPoint;
      }
    });
  });

  return {
    point: nearestPoint ?? point,
    snapped: nearestPoint !== null,
  };
}

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(function EditorCanvas(
  {
    activeTool,
    scalePoints,
    shorelinePoints,
    shorelineFinished = false,
    shorelineLabelHidden = false,
    shorelineLabelOffsetX = 0,
    shorelineLabelOffsetY = 0,
    objects,
    selectedObjectId,
    isLabelMoveModeEnabled,
    backgroundImageUrl,
    onCanvasPointClick,
    onCanvasScaleDoubleClick,
    onCanvasObjectDraw,
    onCanvasToolDrop,
    onObjectClick,
    onObjectDoubleClick,
    onObjectPositionChange,
    onObjectSizeChange,
    onObjectRotationChange,
    onObjectLabelOffsetChange,
    onShorelineLabelOffsetChange,
    onObjectDimensionOffsetChange,
    currentScale,
    showScaleReference = true,
    isSnapToGridEnabled,
    zoom,
    onZoomChange,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<KonvaStage | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [interactionSession, setInteractionSession] = useState<InteractionSession | null>(null);
  const [draftShapeBox, setDraftShapeBox] = useState<DraftShapeBox | null>(null);
  const draftShapeBoxRef = useRef<DraftShapeBox | null>(null);
  const [connectorSnapPoint, setConnectorSnapPoint] = useState<Point | null>(null);
  const [stagePosition, setStagePosition] = useState<Point>({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    exportAsImage(pixelRatio = 2) {
      return (
        stageRef.current?.toDataURL({
          pixelRatio,
          mimeType: 'image/png',
        }) ?? null
      );
    },
  }));

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const element = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setCanvasSize({
        width: Math.max(entry.contentRect.width, 1),
        height: Math.max(entry.contentRect.height, 1),
      });
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!backgroundImageUrl) {
      setBackgroundImage(null);
      return;
    }

    const image = new window.Image();
    image.onload = () => {
      setBackgroundImage(image);
    };
    image.onerror = () => {
      setBackgroundImage(null);
    };
    image.src = backgroundImageUrl;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [backgroundImageUrl]);

  useEffect(() => {
    if (zoom <= 1) {
      setStagePosition({ x: 0, y: 0 });
    }
  }, [zoom]);

  const scaleLinePoints = useMemo(() => {
    if (scalePoints.length < 2) {
      return null;
    }

    return [scalePoints[0].x, scalePoints[0].y, scalePoints[1].x, scalePoints[1].y];
  }, [scalePoints]);

  const scaleMeasurementGuide = useMemo(() => {
    if (scalePoints.length < 2) {
      return null;
    }

    const [startPoint, endPoint] = scalePoints;
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const length = Math.hypot(dx, dy);

    if (length <= 0) {
      return null;
    }

    const offsetDistance = 28;
    const unitX = dx / length;
    const unitY = dy / length;
    const normalX = (-dy / length) * offsetDistance;
    const normalY = (dx / length) * offsetDistance;
    const startX = startPoint.x + normalX;
    const startY = startPoint.y + normalY;
    const endX = endPoint.x + normalX;
    const endY = endPoint.y + normalY;
    const arrowNormalX = normalX * 0.18;
    const arrowNormalY = normalY * 0.18;

    return {
      linePoints: [startX, startY, endX, endY],
      label: formatScaleMeasurementLabel(currentScale),
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2 - 18,
      startArrowLeft: [startX, startY, startX + unitX * 10 + arrowNormalX, startY + unitY * 10 + arrowNormalY],
      startArrowRight: [startX, startY, startX + unitX * 10 - arrowNormalX, startY + unitY * 10 - arrowNormalY],
      endArrowLeft: [endX, endY, endX - unitX * 10 + arrowNormalX, endY - unitY * 10 + arrowNormalY],
      endArrowRight: [endX, endY, endX - unitX * 10 - arrowNormalX, endY - unitY * 10 - arrowNormalY],
    };
  }, [currentScale, scalePoints]);

  const shorelineLinePoints = useMemo(() => {
    if (shorelinePoints.length < 2) {
      return null;
    }

    return shorelinePoints.flatMap((point) => [point.x, point.y]);
  }, [shorelinePoints]);

  const shorelineLabelPosition = useMemo(() => {
    if (shorelinePoints.length < 2) {
      return null;
    }

    const xs = shorelinePoints.map((point) => point.x);
    const ys = shorelinePoints.map((point) => point.y);

    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2 + shorelineLabelOffsetX,
      y: Math.min(...ys) - 28 + shorelineLabelOffsetY,
    };
  }, [shorelineLabelOffsetX, shorelineLabelOffsetY, shorelinePoints]);

  const isPanTool = activeTool === 'pan';

  const handlePointerDown = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const pointTools: ToolMode[] = [
      'scale',
      'shoreline',
      'floating_dock',
      'stationary_dock',
      'ramp_with_rails',
      'ramp_without_rails',
      'steps',
      'roof_overlay',
      'boat_lift',
      'boat_port',
      'boathouse',
      'accessory',
      'dimension_line',
      'shape_rectangle',
      'shape_rounded_rectangle',
      'shape_oval',
  'shape_circle',
      'shape_triangle',
      'shape_diamond',
      'shape_parallelogram',
      'shape_trapezoid',
      'shape_hexagon',
      'shape_right_arrow',
      'shape_right_triangle',
      'shape_pentagon',
      'shape_octagon',
      'shape_cross',
      'shape_plus',
      'shape_left_arrow',
      'shape_up_arrow',
      'shape_down_arrow',
      'shape_left_right_arrow',
      'shape_up_down_arrow',
      'shape_chevron_right',
      'shape_chevron_left',
      'shape_callout',
      'shape_cube',
      'shape_cylinder',
      'shape_line',
      'shape_arrow_line',
      'shape_double_arrow_line',
      'shape_elbow_connector',
      'shape_double_elbow_connector',
      'shape_elbow_arrow_connector',
    
    ];

    if (!pointTools.includes(activeTool)) {
      return;
    }

    const stage = event.target.getStage();
    if (!stage) {
      return;
    }

    const pointerPosition = stage.getRelativePointerPosition();
    if (!pointerPosition) {
      return;
    }

    if (drawableShapeTools.includes(activeTool)) {
      event.evt.preventDefault();

      const nextDraftShapeBox = {
        tool: activeTool,
        startPoint: pointerPosition,
        currentPoint: pointerPosition,
      };

      draftShapeBoxRef.current = nextDraftShapeBox;
      setDraftShapeBox(nextDraftShapeBox);

      const updateDraftShape = (nativeEvent: Event) => {
        nativeEvent.preventDefault();

        const activeDraft = draftShapeBoxRef.current;
        if (!activeDraft) {
          return;
        }

        stage.setPointersPositions(nativeEvent as MouseEvent | TouchEvent);
        const stagePoint = getStagePointerPoint(stage);
        if (!stagePoint) {
          return;
        }

        const updatedDraftShapeBox = {
          ...activeDraft,
          currentPoint: stagePoint,
        };

        draftShapeBoxRef.current = updatedDraftShapeBox;
        setDraftShapeBox(updatedDraftShapeBox);
      };

      const finishDraftShape = (nativeEvent: Event) => {
        updateDraftShape(nativeEvent);

        const activeDraft = draftShapeBoxRef.current;
        if (!activeDraft) {
          return;
        }

        const bounds = getDraftShapeBounds(activeDraft);

        if (bounds.width >= DRAW_START_THRESHOLD || bounds.height >= DRAW_START_THRESHOLD) {
          onCanvasObjectDraw(activeDraft.tool, activeDraft.startPoint, activeDraft.currentPoint);
        } else {
          onCanvasPointClick(activeDraft.startPoint);
        }

        draftShapeBoxRef.current = null;
        setDraftShapeBox(null);

        document.removeEventListener('mousemove', updateDraftShape);
        document.removeEventListener('mouseup', finishDraftShape);
        document.removeEventListener('touchmove', updateDraftShape);
        document.removeEventListener('touchend', finishDraftShape);
      };

      document.addEventListener('mousemove', updateDraftShape);
      document.addEventListener('mouseup', finishDraftShape);
      document.addEventListener('touchmove', updateDraftShape, { passive: false });
      document.addEventListener('touchend', finishDraftShape);

      return;
    }

    onCanvasPointClick(pointerPosition);
  };

  const handleStageDoubleClick = (event: KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'scale') {
      return;
    }

    event.evt.preventDefault();

    const stage = event.target.getStage();
    if (!stage) {
      return;
    }

    const pointerPosition = stage.getRelativePointerPosition();
    if (!pointerPosition) {
      return;
    }

    onCanvasScaleDoubleClick(pointerPosition);
  };

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();

    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const factor = 1 + direction * 0.1;
    onZoomChange(clampZoom(zoom * factor));
  };

  const beginResize = (
    event: KonvaEventObject<MouseEvent | TouchEvent>,
    objectId: string,
    handle: ResizeHandle,
  ) => {
    event.cancelBubble = true;
    event.evt.preventDefault();

    const object = objects.find((item) => item.id === objectId);
    if (!object) {
      return;
    }

    onObjectClick(objectId);
    setInteractionSession({
      type: 'resize',
      objectId,
      handle,
      startWidth: object.width,
      startHeight: object.height,
    });
  };

  const beginRotate = (event: KonvaEventObject<MouseEvent | TouchEvent>, object: DockObject) => {
    event.cancelBubble = true;
    event.evt.preventDefault();

    const stage = stageRef.current ?? event.target.getStage();
    if (!stage) {
      return;
    }

    const stagePoint = getStagePointerPoint(stage);
    if (!stagePoint) {
      return;
    }

    onObjectClick(object.id);

    setInteractionSession({
      type: 'rotate',
      objectId: object.id,
      startRotation: object.rotation,
      startAngle: getAngleFromStagePoint(object, stagePoint),
      previewRotation: object.rotation,
    });
  };

  const beginConnectorEndpoint = (
    event: KonvaEventObject<MouseEvent | TouchEvent>,
    object: DockObject,
    endpoint: ConnectorEndpointHandle,
  ) => {
    event.cancelBubble = true;
    event.evt.preventDefault();

    onObjectClick(object.id);
    setInteractionSession({
      type: 'connectorEndpoint',
      objectId: object.id,
      endpoint,
      startWidth: object.width,
      startHeight: object.height,
    });
  };

  const endInteraction = () => {
    const activeDraftShapeBox = draftShapeBoxRef.current;

    if (activeDraftShapeBox) {
      const bounds = getDraftShapeBounds(activeDraftShapeBox);

      if (bounds.width >= DRAW_START_THRESHOLD || bounds.height >= DRAW_START_THRESHOLD) {
        onCanvasObjectDraw(activeDraftShapeBox.tool, activeDraftShapeBox.startPoint, activeDraftShapeBox.currentPoint);
      } else {
        onCanvasPointClick(activeDraftShapeBox.startPoint);
      }

      draftShapeBoxRef.current = null;
      setDraftShapeBox(null);
      return;
    }

    if (interactionSession?.type === 'rotate') {
      onObjectRotationChange(interactionSession.objectId, interactionSession.previewRotation);
    }

    setConnectorSnapPoint(null);
    setInteractionSession(null);
  };

  const handleStagePointerMove = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (draftShapeBoxRef.current) {
      const stage = stageRef.current ?? event.target.getStage();
      if (!stage) {
        return;
      }

      const stagePoint = getStagePointerPoint(stage);
      if (!stagePoint) {
        return;
      }

      const nextDraftShapeBox = {
        ...draftShapeBoxRef.current,
        currentPoint: stagePoint,
      };

      draftShapeBoxRef.current = nextDraftShapeBox;
      setDraftShapeBox(nextDraftShapeBox);
      return;
    }

    if (!interactionSession) {
      return;
    }

    const stage = stageRef.current ?? event.target.getStage();
    if (!stage) {
      return;
    }

    const stagePoint = getStagePointerPoint(stage);
    if (!stagePoint) {
      return;
    }

    const object = objects.find((item) => item.id === interactionSession.objectId);
    if (!object) {
      return;
    }

    if (interactionSession.type === 'rotate') {
      const currentAngle = getAngleFromStagePoint(object, stagePoint);
      const angleDelta = normalizeAngleDelta(currentAngle - interactionSession.startAngle);
      const nextRotation = interactionSession.startRotation + angleDelta;

      setInteractionSession((prev) => {
        if (!prev || prev.type !== 'rotate' || prev.objectId !== object.id) {
          return prev;
        }

        return {
          ...prev,
          previewRotation: nextRotation,
        };
      });

      return;
    }

    const localPoint = getObjectLocalPoint(object, stagePoint);

    if (interactionSession.type === 'connectorEndpoint') {
      onObjectClick(object.id);

      const snapResult = getNearestConnectorSnapPoint(stagePoint, objects, object.id);
      setConnectorSnapPoint(snapResult.snapped ? snapResult.point : null);
      const snappedLocalPoint = getObjectLocalPoint(object, snapResult.point);

      if (interactionSession.endpoint === 'end') {
        onObjectSizeChange(object.id, {
          width: Math.max(MIN_OBJECT_SIZE, snappedLocalPoint.x),
          height: Math.max(MIN_OBJECT_SIZE, snappedLocalPoint.y),
        });
        return;
      }

      const boundedLocalX = Math.min(snappedLocalPoint.x, object.width - MIN_OBJECT_SIZE);
      const boundedLocalY = Math.min(snappedLocalPoint.y, object.height - MIN_OBJECT_SIZE);

      onObjectPositionChange(object.id, {
        x: object.x + boundedLocalX,
        y: object.y + boundedLocalY,
      });
      onObjectSizeChange(object.id, {
        width: Math.max(MIN_OBJECT_SIZE, object.width - boundedLocalX),
        height: Math.max(MIN_OBJECT_SIZE, object.height - boundedLocalY),
      });
      return;
    }

    if (interactionSession.handle === 'right') {
      const nextWidth = Math.max(MIN_OBJECT_SIZE, localPoint.x);
      onObjectClick(object.id);
      onObjectSizeChange(object.id, {
        width: nextWidth,
        height: object.height,
      });
      return;
    }

    if (interactionSession.handle === 'bottom') {
      const nextHeight = Math.max(MIN_OBJECT_SIZE, localPoint.y);
      onObjectClick(object.id);
      onObjectSizeChange(object.id, {
        width: object.width,
        height: nextHeight,
      });
      return;
    }

    const desiredWidth = Math.max(MIN_OBJECT_SIZE, localPoint.x);
    const desiredHeight = Math.max(MIN_OBJECT_SIZE, localPoint.y);
    const aspectRatio =
      interactionSession.startHeight > 0
        ? interactionSession.startWidth / interactionSession.startHeight
        : 1;

    const heightFromWidth = Math.max(MIN_OBJECT_SIZE, desiredWidth / aspectRatio);
    const widthFromHeight = Math.max(MIN_OBJECT_SIZE, desiredHeight * aspectRatio);

    const widthDrivenDifference = Math.abs(desiredHeight - heightFromWidth);
    const heightDrivenDifference = Math.abs(desiredWidth - widthFromHeight);

    const nextSize =
      widthDrivenDifference <= heightDrivenDifference
        ? {
            width: desiredWidth,
            height: heightFromWidth,
          }
        : {
            width: widthFromHeight,
            height: desiredHeight,
          };

    onObjectClick(object.id);
    onObjectSizeChange(object.id, nextSize);
  };

  const handleCanvasDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleCanvasDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const droppedTool = event.dataTransfer.getData('application/x-dock-tool') as ToolMode;
    if (!drawableShapeTools.includes(droppedTool)) {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    const point = {
      x: (event.clientX - bounds.left - stagePosition.x) / zoom,
      y: (event.clientY - bounds.top - stagePosition.y) / zoom,
    };

    onCanvasToolDrop(droppedTool, point);
  };


  return (
    <div
      ref={containerRef}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      className="h-full w-full overflow-hidden rounded-md border border-slate-200 bg-white"
    >
      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        x={stagePosition.x}
        y={stagePosition.y}
        scaleX={zoom}
        scaleY={zoom}
        draggable={isPanTool && !interactionSession}
        onDragMove={(event) => {
          if (!isPanTool) {
            return;
          }

          setStagePosition({
            x: event.target.x(),
            y: event.target.y(),
          });
        }}
        onDragEnd={(event) => {
          if (!isPanTool) {
            return;
          }

          setStagePosition({
            x: event.target.x(),
            y: event.target.y(),
          });
        }}
        onMouseDown={handlePointerDown}
        onDblClick={handleStageDoubleClick}
        onTouchStart={handlePointerDown}
        onMouseMove={handleStagePointerMove}
        onTouchMove={handleStagePointerMove}
        onMouseUp={endInteraction}
        onTouchEnd={endInteraction}
        onMouseLeave={endInteraction}
        onWheel={handleWheel}
      >
        {backgroundImage && (
          <Layer listening={false}>
            <KonvaImage image={backgroundImage} x={0} y={0} />
          </Layer>
        )}

        <Layer listening={false}>
          {shorelineLinePoints && (
            <Line
              points={shorelineLinePoints}
              stroke="#0f766e"
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
              dash={[10, 6]}
            />
          )}
          {activeTool === 'shoreline' &&
            !shorelineFinished &&
            shorelinePoints.map((point) => (
              <Circle key={`shoreline-${point.x}-${point.y}`} x={point.x} y={point.y} radius={5} fill="#0f766e" />
            ))}

          {showScaleReference && scaleLinePoints && (
            <Line points={scaleLinePoints} stroke="#2563eb" strokeWidth={3} lineCap="round" />
          )}
          {showScaleReference && scaleMeasurementGuide && (
            <>
              <Line points={scaleMeasurementGuide.linePoints} stroke="#1d4ed8" strokeWidth={2} lineCap="round" />
              <Line points={scaleMeasurementGuide.startArrowLeft} stroke="#1d4ed8" strokeWidth={2} lineCap="round" />
              <Line points={scaleMeasurementGuide.startArrowRight} stroke="#1d4ed8" strokeWidth={2} lineCap="round" />
              <Line points={scaleMeasurementGuide.endArrowLeft} stroke="#1d4ed8" strokeWidth={2} lineCap="round" />
              <Line points={scaleMeasurementGuide.endArrowRight} stroke="#1d4ed8" strokeWidth={2} lineCap="round" />
              <Text
                x={scaleMeasurementGuide.labelX - 60}
                y={scaleMeasurementGuide.labelY}
                width={120}
                height={18}
                align="center"
                verticalAlign="middle"
                text={scaleMeasurementGuide.label}
                fontSize={12}
                fontStyle="bold"
                fill="#1d4ed8"
              />
            </>
          )}
          {showScaleReference &&
            scalePoints.map((point) => (
              <Circle key={`${point.x}-${point.y}`} x={point.x} y={point.y} radius={5} fill="#1d4ed8" />
            ))}

          {connectorSnapPoint && (
            <>
              <Circle
                x={connectorSnapPoint.x}
                y={connectorSnapPoint.y}
                radius={16}
                fill="#dbeafe"
                opacity={0.9}
                stroke="#2563eb"
                strokeWidth={3}
              />
              <Line
                points={[connectorSnapPoint.x - 22, connectorSnapPoint.y, connectorSnapPoint.x + 22, connectorSnapPoint.y]}
                stroke="#2563eb"
                strokeWidth={2}
                opacity={0.9}
              />
              <Line
                points={[connectorSnapPoint.x, connectorSnapPoint.y - 22, connectorSnapPoint.x, connectorSnapPoint.y + 22]}
                stroke="#2563eb"
                strokeWidth={2}
                opacity={0.9}
              />
              <Circle x={connectorSnapPoint.x} y={connectorSnapPoint.y} radius={4} fill="#1d4ed8" />
            </>
          )}
        </Layer>

        <Layer>
          {shorelineLabelPosition && !shorelineLabelHidden && (
            <Group
              x={shorelineLabelPosition.x}
              y={shorelineLabelPosition.y}
              draggable={isLabelMoveModeEnabled}
              listening={isLabelMoveModeEnabled}
              onDragEnd={(event) => {
                onShorelineLabelOffsetChange?.({
                  x: event.target.x() - (shorelineLabelPosition.x - shorelineLabelOffsetX),
                  y: event.target.y() - (shorelineLabelPosition.y - shorelineLabelOffsetY),
                });
              }}
            >
              <Rect
                x={-44}
                y={-14}
                width={88}
                height={28}
                fill="#ffffff"
                opacity={0.001}
              />
              <Rect
                x={-36}
                y={-10}
                width={72}
                height={20}
                fill="#ffffff"
                opacity={0.85}
                cornerRadius={4}
                listening={false}
              />
              <Text
                x={-36}
                y={-7}
                width={72}
                height={16}
                align="center"
                verticalAlign="middle"
                text="Shoreline"
                fontSize={12}
                fontStyle="bold"
                fill="#0f766e"
                listening={false}
              />
            </Group>
          )}

          {draftShapeBox && (() => {
            const bounds = getDraftShapeBounds(draftShapeBox);

            return (
              <Rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                fill="#dbeafe"
                opacity={0.2}
                stroke="#2563eb"
                strokeWidth={2}
                dash={[8, 5]}
              />
            );
          })()}

          {objects.map((object) => {
            const isSelected = object.id === selectedObjectId;
            const isDraggable = activeTool === 'select' && !object.locked && !interactionSession;
            const objectOpacity = getObjectOpacity(object.opacity);
            const cornerRadius =
              object.type === 'ramp_with_rails' || object.type === 'ramp_without_rails' ? 4 : 0;

            const renderedRotation =
              interactionSession?.type === 'rotate' && interactionSession.objectId === object.id
                ? interactionSession.previewRotation
                : object.rotation;

            const isShapeObject = object.type.startsWith('shape_');
            const displayLabelText =
              object.type === 'dimension_line' ? getDimensionLineLabel(object, currentScale) : object.label;
            const isLabelVertical = object.labelRotation === 90 || object.labelRotation === -90;
            const verticalLabelCharacters =
              object.labelRotation === -90 ? displayLabelText.split('').reverse() : displayLabelText.split('');
            const labelWidth = isLabelVertical
              ? 34
              : isShapeObject
                ? object.width
                : Math.max(object.width, LABEL_BOX_MIN_WIDTH);
            const labelHeight = isLabelVertical
              ? Math.max(90, verticalLabelCharacters.length * 14 + 8)
              : isShapeObject
                ? Math.max(object.height, LABEL_BOX_HEIGHT)
                : LABEL_BOX_HEIGHT;
            const defaultLabelX = object.width / 2 - labelWidth / 2;
            const defaultLabelY =
              object.type === 'dimension_line'
                ? -labelHeight - 6
                : isShapeObject
                  ? 0
                  : object.height / 2 - labelHeight / 2;
            const labelX = defaultLabelX + (object.labelOffsetX ?? 0);
            const labelY = defaultLabelY + (object.labelOffsetY ?? 0);
            const isLabelDraggable =
              isLabelMoveModeEnabled && isSelected && activeTool === 'select' && !object.locked && !interactionSession;

            const defaultWidthDimensionX = 0;
            const defaultWidthDimensionY = object.height + 28;
            const defaultHeightDimensionX = object.width + 28;
            const defaultHeightDimensionY = 0;
            const widthDimensionX = defaultWidthDimensionX + (object.dimensionWidthOffsetX ?? 0);
            const widthDimensionY = defaultWidthDimensionY + (object.dimensionWidthOffsetY ?? 0);
            const heightDimensionX = defaultHeightDimensionX + (object.dimensionHeightOffsetX ?? 0);
            const heightDimensionY = defaultHeightDimensionY + (object.dimensionHeightOffsetY ?? 0);
            const canShowObjectDimensions = object.type !== 'dimension_line' && !object.dimensionsHidden;

            return (
              <Group
                key={object.id}
                x={object.x}
                y={object.y}
                rotation={renderedRotation}
                draggable={isDraggable}
                dragBoundFunc={
                  isSnapToGridEnabled
                    ? (position) => ({
                        x: snapToGrid(position.x),
                        y: snapToGrid(position.y),
                      })
                    : undefined
                }
                onClick={() => onObjectClick(object.id)}
                onTap={() => onObjectClick(object.id)}
                onDblClick={(event) => {
                  event.cancelBubble = true;
                  onObjectDoubleClick?.(object.id);
                }}
                onDblTap={(event) => {
                  event.cancelBubble = true;
                  onObjectDoubleClick?.(object.id);
                }}
                onDragStart={() => onObjectClick(object.id)}
                onDragEnd={(event) => {
                  onObjectPositionChange(object.id, {
                    x: event.target.x(),
                    y: event.target.y(),
                  });
                }}
              >
                <Group
                  opacity={objectOpacity}
                  x={object.width / 2}
                  y={object.height / 2}
                  offsetX={object.width / 2}
                  offsetY={object.height / 2}
                  scaleX={object.flippedX ? -1 : 1}
                  scaleY={object.flippedY ? -1 : 1}
                >
                  {object.type === 'dimension_line' ? (
                    <>
                      <Rect
                        x={0}
                        y={0}
                        width={object.width}
                        height={object.height}
                        fill="#ffffff"
                        opacity={0.001}
                        strokeWidth={0}
                      />
                      <Line
                        points={[0, object.height / 2, object.width, object.height / 2]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[0, object.height / 2 - 8, 0, object.height / 2 + 8]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[object.width, object.height / 2 - 8, object.width, object.height / 2 + 8]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[0, object.height / 2, 8, object.height / 2 - 5]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[0, object.height / 2, 8, object.height / 2 + 5]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[object.width, object.height / 2, object.width - 8, object.height / 2 - 5]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[object.width, object.height / 2, object.width - 8, object.height / 2 + 5]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                    </>
                  ) : object.type === 'shape_line' ? (
                    <>
                      <Rect
                        x={0}
                        y={0}
                        width={object.width}
                        height={object.height}
                        fill="#ffffff"
                        opacity={0.001}
                        strokeWidth={0}
                      />
                      <Line
                        points={[0, object.height / 2, object.width, object.height / 2]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                    </>
                  ) : object.type === 'shape_arrow_line' ? (
                    <>
                      <Rect
                        x={0}
                        y={0}
                        width={object.width}
                        height={object.height}
                        fill="#ffffff"
                        opacity={0.001}
                        strokeWidth={0}
                      />
                      <Line
                        points={[0, object.height / 2, object.width, object.height / 2]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[object.width, object.height / 2, object.width - 10, object.height / 2 - 6]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[object.width, object.height / 2, object.width - 10, object.height / 2 + 6]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                    </>
                  ) : object.type === 'shape_double_arrow_line' ? (
                    <>
                      <Rect
                        x={0}
                        y={0}
                        width={object.width}
                        height={object.height}
                        fill="#ffffff"
                        opacity={0.001}
                        strokeWidth={0}
                      />
                      <Line
                        points={[0, object.height / 2, object.width, object.height / 2]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[0, object.height / 2, 10, object.height / 2 - 6]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[0, object.height / 2, 10, object.height / 2 + 6]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[object.width, object.height / 2, object.width - 10, object.height / 2 - 6]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[object.width, object.height / 2, object.width - 10, object.height / 2 + 6]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                    </>
                  ) : object.type === 'shape_elbow_connector' ? (
                    <>
                      <Rect x={0} y={0} width={object.width} height={object.height} fill="#ffffff" opacity={0.001} strokeWidth={0} />
                      <Line
                        points={[0, 0, object.width / 2, 0, object.width / 2, object.height, object.width, object.height]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                        lineJoin="round"
                      />
                    </>
                  ) : object.type === 'shape_double_elbow_connector' ? (
                    <>
                      <Rect x={0} y={0} width={object.width} height={object.height} fill="#ffffff" opacity={0.001} strokeWidth={0} />
                      <Line
                        points={[0, 0, object.width * 0.33, 0, object.width * 0.33, object.height, object.width * 0.66, object.height, object.width * 0.66, 0, object.width, 0]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                        lineJoin="round"
                      />
                    </>
                  ) : object.type === 'shape_elbow_arrow_connector' ? (
                    <>
                      <Rect x={0} y={0} width={object.width} height={object.height} fill="#ffffff" opacity={0.001} strokeWidth={0} />
                      <Line
                        points={[0, 0, object.width / 2, 0, object.width / 2, object.height, object.width, object.height]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                        lineJoin="round"
                      />
                      <Line
                        points={[object.width, object.height, object.width - 10, object.height - 6]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                      <Line
                        points={[object.width, object.height, object.width - 10, object.height + 6]}
                        stroke={getObjectStrokeColor(object, object.color)}
                        strokeWidth={getObjectStrokeWidth(object, 2)}
                      />
                    </>
                  ) : object.type === 'shape_oval' || object.type === 'shape_circle' ? (
                    <Ellipse
                      x={object.width / 2}
                      y={object.height / 2}
                      radiusX={object.type === 'shape_circle' ? Math.min(object.width, object.height) / 2 : object.width / 2}
                      radiusY={object.type === 'shape_circle' ? Math.min(object.width, object.height) / 2 : object.height / 2}
                      fill={object.color}
                      stroke={getObjectStrokeColor(object)}
                      strokeWidth={getObjectStrokeWidth(object, 1)}
                    />
                  ) : object.type === 'shape_rounded_rectangle' ? (
                    <Rect
                      x={0}
                      y={0}
                      width={object.width}
                      height={object.height}
                      fill={object.color}
                      stroke={getObjectStrokeColor(object)}
                      strokeWidth={getObjectStrokeWidth(object, 1)}
                      cornerRadius={12}
                    />
                  ) : getGenericShapePoints(object) ? (
                    <Line
                      points={getGenericShapePoints(object) ?? []}
                      closed
                      fill={object.color}
                      stroke={getObjectStrokeColor(object)}
                      strokeWidth={getObjectStrokeWidth(object, 1)}
                    />
                  ) : (
                    <Rect
                      x={0}
                      y={0}
                      width={object.width}
                      height={object.height}
                      fill={object.color}
                      stroke={getObjectStrokeColor(object)}
                      strokeWidth={getObjectStrokeWidth(object, 1)}
                      dash={object.type === 'roof_overlay' ? [10, 6] : undefined}
                      cornerRadius={cornerRadius}
                    />
                  )}

                  {canShowBoardTexture(object) &&
                    buildBoardTextureLines(object).map((points: number[], lineIndex: number) => (
                      <Line
                        key={`board-texture-${object.id}-${lineIndex}`}
                        points={points}
                        stroke="#ffffff"
                        strokeWidth={1}
                        opacity={0.35}
                        listening={false}
                      />
                    ))}

                  {object.type === 'ramp_with_rails' && (
                    <>
                      <Line points={[8, 4, 8, object.height - 4]} stroke="#1e3a8a" strokeWidth={2} />
                      <Line
                        points={[object.width - 8, 4, object.width - 8, object.height - 4]}
                        stroke="#1e3a8a"
                        strokeWidth={2}
                      />
                    </>
                  )}

                  {object.type === 'steps' && (
                    <>
                      {[1, 2, 3].map((stepIndex) => {
                        const y = (object.height * stepIndex) / 4;
                        return (
                          <Line
                            key={`${object.id}-step-line-${stepIndex}`}
                            points={[6, y, object.width - 6, y]}
                            stroke="#9f1239"
                            strokeWidth={1.5}
                          />
                        );
                      })}
                    </>
                  )}

                  {object.type === 'roof_overlay' && (
                    <>
                      <Line points={[6, 6, object.width - 6, object.height - 6]} stroke="#475569" strokeWidth={1.5} />
                      <Line points={[object.width - 6, 6, 6, object.height - 6]} stroke="#475569" strokeWidth={1.5} />
                    </>
                  )}

                  {object.type === 'rip_rap' && (
                    <>
                      <Line
                        points={[
                          4,
                          object.height * 0.18,
                          object.width * 0.22,
                          5,
                          object.width * 0.52,
                          object.height * 0.12,
                          object.width - 8,
                          object.height * 0.24,
                          object.width - 12,
                          object.height * 0.82,
                          object.width * 0.62,
                          object.height - 6,
                          object.width * 0.24,
                          object.height * 0.88,
                          6,
                          object.height * 0.68,
                        ]}
                        closed
                        fill={object.color}
                        opacity={0.45}
                        stroke={getObjectStrokeColor(object)}
                        strokeWidth={getObjectStrokeWidth(object, 1.4)}
                        listening={false}
                      />
                      {Array.from({ length: Math.max(10, Math.min(42, Math.round((object.width * object.height) / 260))) }, (_, stoneIndex) => {
                        const x = 10 + sitePatternSeed(stoneIndex + 3) * Math.max(1, object.width - 20);
                        const y = 8 + sitePatternSeed(stoneIndex + 17) * Math.max(1, object.height - 16);
                        const radius = Math.max(2.5, Math.min(7, Math.min(object.width, object.height) * (0.035 + sitePatternSeed(stoneIndex + 29) * 0.035)));

                        return (
                          <Circle
                            key={`rip-rap-stone-${stoneIndex}`}
                            x={x}
                            y={y}
                            radius={radius}
                            fill={stoneIndex % 3 === 0 ? '#6b7280' : stoneIndex % 3 === 1 ? '#9ca3af' : '#d1d5db'}
                            stroke="#4b5563"
                            strokeWidth={0.8}
                            opacity={0.88}
                            listening={false}
                          />
                        );
                      })}
                      {object.metadata?.ripRapFilterLayer !== false && (
                        <Line
                          points={[8, object.height - 10, object.width * 0.38, object.height - 5, object.width - 8, object.height - 14]}
                          stroke="#f8fafc"
                          strokeWidth={2}
                          dash={[5, 4]}
                          listening={false}
                        />
                      )}
                    </>
                  )}

                  {object.type === 'armour_stone' && (
                    <>
                      <Rect
                        x={0}
                        y={0}
                        width={object.width}
                        height={object.height}
                        fill={object.color}
                        opacity={0.35}
                        stroke={getObjectStrokeColor(object)}
                        strokeWidth={getObjectStrokeWidth(object, 1.5)}
                        listening={false}
                      />
                      {Array.from({ length: Math.max(1, Math.min(6, object.metadata?.armourStoneRows ?? 2)) }, (_, rowIndex) => {
                        const rowCount = Math.max(2, Math.floor(object.width / 34));
                        const blockHeight = object.height / Math.max(1, Math.min(6, object.metadata?.armourStoneRows ?? 2));

                        return Array.from({ length: rowCount }, (_, columnIndex) => {
                          const blockWidth = object.width / rowCount;
                          const offset = rowIndex % 2 === 0 ? 0 : blockWidth * 0.22;

                          return (
                            <Rect
                              key={`armour-stone-${rowIndex}-${columnIndex}`}
                              x={columnIndex * blockWidth - offset}
                              y={rowIndex * blockHeight}
                              width={blockWidth + 1}
                              height={blockHeight + 1}
                              fill={rowIndex % 2 === 0 ? '#a8a29e' : '#78716c'}
                              opacity={0.65}
                              stroke="#44403c"
                              strokeWidth={1}
                              listening={false}
                            />
                          );
                        });
                      })}
                    </>
                  )}

                  {object.type === 'boat_lift' && (
                    <>
                      <Line
                        points={[10, object.height / 2, object.width - 10, object.height / 2]}
                        stroke="#0e7490"
                        strokeWidth={2}
                      />
                      <Line
                        points={[object.width * 0.33, 6, object.width * 0.33, object.height - 6]}
                        stroke="#155e75"
                        strokeWidth={1.5}
                        dash={[4, 3]}
                      />
                      <Line
                        points={[object.width * 0.66, 6, object.width * 0.66, object.height - 6]}
                        stroke="#155e75"
                        strokeWidth={1.5}
                        dash={[4, 3]}
                      />
                    </>
                  )}

                  {object.type === 'boat_port' && (
                    <>
                      {[
                        [8, 8],
                        [object.width - 8, 8],
                        [8, object.height - 8],
                        [object.width - 8, object.height - 8],
                      ].map(([x, y]) => (
                        <Rect
                          key={`boat-port-post-${x}-${y}`}
                          x={x - 2}
                          y={y - 2}
                          width={4}
                          height={4}
                          fill="#2563eb"
                          listening={false}
                        />
                      ))}
                      <Line
                        points={[8, 8, object.width - 8, 8, object.width - 8, object.height - 8, 8, object.height - 8, 8, 8]}
                        stroke="#2563eb"
                        strokeWidth={1.5}
                        dash={[5, 4]}
                        listening={false}
                      />
                      {object.metadata?.boatPortRoofType === 'flat' ? (
                        <Line
                          points={[14, object.height / 2, object.width - 14, object.height / 2]}
                          stroke="#60a5fa"
                          strokeWidth={2}
                          listening={false}
                        />
                      ) : (
                        <>
                          <Line
                            points={[14, object.height - 10, object.width / 2, 10, object.width - 14, object.height - 10]}
                            stroke="#60a5fa"
                            strokeWidth={2}
                            lineJoin="round"
                            listening={false}
                          />
                          <Line
                            points={[object.width / 2, 10, object.width / 2, object.height - 10]}
                            stroke="#93c5fd"
                            strokeWidth={1}
                            listening={false}
                          />
                        </>
                      )}
                    </>
                  )}

                  {object.type === 'boathouse' && (
                    <>
                      <Line
                        points={[8, 8, object.width - 8, 8, object.width - 8, object.height - 8, 8, object.height - 8, 8, 8]}
                        stroke="#57534e"
                        strokeWidth={1.5}
                        listening={false}
                      />
                      {object.metadata?.boathouseRoofType === 'flat' ? (
                        <Line
                          points={[12, object.height / 2, object.width - 12, object.height / 2]}
                          stroke="#78716c"
                          strokeWidth={2}
                          listening={false}
                        />
                      ) : (
                        <Line
                          points={[12, object.height - 10, object.width / 2, 10, object.width - 12, object.height - 10]}
                          stroke="#78716c"
                          strokeWidth={2}
                          lineJoin="round"
                          listening={false}
                        />
                      )}
                      {Array.from({ length: Math.max(1, Math.min(2, object.metadata?.boathouseSlipCount ?? 1)) - 1 }, (_, slipIndex) => {
                        const x = (object.width * (slipIndex + 1)) / Math.max(1, Math.min(2, object.metadata?.boathouseSlipCount ?? 1));

                        return (
                          <Line
                            key={`boathouse-slip-${slipIndex}`}
                            points={[x, 10, x, object.height - 10]}
                            stroke="#a16207"
                            strokeWidth={1.5}
                            dash={[5, 4]}
                            listening={false}
                          />
                        );
                      })}
                      {object.metadata?.boathouseDoorStyle !== 'none' && (
                        <Line
                          points={[10, object.height - 8, object.width - 10, object.height - 8]}
                          stroke={object.metadata?.boathouseDoorStyle === 'open' ? '#16a34a' : '#92400e'}
                          strokeWidth={2.5}
                          listening={false}
                        />
                      )}
                    </>
                  )}

                  {object.type === 'accessory' && (
                    <>
                      {object.metadata?.accessoryType === 'bumper' ? (
                        <Rect
                          x={4}
                          y={object.height / 2 - 3}
                          width={object.width - 8}
                          height={6}
                          cornerRadius={3}
                          fill="#111827"
                          opacity={0.8}
                          listening={false}
                        />
                      ) : object.metadata?.accessoryType === 'ladder' ? (
                        <>
                          <Line points={[object.width * 0.35, 4, object.width * 0.35, object.height - 4]} stroke="#64748b" strokeWidth={2} listening={false} />
                          <Line points={[object.width * 0.65, 4, object.width * 0.65, object.height - 4]} stroke="#64748b" strokeWidth={2} listening={false} />
                          {[0.25, 0.5, 0.75].map((ratio) => (
                            <Line
                              key={`ladder-rung-${ratio}`}
                              points={[object.width * 0.35, object.height * ratio, object.width * 0.65, object.height * ratio]}
                              stroke="#94a3b8"
                              strokeWidth={1.5}
                              listening={false}
                            />
                          ))}
                        </>
                      ) : object.metadata?.accessoryType === 'bench' ? (
                        <>
                          <Rect
                            x={5}
                            y={object.height * 0.32}
                            width={object.width - 10}
                            height={object.height * 0.22}
                            fill="#a16207"
                            cornerRadius={2}
                            listening={false}
                          />
                          <Line points={[8, object.height * 0.72, object.width - 8, object.height * 0.72]} stroke="#64748b" strokeWidth={2} listening={false} />
                        </>
                      ) : object.metadata?.accessoryType === 'post' ? (
                        <Circle x={object.width / 2} y={object.height / 2} radius={Math.max(5, Math.min(object.width, object.height) * 0.28)} fill="#64748b" listening={false} />
                      ) : object.metadata?.accessoryType === 'tie_up_point' ? (
                        <>
                          <Circle
                            x={object.width / 2}
                            y={object.height / 2}
                            radius={Math.max(5, Math.min(object.width, object.height) * 0.28)}
                            stroke="#475569"
                            strokeWidth={2}
                            listening={false}
                          />
                          <Line points={[object.width * 0.25, object.height / 2, object.width * 0.75, object.height / 2]} stroke="#94a3b8" strokeWidth={1.5} listening={false} />
                        </>
                      ) : (
                        <>
                          <Line points={[object.width * 0.22, object.height / 2, object.width * 0.78, object.height / 2]} stroke="#64748b" strokeWidth={3} listening={false} />
                          <Line points={[object.width * 0.35, object.height * 0.32, object.width * 0.22, object.height / 2, object.width * 0.35, object.height * 0.68]} stroke="#64748b" strokeWidth={2} listening={false} />
                          <Line points={[object.width * 0.65, object.height * 0.32, object.width * 0.78, object.height / 2, object.width * 0.65, object.height * 0.68]} stroke="#64748b" strokeWidth={2} listening={false} />
                        </>
                      )}
                    </>
                  )}

                </Group>

                {!object.labelHidden && (
                <Group
                  x={labelX}
                  y={labelY}
                  listening={isLabelDraggable}
                  draggable={isLabelDraggable}
                  onClick={(event) => {
                    event.cancelBubble = true;
                    onObjectClick(object.id);
                  }}
                  onTap={(event) => {
                    event.cancelBubble = true;
                    onObjectClick(object.id);
                  }}
                  onMouseDown={(event) => {
                    event.cancelBubble = true;
                    onObjectClick(object.id);
                  }}
                  onDragStart={(event) => {
                    event.cancelBubble = true;
                    onObjectClick(object.id);
                  }}
                  onDragMove={(event) => {
                    event.cancelBubble = true;
                  }}
                  onDragEnd={(event) => {
                    event.cancelBubble = true;
                    onObjectLabelOffsetChange(object.id, {
                      x: event.target.x() - defaultLabelX,
                      y: event.target.y() - defaultLabelY,
                    });
                  }}
                >
                  <Rect
                    x={0}
                    y={0}
                    width={labelWidth}
                    height={labelHeight}
                    fill="#ffffff"
                    opacity={0.001}
                    strokeWidth={0}
                    cornerRadius={4}
                  />
                  {isLabelVertical ? (
                    verticalLabelCharacters.map((character, characterIndex) => (
                      <Text
                        key={`${object.id}-label-character-${characterIndex}`}
                        x={0}
                        y={4 + characterIndex * 14}
                        width={labelWidth}
                        height={14}
                        align="center"
                        verticalAlign="middle"
                        text={character}
                        fontSize={12}
                        fill={object.labelColor ?? '#0f172a'}
                      />
                    ))
                  ) : (
                    <Text
                      x={4}
                      y={4}
                      width={labelWidth - 8}
                      height={labelHeight - 8}
                      align="center"
                      verticalAlign="middle"
                      text={displayLabelText}
                      fontSize={12}
                      fill={object.labelColor ?? '#0f172a'}
                    />
                  )}
                </Group>
                )}

                {canShowObjectDimensions && (
                  <>
                    <Group
                      x={widthDimensionX}
                      y={widthDimensionY}
                      draggable={activeTool === 'select' && !object.locked && !interactionSession}
                      onDragEnd={(event) => {
                        event.cancelBubble = true;
                        onObjectDimensionOffsetChange(object.id, 'width', {
                          x: event.target.x() - defaultWidthDimensionX,
                          y: event.target.y() - defaultWidthDimensionY,
                        });
                      }}
                    >
                      <Rect x={0} y={-18} width={object.width} height={36} fill="#ffffff" opacity={0.001} />
                      <Line points={[0, 0, object.width, 0]} stroke="#2563eb" strokeWidth={2} />
                      <Line points={[0, 0, 8, -5]} stroke="#2563eb" strokeWidth={2} />
                      <Line points={[0, 0, 8, 5]} stroke="#2563eb" strokeWidth={2} />
                      <Line points={[object.width, 0, object.width - 8, -5]} stroke="#2563eb" strokeWidth={2} />
                      <Line points={[object.width, 0, object.width - 8, 5]} stroke="#2563eb" strokeWidth={2} />
                      <Text
                        x={0}
                        y={4}
                        width={object.width}
                        height={18}
                        align="center"
                        verticalAlign="middle"
                        text={getObjectDimensionLabel(object.width, currentScale)}
                        fontSize={12}
                        fontStyle="bold"
                        fill="#1d4ed8"
                      />
                    </Group>

                    <Group
                      x={heightDimensionX}
                      y={heightDimensionY}
                      draggable={activeTool === 'select' && !object.locked && !interactionSession}
                      onDragEnd={(event) => {
                        event.cancelBubble = true;
                        onObjectDimensionOffsetChange(object.id, 'height', {
                          x: event.target.x() - defaultHeightDimensionX,
                          y: event.target.y() - defaultHeightDimensionY,
                        });
                      }}
                    >
                      <Rect x={-18} y={0} width={100} height={object.height} fill="#ffffff" opacity={0.001} />
                      <Line points={[0, 0, 0, object.height]} stroke="#2563eb" strokeWidth={2} />
                      <Line points={[0, 0, -5, 8]} stroke="#2563eb" strokeWidth={2} />
                      <Line points={[0, 0, 5, 8]} stroke="#2563eb" strokeWidth={2} />
                      <Line points={[0, object.height, -5, object.height - 8]} stroke="#2563eb" strokeWidth={2} />
                      <Line points={[0, object.height, 5, object.height - 8]} stroke="#2563eb" strokeWidth={2} />
                      <Text
                        x={8}
                        y={object.height / 2 - 9}
                        width={90}
                        height={18}
                        align="left"
                        verticalAlign="middle"
                        text={getObjectDimensionLabel(object.height, currentScale)}
                        fontSize={12}
                        fontStyle="bold"
                        fill="#1d4ed8"
                      />
                    </Group>
                  </>
                )}

                {isSelected && (
                  <>
                    <Rect
                      x={0}
                      y={0}
                      width={object.width}
                      height={object.height}
                      stroke="#1d4ed8"
                      strokeWidth={isConnectorEndpointObject(object) ? 1.5 : 3}
                      fillEnabled={false}
                      cornerRadius={cornerRadius}
                      dash={isConnectorEndpointObject(object) ? [7, 5] : undefined}
                      opacity={isConnectorEndpointObject(object) ? 0.65 : 1}
                      listening={false}
                    />

                    <Line
                      points={[object.width / 2, 0, object.width / 2, -ROTATION_HANDLE_OFFSET]}
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      listening={false}
                    />

                    <Circle
                      x={object.width / 2}
                      y={-ROTATION_HANDLE_OFFSET}
                      radius={8}
                      fill="#ffffff"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      onMouseDown={(event) => beginRotate(event, object)}
                      onTouchStart={(event) => beginRotate(event, object)}
                    />

                    {isConnectorEndpointObject(object) && (
                      <>
                        <Circle
                          x={0}
                          y={0}
                          radius={8}
                          fill="#eff6ff"
                          stroke="#2563eb"
                          strokeWidth={3}
                          onMouseDown={(event) => beginConnectorEndpoint(event, object, 'start')}
                          onTouchStart={(event) => beginConnectorEndpoint(event, object, 'start')}
                        />
                        <Circle
                          x={object.width}
                          y={object.height}
                          radius={8}
                          fill="#eff6ff"
                          stroke="#2563eb"
                          strokeWidth={3}
                          onMouseDown={(event) => beginConnectorEndpoint(event, object, 'end')}
                          onTouchStart={(event) => beginConnectorEndpoint(event, object, 'end')}
                        />
                      </>
                    )}

                    <Circle
                      x={object.width}
                      y={object.height / 2}
                      radius={7}
                      fill="#ffffff"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      onMouseDown={(event) => beginResize(event, object.id, 'right')}
                      onTouchStart={(event) => beginResize(event, object.id, 'right')}
                    />

                    <Circle
                      x={object.width / 2}
                      y={object.height}
                      radius={7}
                      fill="#ffffff"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      onMouseDown={(event) => beginResize(event, object.id, 'bottom')}
                      onTouchStart={(event) => beginResize(event, object.id, 'bottom')}
                    />

                    <Circle
                      x={object.width}
                      y={object.height}
                      radius={7}
                      fill="#ffffff"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      onMouseDown={(event) => beginResize(event, object.id, 'corner')}
                      onTouchStart={(event) => beginResize(event, object.id, 'corner')}
                    />
                  </>
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
});
