import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useRef, type ElementRef } from 'react';
import { FloatingDockModel } from '@/components/render3d/FloatingDockModel';
import { WaterPlane } from '@/components/render3d/WaterPlane';
import type { CameraPreset, DockRenderSettings } from '@/components/render3d/types';

export interface DockSceneHandle {
  exportPng: () => void;
}

interface DockSceneProps {
  settings: DockRenderSettings;
  cameraPreset: CameraPreset;
}

const cameraPositions: Record<CameraPreset, [number, number, number]> = {
  isometric: [24, 18, 24],
  top: [0, 42, 0.1],
  side: [0, 12, 34],
  front: [34, 11, 0],
};

function CameraRig({ preset }: { preset: CameraPreset }) {
  const { camera } = useThree();
  const controlsRef = useRef<ElementRef<typeof OrbitControls> | null>(null);

  useEffect(() => {
    const targetPosition = cameraPositions[preset];
    camera.position.set(...targetPosition);
    camera.lookAt(0, 1, 0);
    controlsRef.current?.target.set(0, 1, 0);
    controlsRef.current?.update();
  }, [camera, preset]);

  return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05} />;
}

export const DockScene = forwardRef<DockSceneHandle, DockSceneProps>(({ settings, cameraPreset }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      <PerspectiveCamera makeDefault fov={45} position={cameraPositions.isometric} />
      <CameraRig preset={cameraPreset} />
      <color attach="background" args={['#e8f5fb']} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[18, 28, 16]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />
      <hemisphereLight args={['#dbeafe', '#6b7280', 0.55]} />
      <WaterPlane />
      <FloatingDockModel settings={settings} />
      <gridHelper args={[80, 40, '#94a3b8', '#cbd5e1']} position={[0, 0.01, 0]} />
    </Canvas>
  );
});

DockScene.displayName = 'DockScene';
