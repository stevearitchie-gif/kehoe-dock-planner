import type { BoatPortRoofType, RenderViewMode } from '@/components/render3d/types';

export interface KehoeBoatPortProps {
  footprintLengthFt: number;
  footprintWidthFt: number;
  wallHeightFt?: number;
  roofRiseFt?: number;
  roofType?: BoatPortRoofType;
  opacity?: number;
  viewMode: RenderViewMode;
}

const DEFAULT_WALL_HEIGHT_FT = 7;
const DEFAULT_ROOF_RISE_FT = 1.4;
const POST_SIZE_FT = 0.18;
const ROOF_OVERHANG_FT = 0.22;
const LOW_BASE_HEIGHT_FT = 0.18;
const MIN_FLAT_ROOF_DEPTH_FT = 0.28;
const MAX_FLAT_ROOF_DEPTH_FT = 0.65;

function getMaterials(viewMode: RenderViewMode) {
  if (viewMode === 'customer') {
    return {
      post: '#d8e1e6',
      frame: '#b9c7cf',
      roof: '#eef4f7',
      roofEdge: '#cbd7dd',
      base: '#d7e7f4',
    };
  }

  return {
    post: '#60a5fa',
    frame: '#2563eb',
    roof: '#bfdbfe',
    roofEdge: '#1d4ed8',
    base: '#dbeafe',
  };
}

function getPositiveValue(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

function PitchedRoof({
  length,
  width,
  wallHeight,
  roofRise,
  color,
  opacity,
}: {
  length: number;
  width: number;
  wallHeight: number;
  roofRise: number;
  color: string;
  opacity: number;
}) {
  const halfLength = length / 2 + ROOF_OVERHANG_FT;
  const halfWidth = width / 2 + ROOF_OVERHANG_FT;
  const eaveY = wallHeight;
  const ridgeY = wallHeight + roofRise;
  const vertices = new Float32Array([
    -halfLength,
    eaveY,
    -halfWidth,
    halfLength,
    eaveY,
    -halfWidth,
    -halfLength,
    ridgeY,
    0,
    halfLength,
    ridgeY,
    0,
    -halfLength,
    eaveY,
    halfWidth,
    halfLength,
    eaveY,
    halfWidth,
  ]);
  const indices = new Uint16Array([
    0, 1, 3, 0, 3, 2,
    2, 3, 5, 2, 5, 4,
    0, 2, 4, 0, 4, 1,
    1, 4, 5, 1, 5, 3,
  ]);

  return (
    <mesh castShadow receiveShadow>
      <bufferGeometry onUpdate={(geometry) => geometry.computeVertexNormals()}>
        <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
        <bufferAttribute attach="index" args={[indices, 1]} />
      </bufferGeometry>
      <meshStandardMaterial color={color} roughness={0.42} metalness={0.04} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

export function KehoeBoatPort({
  footprintLengthFt,
  footprintWidthFt,
  wallHeightFt,
  roofRiseFt,
  roofType = 'pitched',
  opacity = 1,
  viewMode,
}: KehoeBoatPortProps) {
  if (!Number.isFinite(footprintLengthFt) || !Number.isFinite(footprintWidthFt) || footprintLengthFt <= 0 || footprintWidthFt <= 0) {
    return null;
  }

  const materials = getMaterials(viewMode);
  const length = Math.max(2, footprintLengthFt);
  const width = Math.max(1.5, footprintWidthFt);
  const wallHeight = getPositiveValue(wallHeightFt, DEFAULT_WALL_HEIGHT_FT);
  const roofRise = getPositiveValue(roofRiseFt, DEFAULT_ROOF_RISE_FT);
  const normalizedRoofType: BoatPortRoofType = roofType === 'flat' ? 'flat' : 'pitched';
  const postX = length / 2 - POST_SIZE_FT / 2;
  const postZ = width / 2 - POST_SIZE_FT / 2;
  const postPositions = [
    [-postX, -postZ],
    [postX, -postZ],
    [-postX, postZ],
    [postX, postZ],
  ];
  const frameY = wallHeight;
  const flatRoofDepth = Math.max(MIN_FLAT_ROOF_DEPTH_FT, Math.min(MAX_FLAT_ROOF_DEPTH_FT, roofRise));
  const flatRoofCenterY = wallHeight + flatRoofDepth / 2;

  return (
    <group>
      <mesh position={[0, LOW_BASE_HEIGHT_FT / 2, 0]} receiveShadow>
        <boxGeometry args={[length, LOW_BASE_HEIGHT_FT, width]} />
        <meshStandardMaterial color={materials.base} roughness={0.68} transparent opacity={Math.min(opacity, 0.74)} />
      </mesh>

      {postPositions.map(([x, z]) => (
        <mesh key={`post-${x}-${z}`} position={[x, wallHeight / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[POST_SIZE_FT, wallHeight, POST_SIZE_FT]} />
          <meshStandardMaterial color={materials.post} roughness={0.36} metalness={0.12} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}

      {[-1, 1].map((zSign) => (
        <mesh key={`side-frame-${zSign}`} position={[0, frameY, zSign * postZ]} castShadow receiveShadow>
          <boxGeometry args={[length, 0.12, 0.12]} />
          <meshStandardMaterial color={materials.frame} roughness={0.4} metalness={0.1} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}
      {[-1, 1].map((xSign) => (
        <mesh key={`end-frame-${xSign}`} position={[xSign * postX, frameY, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.12, width]} />
          <meshStandardMaterial color={materials.frame} roughness={0.4} metalness={0.1} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}

      {normalizedRoofType === 'flat' ? (
        <mesh position={[0, flatRoofCenterY, 0]} castShadow receiveShadow>
          <boxGeometry args={[length + ROOF_OVERHANG_FT * 2, flatRoofDepth, width + ROOF_OVERHANG_FT * 2]} />
          <meshStandardMaterial color={materials.roof} roughness={0.44} metalness={0.04} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ) : (
        <PitchedRoof length={length} width={width} wallHeight={wallHeight} roofRise={roofRise} color={materials.roof} opacity={opacity} />
      )}

      {normalizedRoofType === 'pitched' && (
        <mesh position={[0, wallHeight + roofRise + 0.02, 0]} castShadow>
          <boxGeometry args={[length + ROOF_OVERHANG_FT * 2, 0.08, 0.12]} />
          <meshStandardMaterial color={materials.roofEdge} roughness={0.42} metalness={0.08} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      )}
    </group>
  );
}
