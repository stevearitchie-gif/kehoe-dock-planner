import type { RenderViewMode } from '@/components/render3d/types';

export type FloatingDockDeckFinish = 'pressure-treated' | 'cedar' | 'composite-grey' | 'composite-brown';

export interface KehoeFloatingDockProps {
  footprintWidthFt: number;
  footprintLengthFt: number;
  opacity?: number;
  viewMode: RenderViewMode;
  deckFinish?: FloatingDockDeckFinish;
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

function getMaterials(viewMode: RenderViewMode, deckFinish: FloatingDockDeckFinish, deckColorOverride?: string) {
  const isCustomer = viewMode === 'customer';
  const deckColors: Record<FloatingDockDeckFinish, string> = {
    'pressure-treated': isCustomer ? '#b98654' : '#9a8f63',
    cedar: '#b57943',
    'composite-grey': isCustomer ? '#9ea4a1' : '#8d99a6',
    'composite-brown': '#8a5f3d',
  };
  const isComposite = deckFinish === 'composite-grey' || deckFinish === 'composite-brown';

  return {
    deck: deckColorOverride || deckColors[deckFinish],
    deckLine: isComposite ? '#858b88' : '#9b6f48',
    fascia: isComposite ? (deckFinish === 'composite-grey' ? '#7f8582' : '#755033') : '#7c5534',
    fasciaDark: '#1f2933',
    pontoon: isCustomer ? '#2c2119' : '#334155',
    pontoonEnd: isCustomer ? '#3a2b21' : '#475569',
    crossMember: isCustomer ? '#6b7280' : '#64748b',
    metal: isCustomer ? '#cbd5d8' : '#d1d5db',
    fastener: isCustomer ? '#d8dee2' : '#f8fafc',
  };
}

function DeckBoardLines({
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
  const lineCount = Math.max(2, Math.min(16, Math.round(width / BOARD_SPACING_FT)));
  const spacing = width / lineCount;

  return (
    <>
      {Array.from({ length: Math.max(0, lineCount - 1) }, (_, index) => {
        const x = -width / 2 + (index + 1) * spacing;

        return (
          <mesh key={index} position={[x, y, 0]}>
            <boxGeometry args={[0.01, 0.01, length - 0.32]} />
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
        <meshStandardMaterial color={color} roughness={0.62} metalness={0.04} />
      </mesh>
      {[-1, 1].map((sign) => (
        <mesh key={sign} position={[0, 0, sign * length * 0.47]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[radius * 0.98, radius * 0.98, 0.06, 24, 1]} />
          <meshStandardMaterial color={endColor} roughness={0.65} metalness={0.03} />
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
            <meshStandardMaterial color={color} roughness={0.52} metalness={0.08} />
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
  const zInset = Math.min(3, length * 0.18);
  const xInset = Math.min(1.2, width * 0.2);
  const positions = [
    [-width / 2 + xInset, -length / 2 + zInset],
    [width / 2 - xInset, -length / 2 + zInset],
    [-width / 2 + xInset, length / 2 - zInset],
    [width / 2 - xInset, length / 2 - zInset],
  ];

  return (
    <>
      {positions.map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, y, z]}>
          <mesh castShadow>
            <boxGeometry args={[CLEAT_WIDTH_FT, 0.06, CLEAT_LENGTH_FT]} />
            <meshStandardMaterial color={color} roughness={0.36} metalness={0.18} />
          </mesh>
          <mesh position={[0, 0.045, 0]} castShadow>
            <boxGeometry args={[CLEAT_WIDTH_FT * 1.35, 0.04, CLEAT_LENGTH_FT * 0.18]} />
            <meshStandardMaterial color={color} roughness={0.34} metalness={0.22} />
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
              <meshStandardMaterial color={color} roughness={0.28} metalness={0.2} />
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
            <meshStandardMaterial color={color} roughness={0.38} metalness={0.16} />
          </mesh>
        )),
      )}
    </>
  );
}

export function KehoeFloatingDock({
  footprintWidthFt,
  footprintLengthFt,
  opacity = 1,
  viewMode,
  deckFinish = 'pressure-treated',
  deckColorOverride,
  tubeDiameterFt = DEFAULT_TUBE_DIAMETER_FT,
}: KehoeFloatingDockProps) {
  if (!Number.isFinite(footprintWidthFt) || !Number.isFinite(footprintLengthFt) || footprintWidthFt <= 0 || footprintLengthFt <= 0) {
    return null;
  }

  const materials = getMaterials(viewMode, deckFinish, deckColorOverride);
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
        <meshStandardMaterial color={materials.deck} roughness={0.78} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <DeckBoardLines width={footprintWidthFt} length={footprintLengthFt} y={deckTopY + DECK_LINE_OFFSET_FT} color={materials.deckLine} />

      <mesh position={[0, fasciaY, -footprintLengthFt / 2 + FASCIA_THICKNESS_FT / 2]} castShadow receiveShadow>
        <boxGeometry args={[footprintWidthFt, FASCIA_DEPTH_FT, FASCIA_THICKNESS_FT]} />
        <meshStandardMaterial color={materials.fascia} roughness={0.72} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <mesh position={[0, fasciaY, footprintLengthFt / 2 - FASCIA_THICKNESS_FT / 2]} castShadow receiveShadow>
        <boxGeometry args={[footprintWidthFt, FASCIA_DEPTH_FT, FASCIA_THICKNESS_FT]} />
        <meshStandardMaterial color={materials.fascia} roughness={0.72} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (footprintWidthFt / 2 - FASCIA_THICKNESS_FT / 2), fasciaY, 0]} castShadow receiveShadow>
            <boxGeometry args={[FASCIA_THICKNESS_FT, FASCIA_DEPTH_FT, footprintLengthFt]} />
            <meshStandardMaterial color={materials.fascia} roughness={0.72} transparent={opacity < 1} opacity={opacity} />
          </mesh>
          <mesh position={[side * (footprintWidthFt / 2 + 0.012), rubY, 0]} castShadow>
            <boxGeometry args={[0.035, 0.09, footprintLengthFt * 0.96]} />
            <meshStandardMaterial color={materials.fasciaDark} roughness={0.74} />
          </mesh>
        </group>
      ))}

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
      <SideFasteners width={footprintWidthFt} length={footprintLengthFt} y={rubY + 0.18} color={materials.fastener} />
      <ConnectionPlates width={footprintWidthFt} length={footprintLengthFt} y={deckTopY + 0.035} color={materials.metal} />
      {viewMode === 'customer' && <Cleats width={footprintWidthFt} length={footprintLengthFt} y={deckTopY + 0.055} color={materials.metal} />}
    </group>
  );
}
