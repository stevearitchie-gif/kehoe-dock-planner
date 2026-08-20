import { getSalesMaterialPalette } from '@/components/render3d/salesMaterials';
import type { FloatingDockBoardDirection, RenderViewMode } from '@/components/render3d/types';

export type FloatingDockDeckFinish = 'pressure-treated' | 'cedar' | 'composite-grey' | 'composite-brown';

export interface KehoeFloatingDockProps {
  footprintWidthFt: number;
  footprintLengthFt: number;
  opacity?: number;
  viewMode: RenderViewMode;
  deckFinish?: FloatingDockDeckFinish;
  boardDirection?: FloatingDockBoardDirection;
  showStandardCleats?: boolean;
  showSideBumper?: boolean;
  verticalStavingEnabled?: boolean;
  verticalStavingColor?: string;
  verticalStavingSpacingFt?: number;
  deckColorOverride?: string;
  tubeDiameterFt?: number;
}

const DECK_THICKNESS_FT = 0.22;
const FASCIA_DEPTH_FT = 0.92;
const FASCIA_THICKNESS_FT = 0.22;
const BOARD_SPACING_FT = 0.9;
const DEFAULT_TUBE_DIAMETER_FT = 2;
const TUBE_TOP_CLEARANCE_FT = 0.08;
const PONTOON_INSET_FT = 0.95;
const CROSS_MEMBER_SPACING_FT = 4;
const CLEAT_WIDTH_FT = 0.42;
const CLEAT_LENGTH_FT = 0.8;
const DECK_LINE_OFFSET_FT = 0.045;
const DEFAULT_STAVING_SPACING_FT = 0.82;
const STAVING_PANEL_THICKNESS_FT = 0.028;
const STAVING_SEAM_WIDTH_FT = 0.018;
const STAVING_SEAM_PROJECTION_FT = 0.012;

function getMaterials(viewMode: RenderViewMode, deckFinish: FloatingDockDeckFinish, deckColorOverride?: string) {
  const palette = getSalesMaterialPalette(viewMode);
  const isComposite = deckFinish === 'composite-grey' || deckFinish === 'composite-brown';
  const deck = palette.deck[deckFinish];

  return {
    deck: deckColorOverride || deck.color,
    deckRoughness: deck.roughness,
    deckMetalness: deck.metalness,
    deckLine: isComposite ? '#7f8582' : palette.deck.seam,
    fascia: isComposite ? (deckFinish === 'composite-grey' ? '#818986' : '#725239') : '#74502f',
    fasciaDark: '#1f2933',
    pontoon: palette.float.color,
    pontoonEnd: palette.float.endColor,
    crossMember: palette.aluminum.darkColor,
    metal: palette.aluminum.color,
    fastener: palette.fastener.color,
  };
}

function DeckBoardLines({
  width,
  length,
  y,
  color,
  boardDirection,
}: {
  width: number;
  length: number;
  y: number;
  color: string;
  boardDirection: FloatingDockBoardDirection;
}) {
  if (boardDirection === 'none') {
    return null;
  }

  const lineAxisLength = boardDirection === 'horizontal' ? length : width;
  const lineCount = Math.max(2, Math.min(16, Math.round(lineAxisLength / BOARD_SPACING_FT)));
  const spacing = lineAxisLength / lineCount;

  return (
    <>
      {Array.from({ length: Math.max(0, lineCount - 1) }, (_, index) => {
        const offset = -lineAxisLength / 2 + (index + 1) * spacing;
        const position: [number, number, number] = boardDirection === 'horizontal' ? [0, y, offset] : [offset, y, 0];
        const geometryArgs: [number, number, number] =
          boardDirection === 'horizontal' ? [width - 0.32, 0.01, 0.01] : [0.01, 0.01, length - 0.32];

        return (
          <mesh key={index} position={position}>
            <boxGeometry args={geometryArgs} />
            <meshStandardMaterial color={color} roughness={0.82} />
          </mesh>
        );
      })}
    </>
  );
}

function Pontoon({
  x,
  y,
  length,
  diameter,
  color,
  endColor,
}: {
  x: number;
  y: number;
  length: number;
  diameter: number;
  color: string;
  endColor: string;
}) {
  const radius = diameter / 2;

  return (
    <group position={[x, y, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, length * 0.94, 24, 1]} />
        <meshStandardMaterial color={color} roughness={0.48} metalness={0.16} />
      </mesh>
      {[-1, 1].map((sign) => (
        <mesh key={sign} position={[0, 0, sign * length * 0.47]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[radius * 0.98, radius * 0.98, 0.06, 24, 1]} />
          <meshStandardMaterial color={endColor} roughness={0.52} metalness={0.12} />
        </mesh>
      ))}
    </group>
  );
}

function CrossMembers({
  width,
  length,
  y,
  color,
}: {
  width: number;
  length: number;
  y: number;
  color: string;
}) {
  const count = Math.max(2, Math.floor(length / CROSS_MEMBER_SPACING_FT));

  return (
    <>
      {Array.from({ length: count + 1 }, (_, index) => {
        const z = -length / 2 + (length * index) / count;

        return (
          <mesh key={index} position={[0, y, z]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.86, 0.12, 0.12]} />
            <meshStandardMaterial color={color} roughness={0.42} metalness={0.16} />
          </mesh>
        );
      })}
    </>
  );
}

function Cleats({
  width,
  length,
  y,
  color,
}: {
  width: number;
  length: number;
  y: number;
  color: string;
}) {
  const longEdgeRunsAlongX = width >= length;
  const zInset = Math.min(1.2, length * 0.2);
  const xInset = Math.min(1.2, width * 0.2);
  const alongEdgeInset = longEdgeRunsAlongX ? xInset : zInset;
  const sideInset = longEdgeRunsAlongX ? zInset : xInset;
  const positions: Array<{ x: number; z: number; rotationY: number }> = longEdgeRunsAlongX
    ? [
        { x: -width / 2 + alongEdgeInset, z: -length / 2 + sideInset, rotationY: Math.PI / 2 },
        { x: width / 2 - alongEdgeInset, z: -length / 2 + sideInset, rotationY: Math.PI / 2 },
        { x: -width / 2 + alongEdgeInset, z: length / 2 - sideInset, rotationY: Math.PI / 2 },
        { x: width / 2 - alongEdgeInset, z: length / 2 - sideInset, rotationY: Math.PI / 2 },
      ]
    : [
        { x: -width / 2 + sideInset, z: -length / 2 + alongEdgeInset, rotationY: 0 },
        { x: width / 2 - sideInset, z: -length / 2 + alongEdgeInset, rotationY: 0 },
        { x: -width / 2 + sideInset, z: length / 2 - alongEdgeInset, rotationY: 0 },
        { x: width / 2 - sideInset, z: length / 2 - alongEdgeInset, rotationY: 0 },
      ];

  return (
    <>
      {positions.map(({ x, z, rotationY }) => (
        <group key={`${x}-${z}`} position={[x, y, z]} rotation={[0, rotationY, 0]}>
          <mesh castShadow>
            <boxGeometry args={[CLEAT_WIDTH_FT, 0.06, CLEAT_LENGTH_FT]} />
            <meshStandardMaterial color={color} roughness={0.28} metalness={0.32} />
          </mesh>
          <mesh position={[0, 0.045, 0]} castShadow>
            <boxGeometry args={[CLEAT_WIDTH_FT * 0.18, 0.04, CLEAT_LENGTH_FT * 1.35]} />
            <meshStandardMaterial color={color} roughness={0.26} metalness={0.36} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function SideFasteners({
  width,
  length,
  y,
  color,
}: {
  width: number;
  length: number;
  y: number;
  color: string;
}) {
  const count = Math.max(3, Math.min(14, Math.round(length / 4)));

  return (
    <>
      {[-1, 1].flatMap((side) =>
        Array.from({ length: count }, (_, index) => {
          const z = -length / 2 + (length * (index + 0.5)) / count;

          return (
            <mesh key={`${side}-${index}`} position={[side * (width / 2 + 0.012), y, z]} castShadow>
              <boxGeometry args={[0.025, 0.08, 0.12]} />
            <meshStandardMaterial color={color} roughness={0.24} metalness={0.34} />
            </mesh>
          );
        }),
      )}
    </>
  );
}

function ConnectionPlates({
  width,
  length,
  y,
  color,
}: {
  width: number;
  length: number;
  y: number;
  color: string;
}) {
  const plateWidth = Math.min(1.1, width * 0.18);

  return (
    <>
      {[-1, 1].flatMap((zSide) =>
        [-1, 1].map((xSide) => (
          <mesh key={`${xSide}-${zSide}`} position={[xSide * (width / 2 - plateWidth), y, zSide * (length / 2 + 0.02)]} castShadow>
            <boxGeometry args={[plateWidth, 0.045, 0.18]} />
            <meshStandardMaterial color={color} roughness={0.28} metalness={0.3} />
          </mesh>
        )),
      )}
    </>
  );
}

function VerticalStaving({
  width,
  length,
  y,
  height,
  color,
  spacing = DEFAULT_STAVING_SPACING_FT,
}: {
  width: number;
  length: number;
  y: number;
  height: number;
  color: string;
  spacing?: number;
}) {
  const safeSpacing = Number.isFinite(spacing) && spacing > 0.25 ? spacing : DEFAULT_STAVING_SPACING_FT;
  const widthSeamCount = Math.max(1, Math.min(47, Math.round(width / safeSpacing) - 1));
  const lengthSeamCount = Math.max(1, Math.min(63, Math.round(length / safeSpacing) - 1));
  const seamColor = '#1f2933';

  return (
    <>
      {[-1, 1].map((zSide) => (
        <group key={`end-panel-${zSide}`}>
          <mesh position={[0, y, zSide * (length / 2 + STAVING_PANEL_THICKNESS_FT / 2)]} castShadow receiveShadow>
            <boxGeometry args={[width, height, STAVING_PANEL_THICKNESS_FT]} />
            <meshStandardMaterial color={color} roughness={0.82} metalness={0} />
          </mesh>
          {Array.from({ length: widthSeamCount }, (_, index) => {
            const x = -width / 2 + (width * (index + 1)) / (widthSeamCount + 1);

            return (
              <mesh key={`end-seam-${zSide}-${index}`} position={[x, y, zSide * (length / 2 + STAVING_PANEL_THICKNESS_FT + STAVING_SEAM_PROJECTION_FT / 2)]}>
                <boxGeometry args={[STAVING_SEAM_WIDTH_FT, height * 0.94, STAVING_SEAM_PROJECTION_FT]} />
                <meshStandardMaterial color={seamColor} roughness={0.88} metalness={0} />
              </mesh>
            );
          })}
        </group>
      ))}
      {[-1, 1].map((xSide) => (
        <group key={`side-panel-${xSide}`}>
          <mesh position={[xSide * (width / 2 + STAVING_PANEL_THICKNESS_FT / 2), y, 0]} castShadow receiveShadow>
            <boxGeometry args={[STAVING_PANEL_THICKNESS_FT, height, length]} />
            <meshStandardMaterial color={color} roughness={0.82} metalness={0} />
          </mesh>
          {Array.from({ length: lengthSeamCount }, (_, index) => {
            const z = -length / 2 + (length * (index + 1)) / (lengthSeamCount + 1);

            return (
              <mesh key={`side-seam-${xSide}-${index}`} position={[xSide * (width / 2 + STAVING_PANEL_THICKNESS_FT + STAVING_SEAM_PROJECTION_FT / 2), y, z]}>
                <boxGeometry args={[STAVING_SEAM_PROJECTION_FT, height * 0.94, STAVING_SEAM_WIDTH_FT]} />
                <meshStandardMaterial color={seamColor} roughness={0.88} metalness={0} />
              </mesh>
            );
          })}
        </group>
      ))}
    </>
  );
}

export function KehoeFloatingDock({
  footprintWidthFt,
  footprintLengthFt,
  opacity = 1,
  viewMode,
  deckFinish = 'pressure-treated',
  boardDirection = 'none',
  showStandardCleats = true,
  showSideBumper = true,
  verticalStavingEnabled = false,
  verticalStavingColor,
  verticalStavingSpacingFt,
  deckColorOverride,
  tubeDiameterFt = DEFAULT_TUBE_DIAMETER_FT,
}: KehoeFloatingDockProps) {
  const materials = getMaterials(viewMode, deckFinish, deckColorOverride);

  if (!Number.isFinite(footprintWidthFt) || !Number.isFinite(footprintLengthFt) || footprintWidthFt <= 0 || footprintLengthFt <= 0) {
    return null;
  }

  const isCompositeDeck = deckFinish === 'composite-grey' || deckFinish === 'composite-brown';
  const deckTopY = FASCIA_DEPTH_FT + DECK_THICKNESS_FT;
  const deckY = FASCIA_DEPTH_FT + DECK_THICKNESS_FT / 2;
  const fasciaY = FASCIA_DEPTH_FT / 2;
  const rubY = FASCIA_DEPTH_FT * 0.52;
  const maxTubeDiameterInsideFootprint = Math.max(0.5, footprintWidthFt * 0.42);
  const pontoonDiameter = Math.min(tubeDiameterFt, maxTubeDiameterInsideFootprint);
  const pontoonInset = Math.min(Math.max(PONTOON_INSET_FT, pontoonDiameter * 0.55), Math.max(0.28, footprintWidthFt * 0.24));
  const pontoonX = Math.min(footprintWidthFt / 2 - pontoonDiameter / 2 - 0.08, Math.max(0.32, footprintWidthFt / 2 - pontoonInset));
  const pontoonY = FASCIA_DEPTH_FT - TUBE_TOP_CLEARANCE_FT - pontoonDiameter / 2;

  return (
    <group>
      <mesh position={[0, deckY, 0]} castShadow receiveShadow>
        <boxGeometry args={[footprintWidthFt, DECK_THICKNESS_FT, footprintLengthFt]} />
        <meshStandardMaterial
          color={materials.deck}
          roughness={materials.deckRoughness}
          metalness={materials.deckMetalness}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      <DeckBoardLines
        width={footprintWidthFt}
        length={footprintLengthFt}
        y={deckTopY + DECK_LINE_OFFSET_FT}
        color={materials.deckLine}
        boardDirection={boardDirection}
      />

      <mesh position={[0, fasciaY, -footprintLengthFt / 2 + FASCIA_THICKNESS_FT / 2]} castShadow receiveShadow>
        <boxGeometry args={[footprintWidthFt, FASCIA_DEPTH_FT, FASCIA_THICKNESS_FT]} />
        <meshStandardMaterial color={materials.fascia} roughness={isCompositeDeck ? 0.58 : 0.76} metalness={isCompositeDeck ? 0.02 : 0} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <mesh position={[0, fasciaY, footprintLengthFt / 2 - FASCIA_THICKNESS_FT / 2]} castShadow receiveShadow>
        <boxGeometry args={[footprintWidthFt, FASCIA_DEPTH_FT, FASCIA_THICKNESS_FT]} />
        <meshStandardMaterial color={materials.fascia} roughness={isCompositeDeck ? 0.58 : 0.76} metalness={isCompositeDeck ? 0.02 : 0} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (footprintWidthFt / 2 - FASCIA_THICKNESS_FT / 2), fasciaY, 0]} castShadow receiveShadow>
            <boxGeometry args={[FASCIA_THICKNESS_FT, FASCIA_DEPTH_FT, footprintLengthFt]} />
            <meshStandardMaterial color={materials.fascia} roughness={isCompositeDeck ? 0.58 : 0.76} metalness={isCompositeDeck ? 0.02 : 0} transparent={opacity < 1} opacity={opacity} />
          </mesh>
          {showSideBumper && (
            <mesh position={[side * (footprintWidthFt / 2 + 0.012), rubY, 0]} castShadow>
              <boxGeometry args={[0.035, 0.09, footprintLengthFt * 0.96]} />
              <meshStandardMaterial color={materials.fasciaDark} roughness={0.74} />
            </mesh>
          )}
        </group>
      ))}
      {verticalStavingEnabled && (
        <VerticalStaving
          width={footprintWidthFt}
          length={footprintLengthFt}
          y={fasciaY}
          height={FASCIA_DEPTH_FT * 0.9}
          color={verticalStavingColor ?? materials.fasciaDark}
          spacing={verticalStavingSpacingFt}
        />
      )}

      <CrossMembers width={footprintWidthFt} length={footprintLengthFt} y={FASCIA_DEPTH_FT * 0.28} color={materials.crossMember} />
      {[-1, 1].map((side) => (
        <Pontoon
          key={side}
          x={side * pontoonX}
          y={pontoonY}
          length={footprintLengthFt}
          diameter={pontoonDiameter}
          color={materials.pontoon}
          endColor={materials.pontoonEnd}
        />
      ))}
      {showSideBumper && <SideFasteners width={footprintWidthFt} length={footprintLengthFt} y={rubY + 0.18} color={materials.fastener} />}
      <ConnectionPlates width={footprintWidthFt} length={footprintLengthFt} y={deckTopY + 0.035} color={materials.metal} />
      {viewMode === 'customer' && showStandardCleats && (
        <Cleats width={footprintWidthFt} length={footprintLengthFt} y={deckTopY + 0.055} color={materials.metal} />
      )}
    </group>
  );
}
