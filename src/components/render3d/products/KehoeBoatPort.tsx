import type { RenderViewMode } from '@/components/render3d/types';

export interface KehoeBoatPortProps {
  footprintLengthFt: number;
  footprintWidthFt: number;
  opacity?: number;
  viewMode: RenderViewMode;
}

const PORT_HEIGHT_FT = 0.34;
const SIDE_GUIDE_HEIGHT_FT = 0.22;
const SIDE_GUIDE_WIDTH_FT = 0.26;
const SEGMENT_LINE_HEIGHT_FT = 0.018;
const CENTER_GROOVE_WIDTH_FT = 0.34;

function getMaterials(viewMode: RenderViewMode) {
  if (viewMode === 'customer') {
    return {
      body: '#d7e7f4',
      side: '#b8d5ea',
      seam: '#9fc1d8',
      groove: '#8fb5cc',
      hardware: '#8aa6b6',
    };
  }

  return {
    body: '#bfdbfe',
    side: '#60a5fa',
    seam: '#2563eb',
    groove: '#1d4ed8',
    hardware: '#0f766e',
  };
}

export function KehoeBoatPort({ footprintLengthFt, footprintWidthFt, opacity = 1, viewMode }: KehoeBoatPortProps) {
  if (!Number.isFinite(footprintLengthFt) || !Number.isFinite(footprintWidthFt) || footprintLengthFt <= 0 || footprintWidthFt <= 0) {
    return null;
  }

  const materials = getMaterials(viewMode);
  const length = Math.max(2, footprintLengthFt);
  const width = Math.max(1.5, footprintWidthFt);
  const bodyWidth = Math.max(0.8, width - SIDE_GUIDE_WIDTH_FT * 2);
  const entryEndX = -length / 2;
  const sideGuideLength = Math.max(0.8, length * 0.82);
  const sideGuideCenterX = entryEndX + sideGuideLength / 2;
  const guideZ = width / 2 - SIDE_GUIDE_WIDTH_FT / 2;
  const segmentCount = Math.max(3, Math.min(10, Math.round(length / 2)));
  const segmentSpacing = length / segmentCount;
  const grooveLength = Math.max(0.8, length * 0.74);
  const grooveCenterX = entryEndX + grooveLength / 2;
  const entryRollerX = entryEndX + 0.32;

  return (
    <group>
      <mesh position={[0, PORT_HEIGHT_FT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, PORT_HEIGHT_FT, bodyWidth]} />
        <meshStandardMaterial color={materials.body} roughness={0.62} metalness={0.02} transparent={opacity < 1} opacity={opacity} />
      </mesh>

      {[-1, 1].map((zSign) => (
        <mesh key={`side-guide-${zSign}`} position={[sideGuideCenterX, PORT_HEIGHT_FT + SIDE_GUIDE_HEIGHT_FT / 2, zSign * guideZ]} castShadow receiveShadow>
          <boxGeometry args={[sideGuideLength, SIDE_GUIDE_HEIGHT_FT, SIDE_GUIDE_WIDTH_FT]} />
          <meshStandardMaterial color={materials.side} roughness={0.58} metalness={0.02} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}

      <mesh position={[grooveCenterX, PORT_HEIGHT_FT + 0.018, 0]} receiveShadow>
        <boxGeometry args={[grooveLength, SEGMENT_LINE_HEIGHT_FT, CENTER_GROOVE_WIDTH_FT]} />
        <meshStandardMaterial color={materials.groove} roughness={0.7} transparent={opacity < 1} opacity={opacity} />
      </mesh>

      {Array.from({ length: segmentCount - 1 }, (_, index) => {
        const x = entryEndX + segmentSpacing * (index + 1);

        return (
          <mesh key={`segment-line-${index}`} position={[x, PORT_HEIGHT_FT + 0.03, 0]} receiveShadow>
            <boxGeometry args={[0.035, SEGMENT_LINE_HEIGHT_FT, bodyWidth - 0.18]} />
            <meshStandardMaterial color={materials.seam} roughness={0.76} transparent={opacity < 1} opacity={opacity} />
          </mesh>
        );
      })}

      {[-1, 1].map((zSign) => (
        <mesh key={`entry-roller-${zSign}`} position={[entryRollerX, PORT_HEIGHT_FT + 0.09, zSign * bodyWidth * 0.24]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, Math.max(0.32, bodyWidth * 0.22), 16]} />
          <meshStandardMaterial color={materials.hardware} roughness={0.44} metalness={0.1} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}

      {viewMode === 'internal' && (
        <mesh position={[length / 2 - 0.18, PORT_HEIGHT_FT + 0.08, 0]} receiveShadow>
          <boxGeometry args={[0.1, 0.08, width]} />
          <meshStandardMaterial color={materials.seam} roughness={0.7} transparent opacity={0.56} />
        </mesh>
      )}
    </group>
  );
}
