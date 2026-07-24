import type { KehoeRampSlope } from '@/components/render3d/products/KehoeRampWithRails';
import type { RenderViewMode } from '@/components/render3d/types';

export interface KehoeRampWithoutRailsProps {
  footprintWidthFt: number;
  footprintLengthFt: number;
  opacity?: number;
  viewMode: RenderViewMode;
  slope: KehoeRampSlope;
}

const FRAME_DEPTH_FT = 4 / 12;
const DECK_THICKNESS_FT = 0.18;
const DECK_WIDTH_RATIO = 44 / 48;
const BASE_CLEARANCE_FT = 0.035;
const RAMP_DECK_LINE_OFFSET_FT = 0.042;
const RAMP_TREAD_SPACING_FT = 1.25;
const DOCK_END_BODY_SETBACK_FT = 0.42;

function getRampEndpoints(footprintLengthFt: number, slope: KehoeRampSlope) {
  const lowerEndZ = slope.hasConnection ? -slope.dockEndSign * (footprintLengthFt / 2) : -footprintLengthFt / 2;
  const dockEndZ = slope.hasConnection ? slope.visualDockEndZFt ?? slope.dockEndSign * (footprintLengthFt / 2) : footprintLengthFt / 2;

  return { lowerEndZ, dockEndZ };
}

function getRampBodySpan(footprintLengthFt: number, slope: KehoeRampSlope) {
  const { lowerEndZ, dockEndZ } = getRampEndpoints(footprintLengthFt, slope);

  if (!slope.hasConnection) {
    return {
      zStart: Math.min(lowerEndZ, dockEndZ),
      zEnd: Math.max(lowerEndZ, dockEndZ),
      lowerEndZ,
      dockEndZ,
      bodyDockEndZ: dockEndZ,
    };
  }

  const span = Math.abs(dockEndZ - lowerEndZ);
  const bodySetback = Math.min(DOCK_END_BODY_SETBACK_FT, span * 0.18);
  const bodyDockEndZ = dockEndZ - slope.dockEndSign * bodySetback;

  return {
    zStart: Math.min(lowerEndZ, bodyDockEndZ),
    zEnd: Math.max(lowerEndZ, bodyDockEndZ),
    lowerEndZ,
    dockEndZ,
    bodyDockEndZ,
  };
}

function getRampTopHeightAtZ(z: number, footprintLengthFt: number, slope: KehoeRampSlope) {
  if (!slope.hasConnection) {
    return slope.dockEndHeightFt;
  }

  const lowerEndZ = -slope.dockEndSign * (footprintLengthFt / 2);
  const dockEndZ = slope.visualDockEndZFt ?? slope.dockEndSign * (footprintLengthFt / 2);
  const denominator = dockEndZ - lowerEndZ;

  if (Math.abs(denominator) < 0.001) {
    return slope.dockEndHeightFt;
  }

  const dockWeight = Math.max(0, Math.min(1, (z - lowerEndZ) / denominator));

  return slope.lowerEndHeightFt + (slope.dockEndHeightFt - slope.lowerEndHeightFt) * dockWeight;
}

function getMaterials(viewMode: RenderViewMode) {
  if (viewMode === 'customer') {
    return {
      aluminum: '#dce4e6',
      aluminumDark: '#aab6ba',
      deck: '#979b98',
      deckLine: '#7d8582',
      plate: '#d4c9b6',
      lowerPlate: '#c5cfd2',
    };
  }

  return {
    aluminum: '#cbd5e1',
    aluminumDark: '#94a3b8',
    deck: '#9ca3af',
    deckLine: '#475569',
    plate: '#f59e0b',
    lowerPlate: '#38bdf8',
  };
}

function SlopedBox({
  xMin,
  xMax,
  zMin,
  zMax,
  topHeightAtZ,
  thickness,
  color,
  opacity,
  roughness = 0.62,
  metalness = 0,
}: {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  topHeightAtZ: (z: number) => number;
  thickness: number;
  color: string;
  opacity: number;
  roughness?: number;
  metalness?: number;
}) {
  const topA = topHeightAtZ(zMin);
  const topB = topHeightAtZ(zMax);
  const bottomA = Math.max(BASE_CLEARANCE_FT, topA - thickness);
  const bottomB = Math.max(BASE_CLEARANCE_FT, topB - thickness);
  const vertices = new Float32Array([
    xMin,
    bottomA,
    zMin,
    xMax,
    bottomA,
    zMin,
    xMax,
    bottomB,
    zMax,
    xMin,
    bottomB,
    zMax,
    xMin,
    topA,
    zMin,
    xMax,
    topA,
    zMin,
    xMax,
    topB,
    zMax,
    xMin,
    topB,
    zMax,
  ]);
  const indices = new Uint16Array([
    4, 5, 6, 4, 6, 7,
    0, 2, 1, 0, 3, 2,
    0, 1, 5, 0, 5, 4,
    3, 7, 6, 3, 6, 2,
    0, 4, 7, 0, 7, 3,
    1, 2, 6, 1, 6, 5,
  ]);

  return (
    <mesh castShadow receiveShadow>
      <bufferGeometry onUpdate={(geometry) => geometry.computeVertexNormals()}>
        <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
        <bufferAttribute attach="index" args={[indices, 1]} />
      </bufferGeometry>
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function RampDeckLines({
  width,
  zStart,
  zEnd,
  footprintLengthFt,
  slope,
  color,
}: {
  width: number;
  zStart: number;
  zEnd: number;
  footprintLengthFt: number;
  slope: KehoeRampSlope;
  color: string;
}) {
  const lineCount = Math.max(3, Math.min(18, Math.round(Math.abs(zEnd - zStart) / RAMP_TREAD_SPACING_FT)));
  const spacing = (zEnd - zStart) / lineCount;

  return (
    <>
      {Array.from({ length: Math.max(0, lineCount - 1) }, (_, index) => {
        const z = zStart + (index + 1) * spacing;
        const y = getRampTopHeightAtZ(z, footprintLengthFt, slope) + RAMP_DECK_LINE_OFFSET_FT;

        return (
          <mesh key={index} position={[0, y, z]}>
            <boxGeometry args={[width * 0.92, 0.01, 0.01]} />
            <meshStandardMaterial color={color} roughness={0.72} metalness={0.02} />
          </mesh>
        );
      })}
    </>
  );
}

function CrossMembers({
  width,
  zStart,
  zEnd,
  footprintLengthFt,
  slope,
  color,
}: {
  width: number;
  zStart: number;
  zEnd: number;
  footprintLengthFt: number;
  slope: KehoeRampSlope;
  color: string;
}) {
  const span = Math.abs(zEnd - zStart);
  const count = Math.max(3, Math.floor(span / 4));

  return (
    <>
      {Array.from({ length: count + 1 }, (_, index) => {
        const t = count === 0 ? 0 : index / count;
        const z = zStart + (zEnd - zStart) * t;
        const y = getRampTopHeightAtZ(z, footprintLengthFt, slope) - 0.12;

        return (
          <mesh key={index} position={[0, y, z]} castShadow receiveShadow>
            <boxGeometry args={[width, 0.12, 0.11]} />
            <meshStandardMaterial color={color} roughness={0.34} metalness={0.3} />
          </mesh>
        );
      })}
    </>
  );
}

function EndPlate({
  z,
  width,
  footprintLengthFt,
  slope,
  color,
  depth,
}: {
  z: number;
  width: number;
  footprintLengthFt: number;
  slope: KehoeRampSlope;
  color: string;
  depth: number;
}) {
  const y = getRampTopHeightAtZ(z, footprintLengthFt, slope) + 0.035;

  return (
    <mesh position={[0, y, z]} castShadow receiveShadow>
      <boxGeometry args={[width, 0.06, depth]} />
      <meshStandardMaterial color={color} roughness={0.34} metalness={0.26} />
    </mesh>
  );
}

function DockConnectionPlate({
  dockEndZ,
  bodyDockEndZ,
  width,
  footprintLengthFt,
  slope,
  color,
}: {
  dockEndZ: number;
  bodyDockEndZ: number;
  width: number;
  footprintLengthFt: number;
  slope: KehoeRampSlope;
  color: string;
}) {
  const depth = Math.abs(dockEndZ - bodyDockEndZ) + 0.3;
  const z = (dockEndZ + bodyDockEndZ) / 2;
  const y = getRampTopHeightAtZ(dockEndZ, footprintLengthFt, slope) + 0.035;

  return (
    <mesh position={[0, y, z]} castShadow receiveShadow>
      <boxGeometry args={[width, 0.06, depth]} />
      <meshStandardMaterial color={color} roughness={0.34} metalness={0.26} />
    </mesh>
  );
}

function HingeBarrels({
  z,
  width,
  footprintLengthFt,
  slope,
  color,
}: {
  z: number;
  width: number;
  footprintLengthFt: number;
  slope: KehoeRampSlope;
  color: string;
}) {
  const y = getRampTopHeightAtZ(z, footprintLengthFt, slope) + 0.12;
  const barrelWidth = Math.min(0.72, width * 0.18);
  const xPositions = [-width * 0.28, 0, width * 0.28];

  return (
    <>
      {xPositions.map((x) => (
        <mesh key={x} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, barrelWidth, 16, 1]} />
          <meshStandardMaterial color={color} roughness={0.28} metalness={0.34} />
        </mesh>
      ))}
    </>
  );
}

function LowerRollers({
  z,
  width,
  footprintLengthFt,
  slope,
  color,
}: {
  z: number;
  width: number;
  footprintLengthFt: number;
  slope: KehoeRampSlope;
  color: string;
}) {
  const y = Math.max(BASE_CLEARANCE_FT + 0.1, getRampTopHeightAtZ(z, footprintLengthFt, slope) - FRAME_DEPTH_FT - 0.02);
  const xPositions = [-width * 0.32, width * 0.32];

  return (
    <>
      {xPositions.map((x) => (
        <mesh key={x} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.42, 16, 1]} />
          <meshStandardMaterial color={color} roughness={0.32} metalness={0.3} />
        </mesh>
      ))}
    </>
  );
}

export function KehoeRampWithoutRails({
  footprintWidthFt,
  footprintLengthFt,
  opacity = 1,
  viewMode,
  slope,
}: KehoeRampWithoutRailsProps) {
  if (
    !Number.isFinite(footprintWidthFt) ||
    !Number.isFinite(footprintLengthFt) ||
    footprintWidthFt <= 0 ||
    footprintLengthFt <= 0 ||
    !Number.isFinite(slope.dockEndHeightFt) ||
    !Number.isFinite(slope.lowerEndHeightFt)
  ) {
    return null;
  }

  const materials = getMaterials(viewMode);
  const { zStart, zEnd, lowerEndZ, dockEndZ, bodyDockEndZ } = getRampBodySpan(footprintLengthFt, slope);
  const topHeightAtZ = (z: number) => getRampTopHeightAtZ(z, footprintLengthFt, slope);
  const deckWidth = Math.min(footprintWidthFt * DECK_WIDTH_RATIO, Math.max(0.5, footprintWidthFt - 0.28));
  const sideFrameWidth = Math.max(0.12, (footprintWidthFt - deckWidth) / 2);

  return (
    <group>
      <SlopedBox
        xMin={-deckWidth / 2}
        xMax={deckWidth / 2}
        zMin={zStart}
        zMax={zEnd}
        topHeightAtZ={topHeightAtZ}
        thickness={DECK_THICKNESS_FT}
        color={materials.deck}
        opacity={opacity}
        roughness={0.64}
        metalness={0.02}
      />
      {[-1, 1].map((sign) => (
        <SlopedBox
          key={sign}
          xMin={sign > 0 ? footprintWidthFt / 2 - sideFrameWidth : -footprintWidthFt / 2}
          xMax={sign > 0 ? footprintWidthFt / 2 : -footprintWidthFt / 2 + sideFrameWidth}
          zMin={zStart}
          zMax={zEnd}
          topHeightAtZ={topHeightAtZ}
          thickness={FRAME_DEPTH_FT}
          color={materials.aluminum}
          opacity={opacity}
          roughness={0.34}
          metalness={0.3}
        />
      ))}
      <CrossMembers width={footprintWidthFt} zStart={zStart} zEnd={zEnd} footprintLengthFt={footprintLengthFt} slope={slope} color={materials.aluminumDark} />
      <RampDeckLines width={deckWidth} zStart={zStart} zEnd={zEnd} footprintLengthFt={footprintLengthFt} slope={slope} color={materials.deckLine} />
      <EndPlate z={lowerEndZ} width={footprintWidthFt + 0.12} footprintLengthFt={footprintLengthFt} slope={slope} color={materials.lowerPlate} depth={0.32} />
      <LowerRollers z={lowerEndZ} width={footprintWidthFt} footprintLengthFt={footprintLengthFt} slope={slope} color={materials.aluminumDark} />
      {slope.hasConnection && (
        <>
          <DockConnectionPlate
            dockEndZ={dockEndZ}
            bodyDockEndZ={bodyDockEndZ}
            width={footprintWidthFt + 0.24}
            footprintLengthFt={footprintLengthFt}
            slope={slope}
            color={materials.plate}
          />
          <HingeBarrels z={dockEndZ} width={footprintWidthFt} footprintLengthFt={footprintLengthFt} slope={slope} color={materials.aluminumDark} />
        </>
      )}
    </group>
  );
}
