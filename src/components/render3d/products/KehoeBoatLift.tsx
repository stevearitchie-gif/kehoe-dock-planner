import type { RenderViewMode } from '@/components/render3d/types';

export interface KehoeBoatLiftProps {
  footprintLengthFt: number;
  footprintWidthFt: number;
  heightFt?: number;
  opacity?: number;
  viewMode: RenderViewMode;
}

const CABLE_SIZE_FT = 0.035;
const CRADLE_HEIGHT_FT = 0.46;
const CRADLE_BEAM_SIZE_FT = 0.14;
const WINDER_RADIUS_FT = 0.085;
const WINDER_LENGTH_FT = 0.46;

function getMaterials(viewMode: RenderViewMode) {
  if (viewMode === 'customer') {
    return {
      frame: '#d8e1e6',
      frameDark: '#aebbc2',
      cable: '#5f6f7a',
      cradle: '#9aa8af',
      bunk: '#6f6255',
      motor: '#c7d1d7',
      hardware: '#8f9ba3',
      winder: '#b9c4ca',
    };
  }

  return {
    frame: '#67e8f9',
    frameDark: '#0e7490',
    cable: '#155e75',
    cradle: '#94a3b8',
    bunk: '#7c5f46',
    motor: '#38bdf8',
    hardware: '#0f766e',
    winder: '#67e8f9',
  };
}

export function KehoeBoatLift({
  footprintLengthFt,
  footprintWidthFt,
  opacity = 1,
  viewMode,
}: KehoeBoatLiftProps) {
  if (
    !Number.isFinite(footprintLengthFt) ||
    !Number.isFinite(footprintWidthFt) ||
    footprintLengthFt <= 0 ||
    footprintWidthFt <= 0
  ) {
    return null;
  }

  const materials = getMaterials(viewMode);
  const postInset = Math.min(0.38, Math.max(0.16, Math.min(footprintLengthFt, footprintWidthFt) * 0.08));
  const postX = Math.max(0.2, footprintLengthFt / 2 - postInset);
  const postZ = Math.max(0.2, footprintWidthFt / 2 - postInset);
  const cradleLength = Math.max(0.8, footprintLengthFt * 0.72);
  const cradleWidth = Math.max(0.5, footprintWidthFt * 0.58);
  const bunkOffsetZ = Math.max(0.18, cradleWidth * 0.24);
  const winderX = Math.min(postX - 0.2, cradleLength * 0.34);
  const driveX = Math.max(-postX + 0.46, postX - 0.56);
  const driveZ = -bunkOffsetZ - 0.2;
  const lowCableHeight = 0.62;
  const postMarkerHeight = viewMode === 'internal' ? 0.72 : 0.58;
  const postMarkerSize = viewMode === 'internal' ? 0.16 : 0.14;
  const postPositions = [
    [-postX, -postZ],
    [postX, -postZ],
    [-postX, postZ],
    [postX, postZ],
  ];

  return (
    <group>
      {postPositions.map(([x, z]) => (
        <mesh key={`low-post-marker-${x}-${z}`} position={[x, postMarkerHeight / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[postMarkerSize, postMarkerHeight, postMarkerSize]} />
          <meshStandardMaterial
            color={viewMode === 'customer' ? materials.frame : materials.frameDark}
            roughness={0.42}
            metalness={0.14}
            transparent={opacity < 1 || viewMode === 'internal'}
            opacity={viewMode === 'internal' ? 0.78 : opacity}
          />
        </mesh>
      ))}

      {[-bunkOffsetZ, bunkOffsetZ].flatMap((z) =>
        [-winderX, winderX].map((x) => (
          <mesh key={`winder-${x}-${z}`} position={[x, CRADLE_HEIGHT_FT + 0.28, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[WINDER_RADIUS_FT, WINDER_RADIUS_FT, WINDER_LENGTH_FT, 16]} />
            <meshStandardMaterial color={materials.winder} roughness={0.32} metalness={0.24} transparent={opacity < 1} opacity={opacity} />
          </mesh>
        )),
      )}

      {[-bunkOffsetZ, bunkOffsetZ].map((z) => (
        <mesh key={`cradle-side-${z}`} position={[0, CRADLE_HEIGHT_FT, z]} castShadow receiveShadow>
          <boxGeometry args={[cradleLength, CRADLE_BEAM_SIZE_FT, CRADLE_BEAM_SIZE_FT]} />
          <meshStandardMaterial color={materials.cradle} roughness={0.48} metalness={0.1} />
        </mesh>
      ))}
      {[-cradleLength * 0.34, cradleLength * 0.34].map((x) => (
        <mesh key={`cradle-cross-${x}`} position={[x, CRADLE_HEIGHT_FT, 0]} castShadow receiveShadow>
          <boxGeometry args={[CRADLE_BEAM_SIZE_FT, CRADLE_BEAM_SIZE_FT, cradleWidth]} />
          <meshStandardMaterial color={materials.cradle} roughness={0.48} metalness={0.1} />
        </mesh>
      ))}
      {[-cradleLength * 0.18, cradleLength * 0.18].map((x) => (
        <mesh key={`cradle-mid-cross-${x}`} position={[x, CRADLE_HEIGHT_FT - 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[CRADLE_BEAM_SIZE_FT * 0.72, CRADLE_BEAM_SIZE_FT * 0.72, cradleWidth * 0.82]} />
          <meshStandardMaterial color={materials.frameDark} roughness={0.5} metalness={0.08} />
        </mesh>
      ))}
      {[-bunkOffsetZ, bunkOffsetZ].map((z) => (
        <mesh key={`bunk-${z}`} position={[0, CRADLE_HEIGHT_FT + 0.12, z]} rotation={[z > 0 ? -0.08 : 0.08, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[cradleLength, 0.12, 0.2]} />
          <meshStandardMaterial color={materials.bunk} roughness={0.72} />
        </mesh>
      ))}

      {[-cradleLength * 0.34, cradleLength * 0.34].flatMap((x) =>
        [-bunkOffsetZ, bunkOffsetZ].map((z) => (
          <mesh key={`cable-${x}-${z}`} position={[x, CRADLE_HEIGHT_FT + 0.2 + lowCableHeight / 2, z]} castShadow>
            <boxGeometry args={[CABLE_SIZE_FT, lowCableHeight, CABLE_SIZE_FT]} />
            <meshStandardMaterial color={materials.cable} roughness={0.46} metalness={0.2} />
          </mesh>
        )),
      )}

      {postPositions.map(([x, z]) => (
        <mesh key={`cable-keeper-${x}-${z}`} position={[x * 0.88, CRADLE_HEIGHT_FT + 0.42, z * 0.88]} castShadow>
          <boxGeometry args={[0.045, 0.34, 0.045]} />
          <meshStandardMaterial color={materials.cable} roughness={0.44} metalness={0.18} />
        </mesh>
      ))}

      <mesh position={[driveX, CRADLE_HEIGHT_FT + 0.44, driveZ]} castShadow>
        <boxGeometry args={[0.48, 0.26, 0.34]} />
        <meshStandardMaterial color={materials.motor} roughness={0.42} metalness={0.12} />
      </mesh>
      <mesh position={[driveX - 0.34, CRADLE_HEIGHT_FT + 0.4, -bunkOffsetZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.28, 16]} />
        <meshStandardMaterial color={materials.hardware} roughness={0.36} metalness={0.2} />
      </mesh>
    </group>
  );
}
