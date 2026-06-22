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

export const DockScene = forwardRef<DockSceneHandle, DockSceneProps>(({ settings, cameraPreset, projectModel, viewMode }, ref) => {
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
      <color attach="background" args={[isCustomerView ? '#eef8fb' : '#e8f5fb']} />
      <ambientLight intensity={isCustomerView ? 0.9 : 0.72} />
      <directionalLight
        position={isCustomerView ? [22, 32, 18] : [18, 28, 16]}
        intensity={isCustomerView ? 1.95 : 1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <hemisphereLight args={['#dbeafe', '#6b7280', isCustomerView ? 0.72 : 0.55]} />
      <WaterPlane viewMode={viewMode} />
      {projectModel ? <ProjectDockModel model={projectModel} viewMode={viewMode} /> : <FloatingDockModel settings={settings} />}
      {isCustomerView ? (
        <gridHelper args={[80, 8, '#d7e8ee', '#d7e8ee']} position={[0, 0.005, 0]} />
      ) : (
        <gridHelper args={[80, 40, '#94a3b8', '#cbd5e1']} position={[0, 0.01, 0]} />
      )}
    </Canvas>
  );
});

DockScene.displayName = 'DockScene';
