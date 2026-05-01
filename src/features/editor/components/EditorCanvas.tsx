import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { DockObject, Point } from '@/types/dock';
import type { ToolMode } from '@/features/editor/toolDefinitions';

interface EditorCanvasProps {
  activeTool: ToolMode;
  scalePoints: Point[];
  shorelinePoints: Point[];
  objects: DockObject[];
  selectedObjectId: string | null;
  backgroundImageUrl?: string;
  onCanvasPointClick: (point: Point) => void;
  onObjectClick: (objectId: string) => void;
  onObjectPositionChange: (objectId: string, point: Point) => void;
  onObjectSizeChange: (objectId: string, size: { width: number; height: number }) => void;
  onObjectRotationChange: (objectId: string, rotation: number) => void;
  isSnapToGridEnabled: boolean;
  zoom: number;
  onZoomChange: (nextZoom: number) => void;
}

const GRID_SIZE = 40;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const MIN_OBJECT_SIZE = 10;
const ROTATION_HANDLE_OFFSET = 28;

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

function getRotationFromHandle(
  object: DockObject,
  event: KonvaEventObject<MouseEvent | TouchEvent | DragEvent>,
): number {
  const localX = event.target.x();
  const localY = event.target.y();
  const angleRadians = Math.atan2(localY, localX - object.width / 2);
  return (angleRadians * 180) / Math.PI + 90;
}

export function EditorCanvas({
  activeTool,
  scalePoints,
  shorelinePoints,
  objects,
  selectedObjectId,
  backgroundImageUrl,
  onCanvasPointClick,
  onObjectClick,
  onObjectPositionChange,
  onObjectSizeChange,
  onObjectRotationChange,
  isSnapToGridEnabled,
  zoom,
  onZoomChange,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);

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

  const scaleLinePoints = useMemo(() => {
    if (scalePoints.length < 2) {
      return null;
    }

    return [scalePoints[0].x, scalePoints[0].y, scalePoints[1].x, scalePoints[1].y];
  }, [scalePoints]);

  const shorelineLinePoints = useMemo(() => {
    if (shorelinePoints.length < 2) {
      return null;
    }

    return shorelinePoints.flatMap((point) => [point.x, point.y]);
  }, [shorelinePoints]);

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

    onCanvasPointClick(pointerPosition);
  };

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();

    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const factor = 1 + direction * 0.1;
    onZoomChange(clampZoom(zoom * factor));
  };

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden rounded-md border border-slate-200 bg-white">
      <Stage
        width={canvasSize.width}
        height={canvasSize.height}
        scaleX={zoom}
        scaleY={zoom}
        draggable={isPanTool}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
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
          {shorelinePoints.map((point) => (
            <Circle key={`shoreline-${point.x}-${point.y}`} x={point.x} y={point.y} radius={5} fill="#0f766e" />
          ))}

          {scaleLinePoints && <Line points={scaleLinePoints} stroke="#2563eb" strokeWidth={3} lineCap="round" />}
          {scalePoints.map((point) => (
            <Circle key={`${point.x}-${point.y}`} x={point.x} y={point.y} radius={5} fill="#1d4ed8" />
          ))}
        </Layer>

        <Layer>
          {objects.map((object) => {
            const isSelected = object.id === selectedObjectId;
            const isDraggable = activeTool === 'select' && !object.locked;
            const objectOpacity = getObjectOpacity(object.opacity);

            const cornerRadius =
              object.type === 'ramp_with_rails' || object.type === 'ramp_without_rails' ? 4 : 0;

            return (
              <Group
                key={object.id}
                x={object.x}
                y={object.y}
                rotation={object.rotation}
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
                onDragStart={() => onObjectClick(object.id)}
                onDragMove={(event) => {
                  onObjectPositionChange(object.id, {
                    x: event.target.x(),
                    y: event.target.y(),
                  });
                }}
                onDragEnd={(event) => {
                  onObjectPositionChange(object.id, {
                    x: event.target.x(),
                    y: event.target.y(),
                  });
                }}
              >
                <Group opacity={objectOpacity} listening={false}>
                  <Rect
                    x={0}
                    y={0}
                    width={object.width}
                    height={object.height}
                    fill={object.color}
                    stroke="#334155"
                    strokeWidth={1}
                    dash={object.type === 'roof_overlay' ? [10, 6] : undefined}
                    cornerRadius={cornerRadius}
                  />

                  {object.type === 'ramp_with_rails' && (
                    <>
                      <Line
                        points={[8, 4, 8, object.height - 4]}
                        stroke="#1e3a8a"
                        strokeWidth={2}
                      />
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
                      <Line
                        points={[6, 6, object.width - 6, object.height - 6]}
                        stroke="#475569"
                        strokeWidth={1.5}
                      />
                      <Line
                        points={[object.width - 6, 6, 6, object.height - 6]}
                        stroke="#475569"
                        strokeWidth={1.5}
                      />
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

                  <Text
                    x={0}
                    y={object.height / 2 - 7}
                    width={object.width}
                    align="center"
                    verticalAlign="middle"
                    text={object.label}
                    fontSize={12}
                    fill="#0f172a"
                  />
                </Group>

                {isSelected && (
                  <>
                    <Rect
                      x={0}
                      y={0}
                      width={object.width}
                      height={object.height}
                      stroke="#1d4ed8"
                      strokeWidth={3}
                      fillEnabled={false}
                      cornerRadius={cornerRadius}
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
                      draggable
                      dragOnTop={false}
                      onMouseDown={(event) => (event.cancelBubble = true)}
                      onTouchStart={(event) => (event.cancelBubble = true)}
                      onDragMove={(event) => {
                        onObjectClick(object.id);
                        onObjectRotationChange(object.id, getRotationFromHandle(object, event));
                      }}
                      onDragEnd={(event) => {
                        onObjectClick(object.id);
                        onObjectRotationChange(object.id, getRotationFromHandle(object, event));
                      }}
                    />

                    <Circle
                      x={object.width}
                      y={object.height / 2}
                      radius={7}
                      fill="#ffffff"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      draggable
                      dragOnTop={false}
                      dragBoundFunc={(position) => ({
                        x: position.x,
                        y: object.height / 2,
                      })}
                      onMouseDown={(event) => (event.cancelBubble = true)}
                      onTouchStart={(event) => (event.cancelBubble = true)}
                      onDragMove={(event) => {
                        const nextWidth = Math.max(MIN_OBJECT_SIZE, event.target.x());
                        onObjectClick(object.id);
                        onObjectSizeChange(object.id, {
                          width: nextWidth,
                          height: object.height,
                        });
                      }}
                      onDragEnd={(event) => {
                        const nextWidth = Math.max(MIN_OBJECT_SIZE, event.target.x());
                        onObjectClick(object.id);
                        onObjectSizeChange(object.id, {
                          width: nextWidth,
                          height: object.height,
                        });
                      }}
                    />

                    <Circle
                      x={object.width / 2}
                      y={object.height}
                      radius={7}
                      fill="#ffffff"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      draggable
                      dragOnTop={false}
                      dragBoundFunc={(position) => ({
                        x: object.width / 2,
                        y: position.y,
                      })}
                      onMouseDown={(event) => (event.cancelBubble = true)}
                      onTouchStart={(event) => (event.cancelBubble = true)}
                      onDragMove={(event) => {
                        const nextHeight = Math.max(MIN_OBJECT_SIZE, event.target.y());
                        onObjectClick(object.id);
                        onObjectSizeChange(object.id, {
                          width: object.width,
                          height: nextHeight,
                        });
                      }}
                      onDragEnd={(event) => {
                        const nextHeight = Math.max(MIN_OBJECT_SIZE, event.target.y());
                        onObjectClick(object.id);
                        onObjectSizeChange(object.id, {
                          width: object.width,
                          height: nextHeight,
                        });
                      }}
                    />

                    <Circle
                      x={object.width}
                      y={object.height}
                      radius={7}
                      fill="#ffffff"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      draggable
                      dragOnTop={false}
                      onMouseDown={(event) => (event.cancelBubble = true)}
                      onTouchStart={(event) => (event.cancelBubble = true)}
                      onDragMove={(event) => {
                        const nextWidth = Math.max(MIN_OBJECT_SIZE, event.target.x());
                        const nextHeight = Math.max(MIN_OBJECT_SIZE, event.target.y());
                        onObjectClick(object.id);
                        onObjectSizeChange(object.id, {
                          width: nextWidth,
                          height: nextHeight,
                        });
                      }}
                      onDragEnd={(event) => {
                        const nextWidth = Math.max(MIN_OBJECT_SIZE, event.target.x());
                        const nextHeight = Math.max(MIN_OBJECT_SIZE, event.target.y());
                        onObjectClick(object.id);
                        onObjectSizeChange(object.id, {
                          width: nextWidth,
                          height: nextHeight,
                        });
                      }}
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
}
