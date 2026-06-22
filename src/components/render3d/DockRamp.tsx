import { deckFinishColors, type DeckFinish } from '@/components/render3d/types';

interface DockRampProps {
  dockLength: number;
  dockHeight: number;
  rampLength: number;
  rampWidth: number;
  finish: DeckFinish;
}

export function DockRamp({ dockLength, dockHeight, rampLength, rampWidth, finish }: DockRampProps) {
  const rampAngle = -0.16;
  const rampThickness = 0.3;
  const centerX = -dockLength / 2 - rampLength / 2 + 0.15;
  const centerY = dockHeight + 0.05;

  return (
    <group position={[centerX, centerY, 0]} rotation={[0, 0, rampAngle]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[rampLength, rampThickness, rampWidth]} />
        <meshStandardMaterial color={deckFinishColors[finish]} roughness={0.74} />
      </mesh>
      <mesh position={[0, rampThickness / 2 + 0.025, -rampWidth / 2 - 0.04]} castShadow>
        <boxGeometry args={[rampLength, 0.08, 0.12]} />
        <meshStandardMaterial color="#475569" roughness={0.55} />
      </mesh>
      <mesh position={[0, rampThickness / 2 + 0.025, rampWidth / 2 + 0.04]} castShadow>
        <boxGeometry args={[rampLength, 0.08, 0.12]} />
        <meshStandardMaterial color="#475569" roughness={0.55} />
      </mesh>
    </group>
  );
}
