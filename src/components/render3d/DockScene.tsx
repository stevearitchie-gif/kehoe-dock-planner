import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type ElementRef } from 'react';
// @ts-ignore -- three is provided by the existing React Three Fiber runtime dependency.
import { CanvasTexture, RepeatWrapping, type Texture } from 'three';
import { FloatingDockModel } from '@/components/render3d/FloatingDockModel';
import { ProjectDockModel } from '@/components/render3d/ProjectDockModel';
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
  exportPng: () => void;
}

interface DockSceneProps {
  settings: DockRenderSettings;
  cameraPreset: CameraPreset;
  projectModel?: ProjectRenderModel | null;
  viewMode: RenderViewMode;
  showFallbackModel?: boolean;
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
  texture,
}: {
  start: ProjectRenderShorelinePoint;
  end: ProjectRenderShorelinePoint;
  y: number;
  width: number;
  color: string;
  opacity: number;
  sideOffset?: number;
  texture?: Texture | null;
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
      <meshStandardMaterial color={color} map={texture ?? undefined} roughness={0.84} metalness={0} transparent opacity={opacity} />
    </mesh>
  );
}

function createLandTexture(isCustomerView: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.fillStyle = isCustomerView ? '#d3c196' : '#c6b27f';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 900; index += 1) {
    const x = (index * 37) % canvas.width;
    const y = (index * 61) % canvas.height;
    const radius = 0.7 + ((index * 17) % 7) * 0.18;
    const hue = (index * 23) % 3;
    context.fillStyle =
      hue === 0
        ? 'rgba(118, 137, 86, 0.16)'
        : hue === 1
          ? 'rgba(154, 124, 75, 0.12)'
          : 'rgba(232, 217, 177, 0.13)';
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  for (let y = 18; y < canvas.height; y += 22) {
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x <= canvas.width; x += 16) {
      context.lineTo(x, y + Math.sin((x + y) * 0.07) * 1.4);
    }
    context.strokeStyle = 'rgba(94, 111, 69, 0.08)';
    context.lineWidth = 1;
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(6, 3);
  return texture;
}

function isPrimaryWaterElement(element: ProjectRenderElement) {
  return element.type === 'floating_dock' || element.type === 'stationary_dock' || element.type === 'boat_lift' || element.type === 'boat_port';
}

function getNearestSegmentSide(point: { x: number; z: number }, shorelinePoints: ProjectRenderShorelinePoint[]) {
  let closestDistance = Number.POSITIVE_INFINITY;
  let closestSide = 0;

  for (let index = 0; index < shorelinePoints.length - 1; index += 1) {
    const start = shorelinePoints[index];
    const end = shorelinePoints[index + 1];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const segmentLengthSquared = dx * dx + dz * dz;

    if (segmentLengthSquared <= 0.0001) {
      continue;
    }

    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / segmentLengthSquared));
    const closestX = start.x + dx * t;
    const closestZ = start.z + dz * t;
    const distance = Math.hypot(point.x - closestX, point.z - closestZ);
    const side = dx * (point.z - start.z) - dz * (point.x - start.x);

    if (distance < closestDistance && Math.abs(side) > 0.001) {
      closestDistance = distance;
      closestSide = Math.sign(side);
    }
  }

  return closestSide;
}

function getShoreSideSign(points: ProjectRenderShorelinePoint[], elements: ProjectRenderElement[]) {
  const waterElements = elements.filter(isPrimaryWaterElement);
  const waterSideVotes = waterElements
    .map((element) => getNearestSegmentSide({ x: element.x, z: element.z }, points))
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
  const isCustomerView = viewMode === 'customer';
  const landTexture = useMemo(() => createLandTexture(isCustomerView), [isCustomerView]);

  if (points.length < 2) {
    return null;
  }

  const edgeColor = isCustomerView ? '#2f5361' : '#0f766e';
  const landColor = isCustomerView ? '#d4c19a' : '#c9b582';
  const transitionColor = isCustomerView ? '#bba879' : '#a99767';
  const edgeWidth = isCustomerView ? 0.08 : 0.06;
  const landDepth = isCustomerView ? 8 : 6;
  const transitionWidth = isCustomerView ? 0.7 : 0.55;
  const shoreSideSign = getShoreSideSign(points, elements);
  const isCenteredFallback = shoreSideSign === null;
  const landWidth = isCenteredFallback ? 3.6 : landDepth;
  const landOffset = isCenteredFallback ? 0 : (shoreSideSign * landDepth) / 2;
  const transitionOffset = isCenteredFallback ? 0 : (shoreSideSign * transitionWidth) / 2;

  return (
    <group>
      {points.slice(0, -1).map((point, index) => (
        <ShorelineSegment
          key={`shore-land-${index}`}
          start={point}
          end={points[index + 1]}
          y={0.016}
          width={landWidth}
          color={landColor}
          opacity={isCustomerView ? 0.82 : 0.66}
          sideOffset={landOffset}
          texture={landTexture}
        />
      ))}
      {points.slice(0, -1).map((point, index) => (
        <ShorelineSegment
          key={`shore-transition-${index}`}
          start={point}
          end={points[index + 1]}
          y={0.034}
          width={transitionWidth}
          color={transitionColor}
          opacity={isCustomerView ? 0.54 : 0.44}
          sideOffset={transitionOffset}
        />
      ))}
      {points.slice(0, -1).map((point, index) => (
        <ShorelineSegment
          key={`shore-edge-${index}`}
          start={point}
          end={points[index + 1]}
          y={0.041}
          width={edgeWidth}
          color={edgeColor}
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
    exportPng: () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const link = document.createElement('a');
      link.download = 'dock-render-3d.png';
      link.href = canvas.toDataURL('image/png');
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
