import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useRef, type ElementRef } from 'react';
import { FloatingDockModel } from '@/components/render3d/FloatingDockModel';
import { ProjectDockModel } from '@/components/render3d/ProjectDockModel';
import { WaterPlane } from '@/components/render3d/WaterPlane';
import type { CameraPreset, DockRenderSettings, ProjectRenderModel, RenderViewMode } from '@/components/render3d/types';

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

function ShorelineReference({ viewMode }: { viewMode: RenderViewMode }) {
  const isCustomerView = viewMode === 'customer';
  const landColor = isCustomerView ? '#d8c9a8' : '#cbd5b1';
  const shoreColor = isCustomerView ? '#b7a477' : '#94a36f';

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, -42]} receiveShadow>
        <planeGeometry args={[150, 28, 1, 1]} />
        <meshStandardMaterial color={landColor} roughness={0.92} metalness={0} />
      </mesh>
      <mesh position={[0, 0.018, -28.5]} receiveShadow>
        <boxGeometry args={[150, 0.025, 0.16]} />
        <meshStandardMaterial color={shoreColor} roughness={0.88} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, -30.2]} receiveShadow>
        <planeGeometry args={[150, 2.8, 1, 1]} />
        <meshStandardMaterial color={isCustomerView ? '#c9b98c' : '#aab98c'} roughness={0.9} metalness={0} transparent opacity={0.46} />
      </mesh>
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
      <ShorelineReference viewMode={viewMode} />
      {projectModel ? <ProjectDockModel model={projectModel} viewMode={viewMode} /> : showFallbackModel ? <FloatingDockModel settings={settings} /> : null}
      {!isCustomerView && (
        <gridHelper args={[80, 40, '#94a3b8', '#cbd5e1']} position={[0, 0.01, 0]} />
      )}
    </Canvas>
  );
});

DockScene.displayName = 'DockScene';
