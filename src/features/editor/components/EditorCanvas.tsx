import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Layer, Line, Stage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Point } from '@/types/dock';
import type { ToolMode } from '@/features/editor/toolDefinitions';

interface EditorCanvasProps {
  activeTool: ToolMode;
  scalePoints: Point[];
  onCanvasPointClick: (point: Point) => void;
  zoom: number;
  onZoomChange: (nextZoom: number) => void;
}

const GRID_SIZE = 40;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function EditorCanvas({ activeTool, scalePoints, onCanvasPointClick, zoom, onZoomChange }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

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

  const scaleLinePoints = useMemo(() => {
    if (scalePoints.length < 2) {
      return null;
    }

    return [scalePoints[0].x, scalePoints[0].y, scalePoints[1].x, scalePoints[1].y];
  }, [scalePoints]);

  const isPanTool = activeTool === 'pan';

  const handlePointerDown = (event: KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'scale') {
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
          {gridLines.map((linePoints) => (
            <Line key={linePoints.join('-')} points={linePoints} stroke="#e2e8f0" strokeWidth={1} />
          ))}
        </Layer>

        <Layer listening={false}>
          {scaleLinePoints && <Line points={scaleLinePoints} stroke="#2563eb" strokeWidth={3} lineCap="round" />}
          {scalePoints.map((point) => (
            <Circle key={`${point.x}-${point.y}`} x={point.x} y={point.y} radius={5} fill="#1d4ed8" />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
