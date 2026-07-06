import type {
  BoathouseDoorStyle,
  BoathouseRoofFinish,
  BoathouseRoofType,
  BoathouseSlipCount,
  BoathouseWallFinish,
  RenderViewMode,
} from '@/components/render3d/types';

export interface KehoeBoathouseProps {
  footprintLengthFt: number;
  footprintWidthFt: number;
  wallHeightFt?: number;
  roofRiseFt?: number;
  roofType?: BoathouseRoofType;
  slipCount?: BoathouseSlipCount;
  doorStyle?: BoathouseDoorStyle;
  wallFinish?: BoathouseWallFinish;
  roofFinish?: BoathouseRoofFinish;
  opacity?: number;
  viewMode: RenderViewMode;
}

const DEFAULT_WALL_HEIGHT_FT = 9;
const DEFAULT_ROOF_RISE_FT = 3;
const WALL_THICKNESS_FT = 0.18;
const POST_SIZE_FT = 0.22;
const ROOF_OVERHANG_FT = 0.32;
const GABLE_ROOF_THICKNESS_FT = 0.18;
const MIN_FLAT_ROOF_DEPTH_FT = 0.3;
const MAX_FLAT_ROOF_DEPTH_FT = 0.8;

function getPositiveValue(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

function getMaterials(viewMode: RenderViewMode, wallFinish: BoathouseWallFinish, roofFinish: BoathouseRoofFinish) {
  const customerWall = {
    neutral: '#d6d3c8',
    wood: '#b68a5f',
    metal: '#c8d0d5',
  }[wallFinish];
  const customerRoof = {
    neutral: '#e7e5df',
    metal: '#c9d3d9',
    shingle: '#8a7b70',
  }[roofFinish];

  if (viewMode === 'customer') {
    return {
      wall: customerWall,
      frame: '#9ca3a0',
      roof: customerRoof,
      roofEdge: roofFinish === 'shingle' ? '#6f635b' : '#aab6bd',
      door: '#7a6a5c',
      lane: '#8a6b45',
      base: '#d6d3c8',
    };
  }

  return {
    wall: '#facc15',
    frame: '#ca8a04',
    roof: '#fde68a',
    roofEdge: '#a16207',
    door: '#92400e',
    lane: '#2563eb',
    base: '#fef3c7',
  };
}

function GableRoof({
  length,
  width,
  wallHeight,
  roofRise,
  materials,
  opacity,
}: {
  length: number;
  width: number;
  wallHeight: number;
  roofRise: number;
  materials: ReturnType<typeof getMaterials>;
  opacity: number;
}) {
  const roofLength = length + ROOF_OVERHANG_FT * 2;
  const halfWidth = width / 2 + ROOF_OVERHANG_FT;
  const planeWidth = Math.hypot(halfWidth, roofRise);
  const slopeAngle = Math.atan2(roofRise, halfWidth);
  const centerY = wallHeight + roofRise / 2;
  const centerZ = halfWidth / 2;

  return (
    <>
      {[-1, 1].map((zSign) => (
        <mesh key={`gable-plane-${zSign}`} position={[0, centerY, zSign * centerZ]} rotation={[zSign * slopeAngle, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[roofLength, GABLE_ROOF_THICKNESS_FT, planeWidth]} />
          <meshStandardMaterial color={materials.roof} roughness={0.48} metalness={0.05} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}
      <mesh position={[0, wallHeight + roofRise + 0.02, 0]} castShadow>
        <boxGeometry args={[roofLength, 0.1, 0.14]} />
        <meshStandardMaterial color={materials.roofEdge} roughness={0.48} metalness={0.08} transparent={opacity < 1} opacity={opacity} />
      </mesh>
    </>
  );
}

export function KehoeBoathouse({
  footprintLengthFt,
  footprintWidthFt,
  wallHeightFt,
  roofRiseFt,
  roofType = 'gable',
  slipCount = 1,
  doorStyle = 'open',
  wallFinish = 'neutral',
  roofFinish = 'metal',
  opacity = 1,
  viewMode,
}: KehoeBoathouseProps) {
  if (!Number.isFinite(footprintLengthFt) || !Number.isFinite(footprintWidthFt) || footprintLengthFt <= 0 || footprintWidthFt <= 0) {
    return null;
  }

  const length = Math.max(4, footprintLengthFt);
  const width = Math.max(4, footprintWidthFt);
  const wallHeight = getPositiveValue(wallHeightFt, DEFAULT_WALL_HEIGHT_FT);
  const roofRise = getPositiveValue(roofRiseFt, DEFAULT_ROOF_RISE_FT);
  const normalizedRoofType: BoathouseRoofType = roofType === 'flat' ? 'flat' : 'gable';
  const normalizedSlipCount: BoathouseSlipCount = slipCount === 2 ? 2 : 1;
  const normalizedWallFinish: BoathouseWallFinish = wallFinish === 'wood' || wallFinish === 'metal' ? wallFinish : 'neutral';
  const normalizedRoofFinish: BoathouseRoofFinish = roofFinish === 'neutral' || roofFinish === 'shingle' ? roofFinish : 'metal';
  const normalizedDoorStyle: BoathouseDoorStyle =
    doorStyle === 'single_door' || doorStyle === 'double_doors' || doorStyle === 'two_slip_doors' || doorStyle === 'none' ? doorStyle : 'open';
  const materials = getMaterials(viewMode, normalizedWallFinish, normalizedRoofFinish);
  const halfLength = length / 2;
  const halfWidth = width / 2;
  const postX = halfLength - POST_SIZE_FT / 2;
  const postZ = halfWidth - POST_SIZE_FT / 2;
  const frameY = wallHeight;
  const frontX = -halfLength;
  const backX = halfLength;
  const flatRoofDepth = Math.max(MIN_FLAT_ROOF_DEPTH_FT, Math.min(MAX_FLAT_ROOF_DEPTH_FT, roofRise));
  const doorPanelCount =
    normalizedDoorStyle === 'single_door' ? 1 : normalizedDoorStyle === 'two_slip_doors' ? normalizedSlipCount : 2;

  return (
    <group>
      {viewMode === 'internal' && (
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[length, 0.08, width]} />
          <meshStandardMaterial color={materials.base} roughness={0.7} transparent opacity={0.42} />
        </mesh>
      )}

      {[
        [-postX, -postZ],
        [postX, -postZ],
        [-postX, postZ],
        [postX, postZ],
      ].map(([x, z]) => (
        <mesh key={`post-${x}-${z}`} position={[x, wallHeight / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[POST_SIZE_FT, wallHeight, POST_SIZE_FT]} />
          <meshStandardMaterial color={materials.frame} roughness={0.42} metalness={0.12} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}

      {[-1, 1].map((zSign) => (
        <mesh key={`side-wall-${zSign}`} position={[0, wallHeight / 2, zSign * halfWidth]} castShadow receiveShadow>
          <boxGeometry args={[length, wallHeight, WALL_THICKNESS_FT]} />
          <meshStandardMaterial color={materials.wall} roughness={0.66} metalness={0.02} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}

      <mesh position={[backX, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS_FT, wallHeight, width]} />
        <meshStandardMaterial color={materials.wall} roughness={0.66} metalness={0.02} transparent={opacity < 1} opacity={opacity} />
      </mesh>

      <mesh position={[frontX, frameY, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS_FT, 0.24, width]} />
        <meshStandardMaterial color={materials.frame} roughness={0.42} metalness={0.1} transparent={opacity < 1} opacity={opacity} />
      </mesh>

      {normalizedDoorStyle === 'none' && (
        <mesh position={[frontX, wallHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[WALL_THICKNESS_FT, wallHeight, width]} />
          <meshStandardMaterial color={materials.wall} roughness={0.66} metalness={0.02} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      )}

      {normalizedDoorStyle !== 'open' && normalizedDoorStyle !== 'none' && (
        <>
          {Array.from({ length: doorPanelCount }, (_, index) => {
            const panelWidth = (width * 0.72) / doorPanelCount;
            const centerZ = doorPanelCount === 1 ? 0 : -width * 0.18 + index * width * 0.36;

            return (
              <mesh key={`front-door-${index}`} position={[frontX - 0.015, wallHeight * 0.35, centerZ]} castShadow receiveShadow>
                <boxGeometry args={[0.08, wallHeight * 0.7, panelWidth]} />
                <meshStandardMaterial color={materials.door} roughness={0.58} metalness={0.04} transparent={opacity < 1} opacity={opacity} />
              </mesh>
            );
          })}
        </>
      )}

      {normalizedSlipCount === 2 && (
        <mesh position={[0, 0.16, 0]} receiveShadow>
          <boxGeometry args={[length * 0.9, 0.08, 0.12]} />
          <meshStandardMaterial color={materials.lane} roughness={0.7} metalness={0.02} />
        </mesh>
      )}

      {normalizedRoofType === 'flat' ? (
        <mesh position={[0, wallHeight + flatRoofDepth / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[length + ROOF_OVERHANG_FT * 2, flatRoofDepth, width + ROOF_OVERHANG_FT * 2]} />
          <meshStandardMaterial color={materials.roof} roughness={0.5} metalness={0.05} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ) : (
        <GableRoof length={length} width={width} wallHeight={wallHeight} roofRise={roofRise} materials={materials} opacity={opacity} />
      )}
    </group>
  );
}
