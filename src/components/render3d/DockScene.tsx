import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useRef, type ElementRef } from 'react';
import { FloatingDockModel } from '@/components/render3d/FloatingDockModel';
import { ProjectDockModel } from '@/components/render3d/ProjectDockModel';
import { WaterPlane } from '@/components/render3d/WaterPlane';
import type { CameraPreset, DockRenderSettings, ProjectRenderModel, ProjectRenderShorelinePoint, RenderViewMode } from '@/components/render3d/types';

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
}: {
  start: ProjectRenderShorelinePoint;
  end: ProjectRenderShorelinePoint;
  y: number;
  width: number;
  color: string;
  opacity: number;
}) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);

  if (length < 0.01) {
    return null;
  }

  return (
    <mesh position={[(start.x + end.x) / 2, y, (start.z + end.z) / 2]} rotation={[0, Math.atan2(-dz, dx), 0]}>
      <boxGeometry args={[length, 0.018, width]} />
      <meshStandardMaterial color={color} roughness={0.72} transparent opacity={opacity} />
    </mesh>
  );
}

function BuildPlanShoreline({ points, viewMode }: { points: ProjectRenderShorelinePoint[]; viewMode: RenderViewMode }) {
  if (points.length < 2) {
    return null;
  }

  const isCustomerView = viewMode === 'customer';
  const edgeColor = isCustomerView ? '#2f5361' : '#0f766e';
  const shoreBandColor = isCustomerView ? '#d7c59d' : '#c9b582';
  const edgeWidth = isCustomerView ? 0.08 : 0.06;
  const bandWidth = isCustomerView ? 0.9 : 0.65;

  return (
    <group>
      {points.slice(0, -1).map((point, index) => (
        <ShorelineSegment
          key={`shore-band-${index}`}
          start={point}
          end={points[index + 1]}
          y={0.024}
          width={bandWidth}
          color={shoreBandColor}
          opacity={isCustomerView ? 0.34 : 0.28}
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
      <color attach="background" args={[isCustomerView ? '#f2fbfd' : '#e8f5fb']} />
      <ambientLight color={isCustomerView ? '#fff6e8' : '#f8fbff'} intensity={isCustomerView ? 0.82 : 0.7} />
      <directionalLight
        color={isCustomerView ? '#fff0cf' : '#ffffff'}
        position={isCustomerView ? [24, 34, 18] : [18, 28, 16]}
        intensity={isCustomerView ? 2.1 : 1.58}
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
      <directionalLight color="#d9f4ff" position={[-16, 12, -24]} intensity={isCustomerView ? 0.42 : 0.28} />
      <hemisphereLight args={[isCustomerView ? '#dff7ff' : '#dbeafe', isCustomerView ? '#9b8a66' : '#6b7280', isCustomerView ? 0.64 : 0.55]} />
      <WaterPlane viewMode={viewMode} />
      {projectModel?.shorelinePoints ? <BuildPlanShoreline points={projectModel.shorelinePoints} viewMode={viewMode} /> : null}
      {projectModel ? <ProjectDockModel model={projectModel} viewMode={viewMode} /> : showFallbackModel ? <FloatingDockModel settings={settings} /> : null}
      {!isCustomerView && (
        <gridHelper args={[80, 40, '#94a3b8', '#cbd5e1']} position={[0, 0.01, 0]} />
      )}
    </Canvas>
  );
});

DockScene.displayName = 'DockScene';
