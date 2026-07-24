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
  roofColorOverride?: string;
}

const DEFAULT_WALL_HEIGHT_FT = 9;
const DEFAULT_ROOF_RISE_FT = 3;
const WALL_THICKNESS_FT = 0.18;
const POST_SIZE_FT = 0.22;
const ROOF_OVERHANG_FT = 0.32;
const GABLE_ROOF_THICKNESS_FT = 0.18;
const MIN_FLAT_ROOF_DEPTH_FT = 0.3;
const MAX_FLAT_ROOF_DEPTH_FT = 0.8;
const FRONT_WALL_PANEL_HEIGHT_RATIO = 0.82;
const FRONT_HEADER_HEIGHT_FT = 0.24;

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
  const planeWidth = Math.hypot(halfWidth, roofRise);
  const slopeAngle = Math.atan2(roofRise, halfWidth);
  const centerY = wallHeight + roofRise / 2;
  const centerZ = halfWidth / 2;

  return (
    <>
      {[-1, 1].map((zSign) => (
        <mesh key={`gable-plane-${zSign}`} position={[0, centerY, zSign * centerZ]} rotation={[zSign * slopeAngle, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[roofLength, GABLE_ROOF_THICKNESS_FT, planeWidth]} />
          <meshStandardMaterial color={roofColor} roughness={0.48} metalness={0.05} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}
      <mesh position={[0, wallHeight + roofRise + 0.02, 0]} castShadow>
        <boxGeometry args={[roofLength, 0.1, 0.14]} />
        <meshStandardMaterial color={materials.roofEdge} roughness={0.48} metalness={0.08} transparent={opacity < 1} opacity={opacity} />
      </mesh>
    </>
  );
}

function GableEndWall({
  x,
  width,
  wallHeight,
  roofRise,
  materials,
  opacity,
}: {
  x: number;
  width: number;
  wallHeight: number;
  roofRise: number;
  materials: ReturnType<typeof getMaterials>;
  opacity: number;
}) {
  const stripCount = 6;
  const stripHeight = roofRise / stripCount;

  return (
    <>
      {Array.from({ length: stripCount }, (_, index) => {
        const progress = (index + 0.5) / stripCount;
        const stripWidth = Math.max(0.2, width * (1 - progress));
        const y = wallHeight + stripHeight * index + stripHeight / 2;

        return (
          <mesh key={`gable-end-${x}-${index}`} position={[x, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[WALL_THICKNESS_FT, stripHeight, stripWidth]} />
            <meshStandardMaterial color={materials.wall} roughness={0.66} metalness={0.02} transparent={opacity < 1} opacity={opacity} />
          </mesh>
        );
      })}
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
  roofColorOverride,
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
  const roofColor = roofColorOverride?.trim() || materials.roof;
  const halfLength = length / 2;
  const halfWidth = width / 2;
  const postX = halfLength - POST_SIZE_FT / 2;
  const postZ = halfWidth - POST_SIZE_FT / 2;
  const frameY = wallHeight;
  const frontX = -halfLength;
  const backX = halfLength;
  const flatRoofDepth = Math.max(MIN_FLAT_ROOF_DEPTH_FT, Math.min(MAX_FLAT_ROOF_DEPTH_FT, roofRise));
  const frontWallHeight = wallHeight * FRONT_WALL_PANEL_HEIGHT_RATIO;
  const frontWallDepth = WALL_THICKNESS_FT;
  const centeredOpeningWidth =
    normalizedDoorStyle === 'single_door' ? width * 0.42 : normalizedDoorStyle === 'double_doors' ? width * 0.64 : width * 0.58;
  const sidePanelWidth = Math.max(0.35, (width - centeredOpeningWidth) / 2);
  const twoSlipSidePanelWidth = Math.max(0.28, width * 0.1);
  const twoSlipCenterPierWidth = Math.max(0.18, width * 0.045);
  const twoSlipBayWidth = Math.max(0.4, (width - twoSlipSidePanelWidth * 2 - twoSlipCenterPierWidth) / 2);

  const renderFrontWallPanel = (key: string, centerZ: number, panelWidth: number, panelHeight = frontWallHeight) => (
    <mesh key={key} position={[frontX, panelHeight / 2, centerZ]} castShadow receiveShadow>
      <boxGeometry args={[frontWallDepth, panelHeight, panelWidth]} />
      <meshStandardMaterial color={materials.wall} roughness={0.66} metalness={0.02} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );

  const renderDoorPanel = (key: string, centerZ: number, panelWidth: number, panelHeight = frontWallHeight * 0.92) => (
    <mesh key={key} position={[frontX - 0.018, panelHeight / 2, centerZ]} castShadow receiveShadow>
      <boxGeometry args={[0.08, panelHeight, panelWidth]} />
      <meshStandardMaterial color={materials.door} roughness={0.58} metalness={0.04} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );

  const renderDoorSeam = (key: string, centerZ: number, height = frontWallHeight * 0.9) => (
    <mesh key={key} position={[frontX - 0.062, height / 2, centerZ]} castShadow>
      <boxGeometry args={[0.04, height, 0.045]} />
      <meshStandardMaterial color={materials.frame} roughness={0.48} metalness={0.08} />
    </mesh>
  );

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

      {normalizedRoofType === 'gable' && (
        <>
          <GableEndWall x={frontX - 0.004} width={width} wallHeight={wallHeight} roofRise={roofRise} materials={materials} opacity={opacity} />
          <GableEndWall x={backX + 0.004} width={width} wallHeight={wallHeight} roofRise={roofRise} materials={materials} opacity={opacity} />
        </>
      )}

      <mesh position={[frontX, frameY, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS_FT, FRONT_HEADER_HEIGHT_FT, width]} />
        <meshStandardMaterial color={materials.frame} roughness={0.42} metalness={0.1} transparent={opacity < 1} opacity={opacity} />
      </mesh>

      {normalizedDoorStyle === 'none' ? (
        renderFrontWallPanel('front-wall-closed', 0, width, wallHeight)
      ) : normalizedDoorStyle === 'two_slip_doors' ? (
        <>
          {renderFrontWallPanel('front-wall-left-edge', -halfWidth + twoSlipSidePanelWidth / 2, twoSlipSidePanelWidth)}
          {renderFrontWallPanel('front-wall-right-edge', halfWidth - twoSlipSidePanelWidth / 2, twoSlipSidePanelWidth)}
          {renderFrontWallPanel('front-wall-center-pier', 0, twoSlipCenterPierWidth)}
          {renderDoorPanel('front-door-slip-left', -(twoSlipCenterPierWidth / 2 + twoSlipBayWidth / 2), twoSlipBayWidth * 0.86)}
          {renderDoorPanel('front-door-slip-right', twoSlipCenterPierWidth / 2 + twoSlipBayWidth / 2, twoSlipBayWidth * 0.86)}
        </>
      ) : (
        <>
          {renderFrontWallPanel('front-wall-left', -halfWidth + sidePanelWidth / 2, sidePanelWidth)}
          {renderFrontWallPanel('front-wall-right', halfWidth - sidePanelWidth / 2, sidePanelWidth)}
          {normalizedDoorStyle === 'single_door' && renderDoorPanel('front-door-single', 0, centeredOpeningWidth * 0.72)}
          {normalizedDoorStyle === 'double_doors' && (
            <>
              {renderDoorPanel('front-door-double-left', -centeredOpeningWidth / 4, centeredOpeningWidth / 2)}
              {renderDoorPanel('front-door-double-right', centeredOpeningWidth / 4, centeredOpeningWidth / 2)}
              {renderDoorSeam('front-door-double-seam', 0)}
            </>
          )}
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
          <meshStandardMaterial color={roofColor} roughness={0.5} metalness={0.05} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ) : (
        <GableRoof length={length} width={width} wallHeight={wallHeight} roofRise={roofRise} materials={materials} opacity={opacity} roofColor={roofColor} />
      )}
    </group>
  );
}
