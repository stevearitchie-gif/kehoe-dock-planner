import { getSalesMaterialPalette } from '@/components/render3d/salesMaterials';
import type { BoatPortRoofType, RenderViewMode } from '@/components/render3d/types';

export interface KehoeBoatPortProps {
  footprintLengthFt: number;
  footprintWidthFt: number;
  wallHeightFt?: number;
  roofRiseFt?: number;
  roofType?: BoatPortRoofType;
  postSideInsetFt?: number;
  postEndInsetFt?: number;
  opacity?: number;
  viewMode: RenderViewMode;
  roofColorOverride?: string;
}

const DEFAULT_WALL_HEIGHT_FT = 7;
const DEFAULT_ROOF_RISE_FT = 1.4;
const POST_SIZE_FT = 0.18;
const ROOF_OVERHANG_FT = 0.22;
const LOW_BASE_HEIGHT_FT = 0.18;
const PITCHED_ROOF_THICKNESS_FT = 0.14;
const MIN_FLAT_ROOF_DEPTH_FT = 0.28;
const MAX_FLAT_ROOF_DEPTH_FT = 0.65;

function getMaterials(viewMode: RenderViewMode) {
  const palette = getSalesMaterialPalette(viewMode);

  if (viewMode === 'customer') {
    return {
      post: palette.aluminum.color,
      frame: palette.aluminum.darkColor,
      roof: palette.roof.color,
      roofEdge: palette.roof.edgeColor,
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

function getClampedInset(value: number | undefined, maxInset: number) {
  if (!Number.isFinite(value) || Number(value) <= 0) {
    return 0;
  }

  return Math.min(Number(value), Math.max(0, maxInset));
}

function PitchedRoof({
  length,
  width,
  wallHeight,
  roofRise,
  materials,
  opacity,
  roofColor,
}: {
  length: number;
  width: number;
  wallHeight: number;
  roofRise: number;
  materials: ReturnType<typeof getMaterials>;
  opacity: number;
  roofColor: string;
}) {
  const roofLength = length + ROOF_OVERHANG_FT * 2;
  const halfWidth = width / 2 + ROOF_OVERHANG_FT;
  const roofPlaneWidth = Math.hypot(halfWidth, roofRise);
  const slopeAngle = Math.atan2(roofRise, halfWidth);
  const roofCenterY = wallHeight + roofRise / 2;
  const roofCenterZ = halfWidth / 2;

  return (
    <>
      {[-1, 1].map((zSign) => (
        <mesh
          key={`roof-plane-${zSign}`}
          position={[0, roofCenterY, zSign * roofCenterZ]}
          rotation={[zSign * slopeAngle, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[roofLength, PITCHED_ROOF_THICKNESS_FT, roofPlaneWidth]} />
          <meshStandardMaterial color={roofColor} roughness={0.36} metalness={0.08} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}
      <mesh position={[0, wallHeight + roofRise + 0.02, 0]} castShadow>
        <boxGeometry args={[roofLength, 0.08, 0.12]} />
        <meshStandardMaterial color={materials.roofEdge} roughness={0.32} metalness={0.14} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      {[-1, 1].map((zSign) => (
        <mesh key={`eave-fascia-${zSign}`} position={[0, wallHeight - 0.02, zSign * halfWidth]} castShadow>
          <boxGeometry args={[roofLength, 0.12, 0.1]} />
          <meshStandardMaterial color={materials.roofEdge} roughness={0.34} metalness={0.12} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}
    </>
  );
}

export function KehoeBoatPort({
  footprintLengthFt,
  footprintWidthFt,
  wallHeightFt,
  roofRiseFt,
  roofType = 'pitched',
  postSideInsetFt,
  postEndInsetFt,
  opacity = 1,
  viewMode,
  roofColorOverride,
}: KehoeBoatPortProps) {
  if (!Number.isFinite(footprintLengthFt) || !Number.isFinite(footprintWidthFt) || footprintLengthFt <= 0 || footprintWidthFt <= 0) {
    return null;
  }

  const materials = getMaterials(viewMode);
  const roofColor = roofColorOverride?.trim() || materials.roof;
  const length = Math.max(2, footprintLengthFt);
  const width = Math.max(1.5, footprintWidthFt);
  const wallHeight = getPositiveValue(wallHeightFt, DEFAULT_WALL_HEIGHT_FT);
  const roofRise = getPositiveValue(roofRiseFt, DEFAULT_ROOF_RISE_FT);
  const normalizedRoofType: BoatPortRoofType = roofType === 'flat' ? 'flat' : 'pitched';
  const postEndInset = getClampedInset(postEndInsetFt, length / 2 - POST_SIZE_FT);
  const postSideInset = getClampedInset(postSideInsetFt, width / 2 - POST_SIZE_FT);
  const postX = length / 2 - POST_SIZE_FT / 2 - postEndInset;
  const postZ = width / 2 - POST_SIZE_FT / 2 - postSideInset;
  const postFrameLength = Math.max(POST_SIZE_FT, postX * 2 + POST_SIZE_FT);
  const postFrameWidth = Math.max(POST_SIZE_FT, postZ * 2 + POST_SIZE_FT);
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
      {viewMode === 'internal' && (
        <mesh position={[0, LOW_BASE_HEIGHT_FT / 2, 0]} receiveShadow>
          <boxGeometry args={[length, LOW_BASE_HEIGHT_FT, width]} />
          <meshStandardMaterial color={materials.base} roughness={0.68} transparent opacity={0.36} />
        </mesh>
      )}

      {postPositions.map(([x, z]) => (
        <mesh key={`post-${x}-${z}`} position={[x, wallHeight / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[POST_SIZE_FT, wallHeight, POST_SIZE_FT]} />
          <meshStandardMaterial color={materials.post} roughness={0.28} metalness={0.34} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}

      {[-1, 1].map((zSign) => (
        <mesh key={`side-frame-${zSign}`} position={[0, frameY, zSign * postZ]} castShadow receiveShadow>
          <boxGeometry args={[postFrameLength, 0.12, 0.12]} />
          <meshStandardMaterial color={materials.frame} roughness={0.3} metalness={0.3} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}
      {[-1, 1].map((xSign) => (
        <mesh key={`end-frame-${xSign}`} position={[xSign * postX, frameY, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.12, postFrameWidth]} />
          <meshStandardMaterial color={materials.frame} roughness={0.3} metalness={0.3} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}

      {normalizedRoofType === 'flat' ? (
        <mesh position={[0, flatRoofCenterY, 0]} castShadow receiveShadow>
          <boxGeometry args={[length + ROOF_OVERHANG_FT * 2, flatRoofDepth, width + ROOF_OVERHANG_FT * 2]} />
          <meshStandardMaterial color={roofColor} roughness={0.38} metalness={0.08} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ) : (
        <PitchedRoof length={length} width={width} wallHeight={wallHeight} roofRise={roofRise} materials={materials} opacity={opacity} roofColor={roofColor} />
      )}
    </group>
  );
}
