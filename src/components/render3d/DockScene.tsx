import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type ElementRef } from 'react';
import { FloatingDockModel } from '@/components/render3d/FloatingDockModel';
import { ProjectDockModel } from '@/components/render3d/ProjectDockModel';
import { getSalesMaterialPalette } from '@/components/render3d/salesMaterials';
import { WaterPlane } from '@/components/render3d/WaterPlane';
import type {
  CameraPreset,
  DockRenderSettings,
  ProjectRenderElement,
  ProjectRenderModel,
  ProjectRenderShorelinePoint,
  RenderViewMode,
} from '@/components/render3d/types';

export interface DockSceneHandle {
  exportPng: (options?: DockSceneExportPngOptions) => void;
}

interface DockSceneProps {
  settings: DockRenderSettings;
  cameraPreset: CameraPreset;
  projectModel?: ProjectRenderModel | null;
  viewMode: RenderViewMode;
  showFallbackModel?: boolean;
}

interface DockSceneExportOverlay {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  title: string;
  body: string;
}

interface DockSceneExportProjectDetailsOverlay {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  rows: Array<{ label: string; value: string }>;
}

interface DockSceneExportPngOptions {
  disclaimer?: DockSceneExportOverlay;
  projectDetails?: DockSceneExportProjectDetailsOverlay;
}

const cameraPositions: Record<CameraPreset, [number, number, number]> = {
  isometric: [28, 17, 26],
  top: [0, 42, 0.1],
  side: [0, 12, 34],
  front: [34, 11, 0],
};

const customerCameraPositions: Record<CameraPreset, [number, number, number]> = {
  isometric: [34, 16, 28],
  top: [0, 44, 0.1],
  side: [0, 10, 36],
  front: [36, 10, 0],
};

const THREE_DOUBLE_SIDE = 2;

function drawRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const clampedRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + clampedRadius, y);
  context.lineTo(x + width - clampedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + clampedRadius);
  context.lineTo(x + width, y + height - clampedRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height);
  context.lineTo(x + clampedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - clampedRadius);
  context.lineTo(x, y + clampedRadius);
  context.quadraticCurveTo(x, y, x + clampedRadius, y);
  context.closePath();
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (currentLine && context.measureText(nextLine).width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = nextLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawExportDisclaimer(context: CanvasRenderingContext2D, overlay: DockSceneExportOverlay, canvas: HTMLCanvasElement) {
  if (overlay.viewportWidth <= 0 || overlay.viewportHeight <= 0) {
    return;
  }

  const scaleX = canvas.width / overlay.viewportWidth;
  const scaleY = canvas.height / overlay.viewportHeight;
  const x = overlay.x * scaleX;
  const y = overlay.y * scaleY;
  const width = overlay.width * scaleX;
  const height = overlay.height * scaleY;
  const padding = 14 * Math.min(scaleX, scaleY);
  const titleFontSize = 13 * Math.min(scaleX, scaleY);
  const bodyFontSize = 12 * Math.min(scaleX, scaleY);
  const lineHeight = 16 * Math.min(scaleX, scaleY);

  context.save();
  drawRoundedRect(context, x, y, width, height, 8 * Math.min(scaleX, scaleY));
  context.fillStyle = 'rgba(255, 255, 255, 0.92)';
  context.fill();
  context.strokeStyle = 'rgba(15, 23, 42, 0.28)';
  context.lineWidth = Math.max(1, Math.min(scaleX, scaleY));
  context.stroke();

  context.fillStyle = '#0f172a';
  context.font = `700 ${titleFontSize}px Arial, sans-serif`;
  context.textBaseline = 'top';
  context.fillText(overlay.title, x + padding, y + padding);

  context.fillStyle = '#334155';
  context.font = `400 ${bodyFontSize}px Arial, sans-serif`;
  const lines = wrapCanvasText(context, overlay.body, width - padding * 2);
  const bodyTop = y + padding + titleFontSize + 8 * Math.min(scaleX, scaleY);
  lines.forEach((line, index) => {
    const lineY = bodyTop + index * lineHeight;
    if (lineY + lineHeight <= y + height - padding / 2) {
      context.fillText(line, x + padding, lineY);
    }
  });

  context.restore();
}

function drawExportProjectDetails(context: CanvasRenderingContext2D, overlay: DockSceneExportProjectDetailsOverlay, canvas: HTMLCanvasElement) {
  if (overlay.viewportWidth <= 0 || overlay.viewportHeight <= 0) {
    return;
  }

  const scaleX = canvas.width / overlay.viewportWidth;
  const scaleY = canvas.height / overlay.viewportHeight;
  const scale = Math.min(scaleX, scaleY);
  const x = overlay.x * scaleX;
  const y = overlay.y * scaleY;
  const width = overlay.width * scaleX;
  const height = overlay.height * scaleY;
  const headerHeight = 34 * scale;
  const labelWidth = 96 * scale;
  const paddingX = 12 * scale;
  const rowHeight = Math.max(22 * scale, (height - headerHeight) / Math.max(1, overlay.rows.length));

  context.save();
  context.fillStyle = 'rgba(255, 255, 255, 0.94)';
  context.fillRect(x, y, width, height);
  context.strokeStyle = 'rgba(15, 23, 42, 0.62)';
  context.lineWidth = Math.max(1, scale);
  context.strokeRect(x, y, width, height);

  context.fillStyle = '#b91c1c';
  context.fillRect(x + paddingX, y + 9 * scale, 68 * scale, 18 * scale);
  context.fillStyle = '#ffffff';
  context.font = `700 ${13 * scale}px Arial, sans-serif`;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.fillText('Kehoe', x + paddingX + 34 * scale, y + headerHeight / 2);

  context.fillStyle = '#0f172a';
  context.font = `700 ${12 * scale}px Arial, sans-serif`;
  context.textAlign = 'left';
  context.fillText('PROJECT DETAILS', x + paddingX + 82 * scale, y + headerHeight / 2);

  context.beginPath();
  context.moveTo(x, y + headerHeight);
  context.lineTo(x + width, y + headerHeight);
  context.stroke();

  overlay.rows.forEach((row, index) => {
    const rowY = y + headerHeight + index * rowHeight;

    context.strokeStyle = 'rgba(15, 23, 42, 0.3)';
    context.beginPath();
    context.moveTo(x, rowY);
    context.lineTo(x + width, rowY);
    context.stroke();

    context.fillStyle = '#475569';
    context.font = `700 ${10 * scale}px Arial, sans-serif`;
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText(row.label, x + paddingX, rowY + 6 * scale);

    context.fillStyle = '#0f172a';
    context.font = `400 ${11 * scale}px Arial, sans-serif`;
    const value = row.value || '-';
    const valueLines = wrapCanvasText(context, value, width - labelWidth - paddingX * 1.5);
    valueLines.slice(0, 2).forEach((line, lineIndex) => {
      context.fillText(line, x + labelWidth, rowY + 6 * scale + lineIndex * 13 * scale);
    });
  });

  context.restore();
}

function CameraRig({ preset, viewMode }: { preset: CameraPreset; viewMode: RenderViewMode }) {
  const { camera } = useThree();
  const controlsRef = useRef<ElementRef<typeof OrbitControls> | null>(null);

  useEffect(() => {
    const targetPosition = viewMode === 'customer' ? customerCameraPositions[preset] : cameraPositions[preset];
    if (preset === 'top') {
      camera.up.set(0, 0, -1);
    } else {
      camera.up.set(0, 1, 0);
    }
    camera.position.set(...targetPosition);
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
    controlsRef.current?.target.set(0, 1, 0);
    controlsRef.current?.update();
  }, [camera, preset, viewMode]);

  return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05} />;
}

function ShorelineSegment({
  start,
  end,
  y,
  width,
  color,
  opacity,
  sideOffset = 0,
}: {
  start: ProjectRenderShorelinePoint;
  end: ProjectRenderShorelinePoint;
  y: number;
  width: number;
  color: string;
  opacity: number;
  sideOffset?: number;
}) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);

  if (length < 0.01) {
    return null;
  }

  const normalX = -dz / length;
  const normalZ = dx / length;

  return (
    <mesh
      position={[(start.x + end.x) / 2 + normalX * sideOffset, y, (start.z + end.z) / 2 + normalZ * sideOffset]}
      rotation={[0, Math.atan2(-dz, dx), 0]}
    >
      <boxGeometry args={[length, 0.018, width]} />
      <meshStandardMaterial color={color} roughness={0.84} metalness={0} transparent opacity={opacity} />
    </mesh>
  );
}

function getOverallShoreNormal(points: ProjectRenderShorelinePoint[]) {
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const dx = lastPoint.x - firstPoint.x;
  const dz = lastPoint.z - firstPoint.z;
  const length = Math.hypot(dx, dz);

  if (length < 0.01) {
    return null;
  }

  return {
    x: -dz / length,
    z: dx / length,
  };
}

function getShorelineCenter(points: ProjectRenderShorelinePoint[]) {
  const totals = points.reduce(
    (result, point) => ({
      x: result.x + point.x,
      z: result.z + point.z,
    }),
    { x: 0, z: 0 },
  );

  return {
    x: totals.x / points.length,
    z: totals.z / points.length,
  };
}

function getShoreOffsetPoints(points: ProjectRenderShorelinePoint[], normal: { x: number; z: number }, shoreSideSign: number, depth: number) {
  return points.map((point) => {
    return {
      x: point.x + normal.x * shoreSideSign * depth,
      z: point.z + normal.z * shoreSideSign * depth,
      sourceX: point.sourceX,
      sourceY: point.sourceY,
    };
  });
}

function ShoreLandMesh({
  points,
  normal,
  shoreSideSign,
  depth,
  y,
  color,
  opacity,
}: {
  points: ProjectRenderShorelinePoint[];
  normal: { x: number; z: number };
  shoreSideSign: number;
  depth: number;
  y: number;
  color: string;
  opacity: number;
}) {
  const geometry = useMemo(() => {
    const offsetPoints = getShoreOffsetPoints(points, normal, shoreSideSign, depth);
    const vertices = new Float32Array(points.length * 2 * 3);
    const indices = new Uint16Array((points.length - 1) * 6);

    points.forEach((point, index) => {
      const shoreVertexIndex = index * 6;
      const landVertexIndex = shoreVertexIndex + 3;
      const offsetPoint = offsetPoints[index];

      vertices[shoreVertexIndex] = point.x;
      vertices[shoreVertexIndex + 1] = y;
      vertices[shoreVertexIndex + 2] = point.z;
      vertices[landVertexIndex] = offsetPoint.x;
      vertices[landVertexIndex + 1] = y;
      vertices[landVertexIndex + 2] = offsetPoint.z;
    });

    for (let index = 0; index < points.length - 1; index += 1) {
      const shoreA = index * 2;
      const landA = shoreA + 1;
      const shoreB = (index + 1) * 2;
      const landB = shoreB + 1;
      const triangleIndex = index * 6;

      indices[triangleIndex] = shoreA;
      indices[triangleIndex + 1] = shoreB;
      indices[triangleIndex + 2] = landB;
      indices[triangleIndex + 3] = shoreA;
      indices[triangleIndex + 4] = landB;
      indices[triangleIndex + 5] = landA;
    }

    return { vertices, indices };
  }, [depth, normal, points, shoreSideSign, y]);

  return (
    <mesh receiveShadow>
      <bufferGeometry onUpdate={(bufferGeometry) => bufferGeometry.computeVertexNormals()}>
        <bufferAttribute attach="attributes-position" args={[geometry.vertices, 3]} />
        <bufferAttribute attach="index" args={[geometry.indices, 1]} />
      </bufferGeometry>
      <meshStandardMaterial color={color} roughness={0.86} metalness={0} side={THREE_DOUBLE_SIDE} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function isPrimaryWaterElement(element: ProjectRenderElement) {
  return (
    element.type === 'floating_dock' ||
    element.type === 'stationary_dock' ||
    element.type === 'ramp_with_rails' ||
    element.type === 'ramp_without_rails' ||
    element.type === 'boat_lift' ||
    element.type === 'boat_port'
  );
}

function getShoreSideSign(points: ProjectRenderShorelinePoint[], elements: ProjectRenderElement[]) {
  const normal = getOverallShoreNormal(points);
  if (!normal) {
    return null;
  }

  const shorelineCenter = getShorelineCenter(points);
  const waterElements = elements.filter(isPrimaryWaterElement);
  const waterSideVotes = waterElements
    .map((element) => {
      const dot = (element.x - shorelineCenter.x) * normal.x + (element.z - shorelineCenter.z) * normal.z;
      return Math.abs(dot) > 0.001 ? Math.sign(dot) : 0;
    })
    .filter((side) => side !== 0);

  if (waterSideVotes.length === 0) {
    return null;
  }

  const waterSide = Math.sign(waterSideVotes.reduce((total, side) => total + side, 0));
  return waterSide === 0 ? null : -waterSide;
}

function BuildPlanShoreline({
  points,
  elements,
  viewMode,
}: {
  points: ProjectRenderShorelinePoint[];
  elements: ProjectRenderElement[];
  viewMode: RenderViewMode;
}) {
  if (points.length < 2) {
    return null;
  }

  const isCustomerView = viewMode === 'customer';
  const land = getSalesMaterialPalette(viewMode).land;
  const edgeWidth = isCustomerView ? 0.08 : 0.06;
  const landDepth = isCustomerView ? 180 : 140;
  const transitionWidth = isCustomerView ? 2.2 : 1.6;
  const normal = getOverallShoreNormal(points);
  const shoreSideSign = getShoreSideSign(points, elements);

  return (
    <group>
      {normal && shoreSideSign !== null ? (
        <>
          <ShoreLandMesh points={points} normal={normal} shoreSideSign={shoreSideSign} depth={landDepth} y={0.04} color={land.color} opacity={isCustomerView ? 1 : 0.78} />
          <ShoreLandMesh
            points={points}
            normal={normal}
            shoreSideSign={shoreSideSign}
            depth={transitionWidth}
            y={0.052}
            color={land.transitionColor}
            opacity={isCustomerView ? 0.78 : 0.58}
          />
        </>
      ) : null}
      {points.slice(0, -1).map((point, index) => (
        <ShorelineSegment
          key={`shore-edge-${index}`}
          start={point}
          end={points[index + 1]}
          y={0.041}
          width={edgeWidth}
          color={land.edgeColor}
          opacity={isCustomerView ? 0.78 : 0.9}
        />
      ))}
    </group>
  );
}

export const DockScene = forwardRef<DockSceneHandle, DockSceneProps>(({ settings, cameraPreset, projectModel, viewMode, showFallbackModel = true }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCustomerView = viewMode === 'customer';

  useImperativeHandle(ref, () => ({
    exportPng: (options?: DockSceneExportPngOptions) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const link = document.createElement('a');
      link.download = 'dock-render-3d.png';
      if (options?.disclaimer || options?.projectDetails) {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const context = exportCanvas.getContext('2d');

        if (context) {
          context.drawImage(canvas, 0, 0);
          if (options.projectDetails) {
            drawExportProjectDetails(context, options.projectDetails, canvas);
          }
          if (options.disclaimer) {
            drawExportDisclaimer(context, options.disclaimer, canvas);
          }
          link.href = exportCanvas.toDataURL('image/png');
        } else {
          link.href = canvas.toDataURL('image/png');
        }
      } else {
        link.href = canvas.toDataURL('image/png');
      }
      link.click();
    },
  }));

  return (
    <Canvas
      shadows
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        canvasRef.current = gl.domElement;
      }}
      className="h-full w-full bg-sky-50"
    >
      <PerspectiveCamera makeDefault fov={isCustomerView ? 38 : 45} position={customerCameraPositions.isometric} />
      <CameraRig preset={cameraPreset} viewMode={viewMode} />
      <color attach="background" args={[isCustomerView ? '#eef9fb' : '#e8f5fb']} />
      <fog attach="fog" args={[isCustomerView ? '#eef9fb' : '#e8f5fb', isCustomerView ? 58 : 70, isCustomerView ? 124 : 140]} />
      <ambientLight color={isCustomerView ? '#fff7e8' : '#f8fbff'} intensity={isCustomerView ? 0.9 : 0.7} />
      <directionalLight
        color={isCustomerView ? '#fff0cf' : '#ffffff'}
        position={isCustomerView ? [24, 36, 18] : [18, 28, 16]}
        intensity={isCustomerView ? 2.0 : 1.58}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00008}
        shadow-normalBias={0.02}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        shadow-camera-near={1}
        shadow-camera-far={90}
      />
      <directionalLight color="#dff7ff" position={[-18, 14, -24]} intensity={isCustomerView ? 0.48 : 0.28} />
      <hemisphereLight args={[isCustomerView ? '#e7fbff' : '#dbeafe', isCustomerView ? '#a49370' : '#6b7280', isCustomerView ? 0.7 : 0.55]} />
      <WaterPlane viewMode={viewMode} />
      {projectModel?.shorelinePoints ? <BuildPlanShoreline points={projectModel.shorelinePoints} elements={projectModel.elements} viewMode={viewMode} /> : null}
      {projectModel ? <ProjectDockModel model={projectModel} viewMode={viewMode} /> : showFallbackModel ? <FloatingDockModel settings={settings} /> : null}
      {!isCustomerView && (
        <gridHelper args={[80, 40, '#94a3b8', '#cbd5e1']} position={[0, 0.01, 0]} />
      )}
    </Canvas>
  );
});

DockScene.displayName = 'DockScene';
