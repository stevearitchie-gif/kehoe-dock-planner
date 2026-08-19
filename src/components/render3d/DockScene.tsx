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

function getSegmentNormal(start: ProjectRenderShorelinePoint, end: ProjectRenderShorelinePoint) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);

  if (length < 0.01) {
    return { x: 0, z: 1 };
  }

  return {
    x: -dz / length,
    z: dx / length,
  };
}

function getShoreOffsetPoints(points: ProjectRenderShorelinePoint[], shoreSideSign: number, depth: number) {
  return points.map((point, index) => {
    const previousNormal = index > 0 ? getSegmentNormal(points[index - 1], point) : null;
    const nextNormal = index < points.length - 1 ? getSegmentNormal(point, points[index + 1]) : null;
    const normalX = (previousNormal?.x ?? 0) + (nextNormal?.x ?? 0);
    const normalZ = (previousNormal?.z ?? 0) + (nextNormal?.z ?? 0);
    const normalLength = Math.hypot(normalX, normalZ);
    const fallbackNormal = previousNormal ?? nextNormal ?? { x: 0, z: 1 };
    const offsetNormal =
      normalLength > 0.01
        ? { x: normalX / normalLength, z: normalZ / normalLength }
        : fallbackNormal;

    return {
      x: point.x + offsetNormal.x * shoreSideSign * depth,
      z: point.z + offsetNormal.z * shoreSideSign * depth,
      sourceX: point.sourceX,
      sourceY: point.sourceY,
    };
  });
}

function LandStripMesh({
  points,
  shoreSideSign,
  depth,
  y,
  color,
  opacity,
}: {
  points: ProjectRenderShorelinePoint[];
  shoreSideSign: number;
  depth: number;
  y: number;
  color: string;
  opacity: number;
}) {
  const geometry = useMemo(() => {
    const offsetPoints = getShoreOffsetPoints(points, shoreSideSign, depth);
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
  }, [depth, points, shoreSideSign, y]);

  return (
    <mesh receiveShadow>
      <bufferGeometry onUpdate={(bufferGeometry) => bufferGeometry.computeVertexNormals()}>
        <bufferAttribute attach="attributes-position" args={[geometry.vertices, 3]} />
        <bufferAttribute attach="index" args={[geometry.indices, 1]} />
      </bufferGeometry>
      <meshStandardMaterial color={color} roughness={0.86} metalness={0} transparent opacity={opacity} />
    </mesh>
  );
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
  if (points.length < 2) {
    return null;
  }

  const isCustomerView = viewMode === 'customer';
  const land = getSalesMaterialPalette(viewMode).land;
  const edgeWidth = isCustomerView ? 0.08 : 0.06;
  const landDepth = isCustomerView ? 64 : 52;
  const transitionWidth = isCustomerView ? 1.6 : 1.2;
  const shoreSideSign = getShoreSideSign(points, elements) ?? 1;

  return (
    <group>
      <LandStripMesh points={points} shoreSideSign={shoreSideSign} depth={landDepth} y={0.016} color={land.color} opacity={isCustomerView ? 0.86 : 0.68} />
      <LandStripMesh points={points} shoreSideSign={shoreSideSign} depth={transitionWidth} y={0.034} color={land.transitionColor} opacity={isCustomerView ? 0.58 : 0.48} />
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
