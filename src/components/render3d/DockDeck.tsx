import { deckFinishColors, type DeckFinish } from '@/components/render3d/types';

interface DockDeckProps {
  length: number;
  width: number;
  height: number;
  finish: DeckFinish;
}

export function DockDeck({ length, width, height, finish }: DockDeckProps) {
  const boardCount = Math.max(4, Math.round(width / 1.25));
  const boardSpacing = width / boardCount;
  const boardZStart = -width / 2 + boardSpacing / 2;

  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial color={deckFinishColors[finish]} roughness={0.72} />
      </mesh>

      {Array.from({ length: boardCount + 1 }, (_, index) => (
        <mesh key={index} position={[0, height + 0.012, boardZStart + index * boardSpacing]} receiveShadow>
          <boxGeometry args={[length + 0.04, 0.025, 0.035]} />
          <meshStandardMaterial color="#4b5563" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
