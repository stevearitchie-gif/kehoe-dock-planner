import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Image, Layer, Line, Rect, Stage, Text } from 'react-konva';
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
  zoom: number;
  onZoomChange: (nextZoom: number) => void;
}

const GRID_SIZE = 40;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const MIN_OBJECT_SIZE = 10;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
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
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!backgroundImageUrl) {
      setBackgroundImage(null);
      return;
    }

    const image = new window.Image();
    image.src = backgroundImageUrl;
    image.onload = () => {
      setBackgroundImage(image);
    };
    image.onerror = () => {
      setBackgroundImage(null);
    };
  }, [backgroundImageUrl]);

  const gridLines = useMemo(() => {
    const lines: number[][] = [];
    const xLineCount = Math.ceil(canvasSize.width / GRID_SIZE);
    const yLineCount = Math.ceil(canvasSize.height / GRID_SIZE);

    for (let ix = 0; ix <= xLineCount; ix += 1) {
      const x = ix * GRID_SIZE;
      lines.push([x, 0, x, canvasSize.height]);
    }

    for (let iy = 0; iy <= yLineCount; iy += 1) {
      const y = iy * GRID_SIZE;
      lines.push([0, y, canvasSize.width, y]);
    }

    return lines;
  }, [canvasSize.height, canvasSize.width]);

  const fittedBackgroundImage = useMemo(() => {
    if (!backgroundImage) {
      return null;
    }

    const widthRatio = canvasSize.width / backgroundImage.width;
    const heightRatio = canvasSize.height / backgroundImage.height;
    const scale = Math.min(widthRatio, heightRatio);
    const width = backgroundImage.width * scale;
    const height = backgroundImage.height * scale;

    return {
      x: (canvasSize.width - width) / 2,
      y: (canvasSize.height - height) / 2,
      width,
      height,
    };
  }, [backgroundImage, canvasSize.height, canvasSize.width]);

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

  const handlePointerDown = (event: KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'scale' && activeTool !== 'shoreline' && activeTool !== 'floating_dock' && activeTool !== 'stationary_dock') {
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
    <div ref={containerRef} className="h-full w-full rounded-lg border border-slate-200 bg-white shadow-sm">
      <Stage
        width={canvasSize.width}
        height={canvasSize.height}
        draggable={isPanTool}
        scaleX={zoom}
        scaleY={zoom}
        onWheel={handleWheel}
        onMouseDown={handlePointerDown}
        className="cursor-crosshair"
      >
        <Layer listening={false}>
          {backgroundImage && fittedBackgroundImage && (
            <Image
              image={backgroundImage}
              x={fittedBackgroundImage.x}
              y={fittedBackgroundImage.y}
              width={fittedBackgroundImage.width}
              height={fittedBackgroundImage.height}
              listening={false}
            />
          )}
        </Layer>

        <Layer listening={false}>
          {gridLines.map((linePoints) => (
            <Line key={linePoints.join('-')} points={linePoints} stroke="#e2e8f0" strokeWidth={1} />
          ))}
        </Layer>

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

            return (
              <Group
                key={object.id}
                x={object.x}
                y={object.y}
                draggable={isDraggable}
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
                <Rect
                  x={0}
                  y={0}
                  width={object.width}
                  height={object.height}
                  rotation={object.rotation}
                  fill={object.color}
                  stroke={isSelected ? '#1d4ed8' : '#334155'}
                  strokeWidth={isSelected ? 3 : 1}
                />
                <Text
                  x={0}
                  y={object.height / 2 - 7}
                  width={object.width}
                  align="center"
                  verticalAlign="middle"
                  text={object.label}
                  fontSize={12}
                  fill="#0f172a"
                  listening={false}
                />
                {isSelected && (
                  <Circle
                    x={object.width}
                    y={object.height}
                    radius={7}
                    fill="#ffffff"
                    stroke="#1d4ed8"
                    strokeWidth={2}
                    draggable
                    dragOnTop={false}
                    onMouseDown={(event) => event.cancelBubble = true}
                    onTouchStart={(event) => event.cancelBubble = true}
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
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
