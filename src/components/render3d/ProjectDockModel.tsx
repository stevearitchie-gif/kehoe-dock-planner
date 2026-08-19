import { Text } from '@react-three/drei';
import { KehoeAccessory } from '@/components/render3d/products/KehoeAccessory';
import { KehoeBoathouse } from '@/components/render3d/products/KehoeBoathouse';
import { KehoeBoatLift } from '@/components/render3d/products/KehoeBoatLift';
import { KehoeBoatPort } from '@/components/render3d/products/KehoeBoatPort';
import { KehoeFloatingDock } from '@/components/render3d/products/KehoeFloatingDock';
import { KehoeRampWithRails } from '@/components/render3d/products/KehoeRampWithRails';
import { KehoeRampWithoutRails } from '@/components/render3d/products/KehoeRampWithoutRails';
import type { ProjectRenderElement, ProjectRenderModel, RenderViewMode } from '@/components/render3d/types';

interface RampElevationInfo {
  hasConnection: boolean;
  dockEndSign: -1 | 1;
  connectedPlatformType?: ProjectRenderElement['type'];
  connectionDistance: number | null;
  deckTopHeight: number;
  lowerEndHeight: number;
  railAxisLabel: string;
  dockEdgeLabel: string;
  visualDockEndZ: number | null;
  visualTrimApplied: boolean;
  visualTrimDistance: number;
}

interface AccessoryMountInfo {
  x: number;
  z: number;
  rotation: number;
  height: number;
  isDockMounted: boolean;
}

interface ProjectDockModelProps {
  model: ProjectRenderModel;
  viewMode: RenderViewMode;
}

const RAMP_THICKNESS = 0.18;
const RAMP_MIN_BOTTOM_HEIGHT = 0.04;
const RAMP_FLAT_TOP_HEIGHT = RAMP_THICKNESS + RAMP_MIN_BOTTOM_HEIGHT;
const RAMP_MIN_HEIGHT_DIFFERENCE = 0.35;
const RAMP_MAX_HEIGHT_DIFFERENCE = 0.6;
const RAMP_RAIL_AXIS_LABEL = 'local Y / 3D Z';
const RAMP_DOCK_EDGE_CLEARANCE = 0.04;
const RAMP_MAX_VISUAL_TRIM_RATIO = 0.4;
const RAMP_DOCK_END_SURFACE_CLEARANCE = 0.035;
const KEHOE_FLOATING_DOCK_FASCIA_DEPTH = 0.92;
const KEHOE_FLOATING_DOCK_DECK_THICKNESS = 0.22;
const FLOATING_DOCK_DECK_TOP_HEIGHT = KEHOE_FLOATING_DOCK_FASCIA_DEPTH + KEHOE_FLOATING_DOCK_DECK_THICKNESS;
const STATIONARY_DOCK_DECK_TOP_HEIGHT = 0.68;

function getDeckColor(element: ProjectRenderElement, viewMode: RenderViewMode) {
  const colorOverride = getElementColorOverride(element);
  if (colorOverride) {
    return colorOverride;
  }

  if (viewMode === 'internal') {
    return element.color;
  }

  if (element.type === 'stationary_dock') {
    return '#9b7a52';
  }

  return '#b08a5a';
}

function getElementColorOverride(element: ProjectRenderElement) {
  const color = element.color?.trim();
  return color ? color : undefined;
}

function getPrimarySurfaceColor(element: ProjectRenderElement, fallback: string) {
  return getElementColorOverride(element) ?? fallback;
}

function getLocalRampTopHeight(z: number, width: number, elevationInfo: RampElevationInfo) {
  if (!elevationInfo.hasConnection) {
    return elevationInfo.deckTopHeight;
  }

  const lowerEndZ = -elevationInfo.dockEndSign * (width / 2);
  const dockEndZ = elevationInfo.visualDockEndZ ?? elevationInfo.dockEndSign * (width / 2);
  const dockEndWeight = Math.max(0, Math.min(1, (z - lowerEndZ) / (dockEndZ - lowerEndZ)));

  return elevationInfo.lowerEndHeight + (elevationInfo.deckTopHeight - elevationInfo.lowerEndHeight) * dockEndWeight;
}

function DeckBoardLines({
  length,
  width,
  y,
  color = '#6b5438',
  rampElevation,
  boardDirection,
}: {
  length: number;
  width: number;
  y: number;
  color?: string;
  rampElevation?: RampElevationInfo;
  boardDirection?: ProjectRenderElement['boardDirection'];
}) {
  if (!rampElevation && (!boardDirection || boardDirection === 'none')) {
    return null;
  }

  const lineAxisLength = boardDirection === 'vertical' ? length : width;
  const lineCount = Math.max(3, Math.min(18, Math.round(lineAxisLength / 0.75)));
  const zStart = rampElevation?.hasConnection
    ? Math.min(-rampElevation.dockEndSign * (width / 2), rampElevation.visualDockEndZ ?? rampElevation.dockEndSign * (width / 2))
    : -width / 2;
  const zEnd = rampElevation?.hasConnection
    ? Math.max(-rampElevation.dockEndSign * (width / 2), rampElevation.visualDockEndZ ?? rampElevation.dockEndSign * (width / 2))
    : width / 2;
  const spacing = (zEnd - zStart) / lineCount;
  const axisSpacing = lineAxisLength / lineCount;

  return (
    <>
      {Array.from({ length: lineCount + 1 }, (_, index) => {
        const offset = -lineAxisLength / 2 + index * axisSpacing;
        const x = boardDirection === 'vertical' ? offset : 0;
        const z = boardDirection === 'vertical' ? 0 : zStart + index * spacing;
        const lineY = rampElevation ? getLocalRampTopHeight(z, width, rampElevation) + 0.025 : y;
        const geometryArgs: [number, number, number] =
          boardDirection === 'vertical' ? [0.018, 0.018, width] : [length + 0.02, 0.018, 0.018];

        return (
          <mesh key={index} position={[x, lineY, z]} receiveShadow>
            <boxGeometry args={geometryArgs} />
            <meshStandardMaterial color={color} roughness={0.82} />
          </mesh>
        );
      })}
    </>
  );
}

function DebugLabel({ element, rampElevation }: { element: ProjectRenderElement; rampElevation?: RampElevationInfo }) {
  const railDiagnostic = element.type === 'ramp_with_rails' ? '\nrails: local Y edges' : '';
  const rampDiagnostic =
    element.type === 'ramp_with_rails' || element.type === 'ramp_without_rails'
      ? `\nramp dock detected:${rampElevation?.hasConnection ? 'true' : 'false'}\ndock end:${
          rampElevation?.dockEndSign === 1 ? '+Z' : '-Z'
        } ${rampElevation?.connectedPlatformType ?? ''}\ndock h:${(rampElevation?.deckTopHeight ?? RAMP_FLAT_TOP_HEIGHT).toFixed(
          2,
        )} lower h:${(rampElevation?.lowerEndHeight ?? RAMP_FLAT_TOP_HEIGHT).toFixed(2)} diff:${(
          (rampElevation?.deckTopHeight ?? RAMP_FLAT_TOP_HEIGHT) - (rampElevation?.lowerEndHeight ?? RAMP_FLAT_TOP_HEIGHT)
        ).toFixed(2)}\naxis:${rampElevation?.railAxisLabel ?? RAMP_RAIL_AXIS_LABEL} dist:${
          rampElevation?.connectionDistance?.toFixed(2) ?? 'n/a'
        }\nedge:${rampElevation?.dockEdgeLabel ?? 'n/a'} trim:${rampElevation?.visualTrimApplied ? 'yes' : 'no'} ${(
          rampElevation?.visualTrimDistance ?? 0
        ).toFixed(2)}`
      : '';

  return (
    <Text
      position={[element.x, 4.7, element.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={0.65}
      color="#0f172a"
      anchorX="center"
      anchorY="middle"
    >
      {`${element.type}\nraw x:${Math.round(element.sourceX)} y:${Math.round(element.sourceY)}\ncenter x:${Math.round(
        element.sourceCenterX,
      )} z:${Math.round(element.sourceCenterY)}\nw:${Math.round(
        element.sourceWidth,
      )} h:${Math.round(element.sourceHeight)} r:${Math.round(element.sourceRotation)}deg\n${element.anchorInterpretation}\n${element.scaleSourceLabel}${railDiagnostic}${rampDiagnostic}`}
    </Text>
  );
}

function FootprintOutline({ element }: { element: ProjectRenderElement }) {
  const y = element.elevation + 0.055;
  const color = '#f97316';

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <mesh position={[0, y, -element.width / 2]}>
        <boxGeometry args={[element.length, 0.035, 0.035]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, y, element.width / 2]}>
        <boxGeometry args={[element.length, 0.035, 0.035]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[-element.length / 2, y, 0]}>
        <boxGeometry args={[0.035, 0.035, element.width]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[element.length / 2, y, 0]}>
        <boxGeometry args={[0.035, 0.035, element.width]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function PlatformElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  const isFloatingDock = element.type === 'floating_dock';
  const isStationaryDock = element.type === 'stationary_dock';
  const platformHeight = isStationaryDock ? 0.62 : 0.46;
  const platformY = element.elevation + platformHeight / 2;
  const deckColor = getDeckColor(element, viewMode);
  const sideColor = viewMode === 'customer' ? '#6f5738' : element.color;

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <mesh position={[0, platformY, 0]} castShadow receiveShadow>
        <boxGeometry args={[element.length, platformHeight, element.width]} />
        <meshStandardMaterial color={deckColor} roughness={0.76} transparent opacity={element.opacity} />
      </mesh>
      <mesh position={[0, element.elevation + platformHeight + 0.018, 0]} receiveShadow>
        <boxGeometry args={[element.length + 0.03, 0.025, element.width + 0.03]} />
        <meshStandardMaterial color={deckColor} roughness={0.82} transparent opacity={element.opacity} />
      </mesh>
      <DeckBoardLines length={element.length} width={element.width} y={element.elevation + platformHeight + 0.04} boardDirection={element.boardDirection} />

      {isFloatingDock && (
        <>
          <mesh position={[0, 0.16, -element.width * 0.32]} castShadow receiveShadow>
            <boxGeometry args={[element.length * 0.82, 0.32, Math.max(0.45, element.width * 0.16)]} />
            <meshStandardMaterial color={viewMode === 'customer' ? '#eef2f4' : '#d7dee7'} roughness={0.58} />
          </mesh>
          <mesh position={[0, 0.16, element.width * 0.32]} castShadow receiveShadow>
            <boxGeometry args={[element.length * 0.82, 0.32, Math.max(0.45, element.width * 0.16)]} />
            <meshStandardMaterial color={viewMode === 'customer' ? '#eef2f4' : '#d7dee7'} roughness={0.58} />
          </mesh>
        </>
      )}

      {isStationaryDock && [-1, 1].flatMap((xSign) =>
        [-1, 1].map((zSign) => (
          <mesh
            key={`${xSign}-${zSign}`}
            position={[xSign * element.length * 0.42, platformY / 2, zSign * element.width * 0.38]}
            castShadow
          >
            <boxGeometry args={[0.22, Math.max(0.4, platformY), 0.22]} />
            <meshStandardMaterial color={sideColor} roughness={0.58} />
          </mesh>
        )),
      )}
    </group>
  );
}

function hasValidPlatformProductData(element: ProjectRenderElement) {
  return Number.isFinite(element.length) && Number.isFinite(element.width) && element.length > 0 && element.width > 0;
}

function KehoeFloatingDockElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  if (!hasValidPlatformProductData(element)) {
    return <PlatformElement element={element} viewMode={viewMode} />;
  }

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <KehoeFloatingDock
        footprintWidthFt={element.length}
        footprintLengthFt={element.width}
        opacity={element.opacity}
        viewMode={viewMode}
        deckFinish={element.deckFinish}
        boardDirection={element.boardDirection}
        showStandardCleats={element.showStandardCleats ?? true}
        tubeDiameterFt={element.tubeDiameterFt}
        deckColorOverride={getElementColorOverride(element)}
      />
    </group>
  );
}

function SlopedRampDeck({
  element,
  deckColor,
  elevationInfo,
}: {
  element: ProjectRenderElement;
  deckColor: string;
  elevationInfo: RampElevationInfo;
}) {
  const halfLength = element.length / 2;
  const lowerEndZ = elevationInfo.hasConnection ? -elevationInfo.dockEndSign * (element.width / 2) : -element.width / 2;
  const dockEndZ = elevationInfo.hasConnection
    ? elevationInfo.visualDockEndZ ?? elevationInfo.dockEndSign * (element.width / 2)
    : element.width / 2;
  const zMin = Math.min(lowerEndZ, dockEndZ);
  const zMax = Math.max(lowerEndZ, dockEndZ);
  const topNegativeZ = getLocalRampTopHeight(zMin, element.width, elevationInfo);
  const topPositiveZ = getLocalRampTopHeight(zMax, element.width, elevationInfo);
  const bottomNegativeZ = topNegativeZ - RAMP_THICKNESS;
  const bottomPositiveZ = topPositiveZ - RAMP_THICKNESS;
  const vertices = new Float32Array([
    -halfLength,
    bottomNegativeZ,
    zMin,
    halfLength,
    bottomNegativeZ,
    zMin,
    halfLength,
    bottomPositiveZ,
    zMax,
    -halfLength,
    bottomPositiveZ,
    zMax,
    -halfLength,
    topNegativeZ,
    zMin,
    halfLength,
    topNegativeZ,
    zMin,
    halfLength,
    topPositiveZ,
    zMax,
    -halfLength,
    topPositiveZ,
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
      <meshStandardMaterial color={deckColor} roughness={0.76} transparent opacity={element.opacity} />
    </mesh>
  );
}

function RampRail({
  element,
  xSign,
  railColor,
  railOffsets,
  elevationInfo,
}: {
  element: ProjectRenderElement;
  xSign: number;
  railColor: string;
  railOffsets: number[];
  elevationInfo: RampElevationInfo;
}) {
  const x = xSign * (element.length / 2 + 0.12);
  const lowerEndZ = elevationInfo.hasConnection ? -elevationInfo.dockEndSign * (element.width / 2) : -element.width / 2;
  const dockEndZ = elevationInfo.hasConnection
    ? elevationInfo.visualDockEndZ ?? elevationInfo.dockEndSign * (element.width / 2)
    : element.width / 2;
  const zA = Math.min(lowerEndZ, dockEndZ);
  const zB = Math.max(lowerEndZ, dockEndZ);
  const yA = getLocalRampTopHeight(zA, element.width, elevationInfo) + 0.9;
  const yB = getLocalRampTopHeight(zB, element.width, elevationInfo) + 0.9;
  const beamCenterY = (yA + yB) / 2;
  const railSpan = zB - zA;
  const beamLength = Math.hypot(railSpan, yB - yA);
  const beamCenterZ = (zA + zB) / 2;
  const slopeAngle = Math.atan2(yA - yB, railSpan);

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, beamCenterY, beamCenterZ]} rotation={[slopeAngle, 0, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, beamLength]} />
        <meshStandardMaterial color={railColor} roughness={0.42} />
      </mesh>
      {railOffsets.map((zOffset) => {
        const z = zA + (zOffset + 0.5) * railSpan;
        const topHeight = getLocalRampTopHeight(z, element.width, elevationInfo);

        return (
          <mesh key={zOffset} position={[0, topHeight + 0.65, z]} castShadow>
            <boxGeometry args={[0.13, 1.3, 0.13]} />
            <meshStandardMaterial color={railColor} roughness={0.48} />
          </mesh>
        );
      })}
    </group>
  );
}

function RampConnectionPlate({
  element,
  elevationInfo,
  viewMode,
}: {
  element: ProjectRenderElement;
  elevationInfo: RampElevationInfo;
  viewMode: RenderViewMode;
}) {
  if (!elevationInfo.hasConnection || elevationInfo.visualDockEndZ === null) {
    return null;
  }

  const plateColor = viewMode === 'customer' ? '#c9c2b4' : '#f59e0b';

  return (
    <mesh position={[0, elevationInfo.deckTopHeight + 0.035, elevationInfo.visualDockEndZ]} castShadow receiveShadow>
      <boxGeometry args={[element.length + 0.22, 0.06, 0.22]} />
      <meshStandardMaterial color={plateColor} roughness={0.55} metalness={viewMode === 'customer' ? 0.08 : 0} />
    </mesh>
  );
}

function RampElement({
  element,
  viewMode,
  elevationInfo,
}: {
  element: ProjectRenderElement;
  viewMode: RenderViewMode;
  elevationInfo: RampElevationInfo;
}) {
  const hasRails = element.type === 'ramp_with_rails';
  const railColor = viewMode === 'customer' ? '#f8fafc' : '#e2e8f0';
  const deckColor = getPrimarySurfaceColor(element, viewMode === 'customer' ? '#aa8454' : element.color);
  const railOffsets = [-0.45, 0, 0.45];

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <SlopedRampDeck element={element} deckColor={deckColor} elevationInfo={elevationInfo} />
      <DeckBoardLines
        length={element.length}
        width={element.width}
        y={element.elevation + RAMP_THICKNESS + 0.035}
        rampElevation={elevationInfo}
      />
      <RampConnectionPlate element={element} elevationInfo={elevationInfo} viewMode={viewMode} />
      {hasRails && (
        <>
          {[-1, 1].map((xSign) => (
            <RampRail key={xSign} element={element} xSign={xSign} railColor={railColor} railOffsets={railOffsets} elevationInfo={elevationInfo} />
          ))}
        </>
      )}
    </group>
  );
}

function hasValidRampProductData(element: ProjectRenderElement, elevationInfo: RampElevationInfo) {
  return (
    Number.isFinite(element.length) &&
    Number.isFinite(element.width) &&
    element.length > 0 &&
    element.width > 0 &&
    Number.isFinite(elevationInfo.deckTopHeight) &&
    Number.isFinite(elevationInfo.lowerEndHeight)
  );
}

function KehoeRampWithRailsElement({
  element,
  viewMode,
  elevationInfo,
}: {
  element: ProjectRenderElement;
  viewMode: RenderViewMode;
  elevationInfo: RampElevationInfo;
}) {
  if (!hasValidRampProductData(element, elevationInfo)) {
    return <RampElement element={element} viewMode={viewMode} elevationInfo={elevationInfo} />;
  }

  const dockEndRenderHeight = getRampDockEndRenderHeight(elevationInfo);

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <KehoeRampWithRails
        footprintWidthFt={element.length}
        footprintLengthFt={element.width}
        opacity={element.opacity}
        viewMode={viewMode}
        deckColorOverride={getElementColorOverride(element)}
        slope={{
          hasConnection: elevationInfo.hasConnection,
          dockEndSign: elevationInfo.dockEndSign,
          dockEndHeightFt: dockEndRenderHeight,
          lowerEndHeightFt: elevationInfo.lowerEndHeight,
          visualDockEndZFt: elevationInfo.visualDockEndZ,
        }}
      />
    </group>
  );
}

function KehoeRampWithoutRailsElement({
  element,
  viewMode,
  elevationInfo,
}: {
  element: ProjectRenderElement;
  viewMode: RenderViewMode;
  elevationInfo: RampElevationInfo;
}) {
  if (!hasValidRampProductData(element, elevationInfo)) {
    return <RampElement element={element} viewMode={viewMode} elevationInfo={elevationInfo} />;
  }

  const dockEndRenderHeight = getRampDockEndRenderHeight(elevationInfo);

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <KehoeRampWithoutRails
        footprintWidthFt={element.length}
        footprintLengthFt={element.width}
        opacity={element.opacity}
        viewMode={viewMode}
        deckColorOverride={getElementColorOverride(element)}
        slope={{
          hasConnection: elevationInfo.hasConnection,
          dockEndSign: elevationInfo.dockEndSign,
          dockEndHeightFt: dockEndRenderHeight,
          lowerEndHeightFt: elevationInfo.lowerEndHeight,
          visualDockEndZFt: elevationInfo.visualDockEndZ,
        }}
      />
    </group>
  );
}

function StepsElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  const stepCount = 4;
  const stepDepth = element.length / stepCount;
  const stepColor = getPrimarySurfaceColor(element, viewMode === 'customer' ? '#a98255' : element.color);

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      {Array.from({ length: stepCount }, (_, index) => {
        const height = 0.22 + index * 0.18;
        return (
          <mesh key={index} position={[-element.length / 2 + stepDepth * (index + 0.5), element.elevation + height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[stepDepth, height, element.width]} />
            <meshStandardMaterial color={stepColor} roughness={0.72} transparent opacity={element.opacity} />
          </mesh>
        );
      })}
    </group>
  );
}

function GenericBoatLiftElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  const postHeight = 3.6;
  const beamY = element.elevation + postHeight;
  const frameColor = viewMode === 'customer' ? '#dbe4ea' : '#0e7490';
  const cableColor = viewMode === 'customer' ? '#64748b' : '#155e75';
  const postPositions = [
    [-element.length / 2, -element.width / 2],
    [element.length / 2, -element.width / 2],
    [-element.length / 2, element.width / 2],
    [element.length / 2, element.width / 2],
  ];

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      {postPositions.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, element.elevation + postHeight / 2, z]} castShadow>
          <boxGeometry args={[0.16, postHeight, 0.16]} />
          <meshStandardMaterial color={frameColor} roughness={0.36} metalness={0.12} />
        </mesh>
      ))}
      {[-element.width / 2, element.width / 2].map((z) => (
        <mesh key={z} position={[0, beamY, z]} castShadow>
          <boxGeometry args={[element.length, 0.16, 0.16]} />
          <meshStandardMaterial color={frameColor} roughness={0.36} metalness={0.12} />
        </mesh>
      ))}
      {[-element.length / 2, element.length / 2].map((x) => (
        <mesh key={x} position={[x, beamY, 0]} castShadow>
          <boxGeometry args={[0.14, 0.14, element.width]} />
          <meshStandardMaterial color={frameColor} roughness={0.36} metalness={0.12} />
        </mesh>
      ))}
      {[-0.24, 0.24].map((xOffset) => (
        <mesh key={xOffset} position={[element.length * xOffset, element.elevation + postHeight * 0.48, 0]} castShadow>
          <boxGeometry args={[0.05, postHeight * 0.86, 0.05]} />
          <meshStandardMaterial color={cableColor} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, element.elevation + 0.18, 0]} receiveShadow>
        <boxGeometry args={[element.length * 0.7, 0.08, element.width * 0.24]} />
        <meshStandardMaterial color={viewMode === 'customer' ? '#b6c4cc' : '#94a3b8'} roughness={0.55} />
      </mesh>
    </group>
  );
}

function hasValidBoatLiftProductData(element: ProjectRenderElement) {
  return Number.isFinite(element.length) && Number.isFinite(element.width) && element.length > 0 && element.width > 0;
}

function BoatLiftElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  if (!hasValidBoatLiftProductData(element)) {
    return <GenericBoatLiftElement element={element} viewMode={viewMode} />;
  }

  return (
    <group position={[element.x, element.elevation, element.z]} rotation={[0, element.rotation, 0]}>
      <KehoeBoatLift footprintLengthFt={element.length} footprintWidthFt={element.width} opacity={element.opacity} viewMode={viewMode} />
    </group>
  );
}

function GenericBoatPortElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  const postColor = viewMode === 'customer' ? '#d8e1e6' : '#2563eb';
  const roofColor = getPrimarySurfaceColor(element, viewMode === 'customer' ? '#eef4f7' : element.color);
  const wallHeight = 7;
  const roofRise = 1.4;
  const postPositions = [
    [-element.length / 2, -element.width / 2],
    [element.length / 2, -element.width / 2],
    [-element.length / 2, element.width / 2],
    [element.length / 2, element.width / 2],
  ];

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      {postPositions.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, wallHeight / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[0.18, wallHeight, 0.18]} />
          <meshStandardMaterial color={postColor} roughness={0.36} metalness={0.12} transparent opacity={element.opacity} />
        </mesh>
      ))}
      <mesh position={[0, wallHeight + roofRise / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[Math.max(0.8, element.length + 0.4), roofRise, Math.max(0.8, element.width + 0.4)]} />
        <meshStandardMaterial color={roofColor} roughness={0.44} metalness={0.04} transparent opacity={element.opacity} />
      </mesh>
    </group>
  );
}

function hasValidBoatPortProductData(element: ProjectRenderElement) {
  return Number.isFinite(element.length) && Number.isFinite(element.width) && element.length > 0 && element.width > 0;
}

function BoatPortElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  if (!hasValidBoatPortProductData(element)) {
    return <GenericBoatPortElement element={element} viewMode={viewMode} />;
  }

  return (
    <group position={[element.x, element.elevation, element.z]} rotation={[0, element.rotation, 0]}>
      <KehoeBoatPort
        footprintLengthFt={element.length}
        footprintWidthFt={element.width}
        wallHeightFt={element.boatPortWallHeightFt}
        roofRiseFt={element.boatPortRoofRiseFt}
        roofType={element.boatPortRoofType}
        opacity={element.opacity}
        viewMode={viewMode}
        roofColorOverride={getElementColorOverride(element)}
      />
    </group>
  );
}

function GenericBoathouseElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  const wallHeight = 9;
  const roofRise = 3;
  const wallColor = viewMode === 'customer' ? '#d6d3c8' : element.color;
  const roofColor = getPrimarySurfaceColor(element, viewMode === 'customer' ? '#c9d3d9' : '#facc15');

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <mesh position={[0, wallHeight / 2, -element.width / 2]} castShadow receiveShadow>
        <boxGeometry args={[Math.max(0.8, element.length), wallHeight, 0.18]} />
        <meshStandardMaterial color={wallColor} roughness={0.66} transparent opacity={element.opacity} />
      </mesh>
      <mesh position={[0, wallHeight / 2, element.width / 2]} castShadow receiveShadow>
        <boxGeometry args={[Math.max(0.8, element.length), wallHeight, 0.18]} />
        <meshStandardMaterial color={wallColor} roughness={0.66} transparent opacity={element.opacity} />
      </mesh>
      <mesh position={[element.length / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, wallHeight, Math.max(0.8, element.width)]} />
        <meshStandardMaterial color={wallColor} roughness={0.66} transparent opacity={element.opacity} />
      </mesh>
      <mesh position={[0, wallHeight + roofRise / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[Math.max(0.8, element.length + 0.6), roofRise, Math.max(0.8, element.width + 0.6)]} />
        <meshStandardMaterial color={roofColor} roughness={0.5} transparent opacity={element.opacity} />
      </mesh>
    </group>
  );
}

function hasValidBoathouseProductData(element: ProjectRenderElement) {
  return Number.isFinite(element.length) && Number.isFinite(element.width) && element.length > 0 && element.width > 0;
}

function BoathouseElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  if (!hasValidBoathouseProductData(element)) {
    return <GenericBoathouseElement element={element} viewMode={viewMode} />;
  }

  return (
    <group position={[element.x, element.elevation, element.z]} rotation={[0, element.rotation, 0]}>
      <KehoeBoathouse
        footprintLengthFt={element.length}
        footprintWidthFt={element.width}
        wallHeightFt={element.boathouseWallHeightFt}
        roofRiseFt={element.boathouseRoofRiseFt}
        roofType={element.boathouseRoofType}
        slipCount={element.boathouseSlipCount}
        doorStyle={element.boathouseDoorStyle}
        wallFinish={element.boathouseWallFinish}
        roofFinish={element.boathouseRoofFinish}
        opacity={element.opacity}
        viewMode={viewMode}
        roofColorOverride={getElementColorOverride(element)}
      />
    </group>
  );
}

function GenericAccessoryElement({
  element,
  viewMode,
  mountHeight,
}: {
  element: ProjectRenderElement;
  viewMode: RenderViewMode;
  mountHeight: number;
}) {
  const color = getPrimarySurfaceColor(element, viewMode === 'customer' ? '#94a3b8' : element.color);

  return (
    <group position={[element.x, mountHeight, element.z]} rotation={[0, element.rotation, 0]}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[element.length, 0.24, element.width]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.08} transparent opacity={element.opacity} />
      </mesh>
    </group>
  );
}

function hasValidAccessoryProductData(element: ProjectRenderElement) {
  return Number.isFinite(element.length) && Number.isFinite(element.width) && element.length > 0 && element.width > 0;
}

function AccessoryElement({
  element,
  viewMode,
  mountInfo,
}: {
  element: ProjectRenderElement;
  viewMode: RenderViewMode;
  mountInfo: AccessoryMountInfo;
}) {
  if (!hasValidAccessoryProductData(element)) {
    return <GenericAccessoryElement element={element} viewMode={viewMode} mountHeight={mountInfo.height} />;
  }

  return (
    <group position={[mountInfo.x, mountInfo.height, mountInfo.z]} rotation={[0, mountInfo.rotation, 0]}>
      <KehoeAccessory
        footprintLengthFt={element.length}
        footprintWidthFt={element.width}
        accessoryType={element.accessoryType}
        finish={element.accessoryFinish}
        opacity={element.opacity}
        mountStyle={element.accessoryType === 'ladder' && mountInfo.isDockMounted ? 'dock_ladder' : 'deck'}
        viewMode={viewMode}
        colorOverride={getElementColorOverride(element)}
      />
    </group>
  );
}

function RoofOverlayElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  const roofY = element.elevation + 3.8;
  const canopyColor = getPrimarySurfaceColor(element, viewMode === 'customer' ? '#f3f8fb' : element.color);
  const frameColor = viewMode === 'customer' ? '#cbd5e1' : '#475569';

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <mesh position={[0, roofY, 0]} castShadow>
        <boxGeometry args={[element.length, 0.12, element.width]} />
        <meshStandardMaterial color={canopyColor} roughness={0.26} transparent opacity={0.36} />
      </mesh>
      <mesh position={[0, roofY + 0.08, -element.width / 2]} castShadow>
        <boxGeometry args={[element.length, 0.12, 0.12]} />
        <meshStandardMaterial color={frameColor} roughness={0.45} />
      </mesh>
      <mesh position={[0, roofY + 0.08, element.width / 2]} castShadow>
        <boxGeometry args={[element.length, 0.12, 0.12]} />
        <meshStandardMaterial color={frameColor} roughness={0.45} />
      </mesh>
      <mesh position={[-element.length / 2, roofY + 0.08, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, element.width]} />
        <meshStandardMaterial color={frameColor} roughness={0.45} />
      </mesh>
      <mesh position={[element.length / 2, roofY + 0.08, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, element.width]} />
        <meshStandardMaterial color={frameColor} roughness={0.45} />
      </mesh>
    </group>
  );
}

function isRampElement(element: ProjectRenderElement) {
  return element.type === 'ramp_with_rails' || element.type === 'ramp_without_rails';
}

function isPlatformElement(element: ProjectRenderElement) {
  return element.type === 'floating_dock' || element.type === 'stationary_dock';
}

function getPlatformDeckTopHeight(element: ProjectRenderElement) {
  return element.type === 'stationary_dock' ? STATIONARY_DOCK_DECK_TOP_HEIGHT : FLOATING_DOCK_DECK_TOP_HEIGHT;
}

function getAccessoryMountInfo(element: ProjectRenderElement, platforms: ProjectRenderElement[]): AccessoryMountInfo {
  if (element.type !== 'accessory') {
    return {
      x: element.x,
      z: element.z,
      rotation: element.rotation,
      height: element.elevation,
      isDockMounted: false,
    };
  }

  const accessoryPoint = { x: element.x, z: element.z };
  const hostPlatform = platforms.find((platform) => getDistanceToPlatformFootprint(accessoryPoint, platform) <= Math.max(0.01, element.width * 0.5));

  if (!hostPlatform) {
    return {
      x: element.x,
      z: element.z,
      rotation: element.rotation,
      height: element.elevation,
      isDockMounted: false,
    };
  }

  return {
    x: element.x,
    z: element.z,
    rotation: element.rotation,
    height: getPlatformDeckTopHeight(hostPlatform) + (element.accessoryType === 'ladder' ? 0.02 : 0.045),
    isDockMounted: true,
  };
}

function getRampLowerEndHeight(deckTopHeight: number) {
  const preferredHeightDifference = Math.max(
    RAMP_MIN_HEIGHT_DIFFERENCE,
    Math.min(RAMP_MAX_HEIGHT_DIFFERENCE, deckTopHeight - (RAMP_THICKNESS + RAMP_MIN_BOTTOM_HEIGHT)),
  );

  return Math.max(RAMP_THICKNESS + RAMP_MIN_BOTTOM_HEIGHT, deckTopHeight - preferredHeightDifference);
}

function getRampDockEndRenderHeight(elevationInfo: RampElevationInfo) {
  return elevationInfo.hasConnection ? elevationInfo.deckTopHeight + RAMP_DOCK_END_SURFACE_CLEARANCE : elevationInfo.deckTopHeight;
}

function localPointToWorld(element: ProjectRenderElement, localX: number, localZ: number) {
  const cos = Math.cos(element.rotation);
  const sin = Math.sin(element.rotation);

  return {
    x: element.x + localX * cos + localZ * sin,
    z: element.z - localX * sin + localZ * cos,
  };
}

function getDistanceToPlatformFootprint(point: { x: number; z: number }, platform: ProjectRenderElement) {
  const dx = point.x - platform.x;
  const dz = point.z - platform.z;
  const cos = Math.cos(platform.rotation);
  const sin = Math.sin(platform.rotation);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  const outsideX = Math.max(Math.abs(localX) - platform.length / 2, 0);
  const outsideZ = Math.max(Math.abs(localZ) - platform.width / 2, 0);

  return Math.hypot(outsideX, outsideZ);
}

function worldPointToPlatformLocal(point: { x: number; z: number }, platform: ProjectRenderElement) {
  const dx = point.x - platform.x;
  const dz = point.z - platform.z;
  const cos = Math.cos(platform.rotation);
  const sin = Math.sin(platform.rotation);

  return {
    x: dx * cos - dz * sin,
    z: dx * sin + dz * cos,
  };
}

function getDockEdgeLabel(point: { x: number; z: number }, platform: ProjectRenderElement) {
  const local = worldPointToPlatformLocal(point, platform);
  const xDistance = platform.length / 2 - Math.abs(local.x);
  const zDistance = platform.width / 2 - Math.abs(local.z);

  if (xDistance < zDistance) {
    return local.x >= 0 ? '+X dock edge' : '-X dock edge';
  }

  return local.z >= 0 ? '+Z dock edge' : '-Z dock edge';
}

function getClosestPlatformForPoint(point: { x: number; z: number }, platforms: ProjectRenderElement[]) {
  return platforms.reduce<{
    platform: ProjectRenderElement | null;
    distance: number;
  }>(
    (closest, platform) => {
      const distance = getDistanceToPlatformFootprint(point, platform);

      return distance < closest.distance ? { platform, distance } : closest;
    },
    { platform: null, distance: Number.POSITIVE_INFINITY },
  );
}

function getRampVisualDockEndZ(element: ProjectRenderElement, platform: ProjectRenderElement, dockEndSign: -1 | 1) {
  const fullDockEndZ = dockEndSign * (element.width / 2);
  const lowerEndZ = -fullDockEndZ;
  const fullDockEndDistance = getDistanceToPlatformFootprint(localPointToWorld(element, 0, fullDockEndZ), platform);

  if (fullDockEndDistance > RAMP_DOCK_EDGE_CLEARANCE) {
    return {
      visualDockEndZ: fullDockEndZ,
      trimApplied: false,
      trimDistance: 0,
      dockEdgeLabel: getDockEdgeLabel(localPointToWorld(element, 0, fullDockEndZ), platform),
    };
  }

  const lowerEndDistance = getDistanceToPlatformFootprint(localPointToWorld(element, 0, lowerEndZ), platform);

  if (lowerEndDistance <= RAMP_DOCK_EDGE_CLEARANCE) {
    return {
      visualDockEndZ: fullDockEndZ,
      trimApplied: false,
      trimDistance: 0,
      dockEdgeLabel: getDockEdgeLabel(localPointToWorld(element, 0, fullDockEndZ), platform),
    };
  }

  let insideZ = fullDockEndZ;
  let outsideZ = lowerEndZ;

  for (let index = 0; index < 18; index += 1) {
    const midZ = (insideZ + outsideZ) / 2;
    const distance = getDistanceToPlatformFootprint(localPointToWorld(element, 0, midZ), platform);

    if (distance <= RAMP_DOCK_EDGE_CLEARANCE) {
      insideZ = midZ;
    } else {
      outsideZ = midZ;
    }
  }

  const maxTrimDistance = element.width * RAMP_MAX_VISUAL_TRIM_RATIO;
  const rawTrimDistance = Math.abs(fullDockEndZ - outsideZ);
  const trimDistance = Math.min(rawTrimDistance, maxTrimDistance);
  const visualDockEndZ = fullDockEndZ - dockEndSign * trimDistance;
  const edgePoint = localPointToWorld(element, 0, visualDockEndZ);

  return {
    visualDockEndZ,
    trimApplied: trimDistance > 0.05,
    trimDistance,
    dockEdgeLabel: getDockEdgeLabel(edgePoint, platform),
  };
}

function getRampElevationInfo(element: ProjectRenderElement, platforms: ProjectRenderElement[]): RampElevationInfo {
  if (!isRampElement(element) || platforms.length === 0) {
    return {
      hasConnection: false,
      dockEndSign: 1,
      connectionDistance: null,
      deckTopHeight: RAMP_FLAT_TOP_HEIGHT,
      lowerEndHeight: RAMP_FLAT_TOP_HEIGHT,
      railAxisLabel: RAMP_RAIL_AXIS_LABEL,
      dockEdgeLabel: 'none',
      visualDockEndZ: null,
      visualTrimApplied: false,
      visualTrimDistance: 0,
    };
  }

  const negativeEnd = localPointToWorld(element, 0, -element.width / 2);
  const positiveEnd = localPointToWorld(element, 0, element.width / 2);
  const negativeClosest = getClosestPlatformForPoint(negativeEnd, platforms);
  const positiveClosest = getClosestPlatformForPoint(positiveEnd, platforms);
  const dockEndSign: -1 | 1 = negativeClosest.distance <= positiveClosest.distance ? -1 : 1;
  const closest = dockEndSign === -1 ? negativeClosest : positiveClosest;
  const connectionThreshold = Math.max(1.5, Math.min(element.length, element.width) * 0.75);

  if (!closest.platform || closest.distance > connectionThreshold) {
    return {
      hasConnection: false,
      dockEndSign,
      connectionDistance: Number.isFinite(closest.distance) ? closest.distance : null,
      deckTopHeight: RAMP_FLAT_TOP_HEIGHT,
      lowerEndHeight: RAMP_FLAT_TOP_HEIGHT,
      railAxisLabel: RAMP_RAIL_AXIS_LABEL,
      dockEdgeLabel: 'not detected',
      visualDockEndZ: null,
      visualTrimApplied: false,
      visualTrimDistance: 0,
    };
  }

  const deckTopHeight = getPlatformDeckTopHeight(closest.platform);
  const visualConnection = getRampVisualDockEndZ(element, closest.platform, dockEndSign);

  return {
    hasConnection: true,
    dockEndSign,
    connectedPlatformType: closest.platform.type,
    connectionDistance: closest.distance,
    deckTopHeight,
    lowerEndHeight: getRampLowerEndHeight(deckTopHeight),
    railAxisLabel: RAMP_RAIL_AXIS_LABEL,
    dockEdgeLabel: visualConnection.dockEdgeLabel,
    visualDockEndZ: visualConnection.visualDockEndZ,
    visualTrimApplied: visualConnection.trimApplied,
    visualTrimDistance: visualConnection.trimDistance,
  };
}

function formatKeyNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value).toFixed(3) : 'na';
}

function getElementRenderKey(element: ProjectRenderElement, rampElevation?: RampElevationInfo) {
  return [
    element.id,
    element.type,
    formatKeyNumber(element.x),
    formatKeyNumber(element.z),
    formatKeyNumber(element.length),
    formatKeyNumber(element.width),
    formatKeyNumber(element.rotation),
    formatKeyNumber(element.elevation),
    element.deckFinish ?? 'deck-default',
    element.boardDirection ?? 'board-default',
    String(element.showStandardCleats ?? 'standard-cleats-default'),
    formatKeyNumber(element.tubeDiameterFt),
    formatKeyNumber(element.boatPortWallHeightFt),
    formatKeyNumber(element.boatPortRoofRiseFt),
    element.boatPortRoofType ?? 'boat-port-roof-default',
    formatKeyNumber(element.boathouseWallHeightFt),
    formatKeyNumber(element.boathouseRoofRiseFt),
    element.boathouseRoofType ?? 'boathouse-roof-default',
    String(element.boathouseSlipCount ?? 'boathouse-slip-default'),
    element.boathouseDoorStyle ?? 'boathouse-door-default',
    element.boathouseWallFinish ?? 'boathouse-wall-default',
    element.boathouseRoofFinish ?? 'boathouse-roof-finish-default',
    element.accessoryType ?? 'accessory-type-default',
    element.accessoryFinish ?? 'accessory-finish-default',
    rampElevation ? String(rampElevation.hasConnection) : 'no-ramp',
    rampElevation ? formatKeyNumber(rampElevation.deckTopHeight) : 'na',
    rampElevation ? formatKeyNumber(rampElevation.lowerEndHeight) : 'na',
    rampElevation ? formatKeyNumber(rampElevation.visualDockEndZ) : 'na',
  ].join(':');
}

function ProjectElement({
  element,
  viewMode,
  rampElevation,
  accessoryMountInfo,
}: {
  element: ProjectRenderElement;
  viewMode: RenderViewMode;
  rampElevation?: RampElevationInfo;
  accessoryMountInfo?: AccessoryMountInfo;
}) {
  let renderedElement: JSX.Element | null = null;

  switch (element.type) {
    case 'floating_dock':
      renderedElement = <KehoeFloatingDockElement element={element} viewMode={viewMode} />;
      break;
    case 'stationary_dock':
      renderedElement = <PlatformElement element={element} viewMode={viewMode} />;
      break;
    case 'ramp_with_rails':
      renderedElement = (
        <KehoeRampWithRailsElement
          element={element}
          viewMode={viewMode}
          elevationInfo={
            rampElevation ?? {
              hasConnection: false,
              dockEndSign: 1,
              connectionDistance: null,
              deckTopHeight: RAMP_FLAT_TOP_HEIGHT,
              lowerEndHeight: RAMP_FLAT_TOP_HEIGHT,
              railAxisLabel: RAMP_RAIL_AXIS_LABEL,
              dockEdgeLabel: 'none',
              visualDockEndZ: null,
              visualTrimApplied: false,
              visualTrimDistance: 0,
            }
          }
        />
      );
      break;
    case 'ramp_without_rails':
      renderedElement = (
        <KehoeRampWithoutRailsElement
          element={element}
          viewMode={viewMode}
          elevationInfo={
            rampElevation ?? {
              hasConnection: false,
              dockEndSign: 1,
              connectionDistance: null,
              deckTopHeight: RAMP_FLAT_TOP_HEIGHT,
              lowerEndHeight: RAMP_FLAT_TOP_HEIGHT,
              railAxisLabel: RAMP_RAIL_AXIS_LABEL,
              dockEdgeLabel: 'none',
              visualDockEndZ: null,
              visualTrimApplied: false,
              visualTrimDistance: 0,
            }
          }
        />
      );
      break;
    case 'steps':
      renderedElement = <StepsElement element={element} viewMode={viewMode} />;
      break;
    case 'boat_lift':
      renderedElement = <BoatLiftElement element={element} viewMode={viewMode} />;
      break;
    case 'boat_port':
      renderedElement = <BoatPortElement element={element} viewMode={viewMode} />;
      break;
    case 'boathouse':
      renderedElement = <BoathouseElement element={element} viewMode={viewMode} />;
      break;
    case 'accessory':
      renderedElement = (
        <AccessoryElement
          element={element}
          viewMode={viewMode}
          mountInfo={
            accessoryMountInfo ?? {
              x: element.x,
              z: element.z,
              rotation: element.rotation,
              height: element.elevation,
              isDockMounted: false,
            }
          }
        />
      );
      break;
    case 'roof_overlay':
      renderedElement = <RoofOverlayElement element={element} viewMode={viewMode} />;
      break;
    default:
      return null;
  }

  return (
    <>
      {renderedElement}
      {viewMode === 'internal' && (
        <>
          <FootprintOutline element={element} />
          <DebugLabel element={element} rampElevation={rampElevation} />
        </>
      )}
    </>
  );
}

export function ProjectDockModel({ model, viewMode }: ProjectDockModelProps) {
  const platforms = model.elements.filter(isPlatformElement);

  return (
    <group>
      {model.elements.map((element) => {
        const rampElevation = isRampElement(element) ? getRampElevationInfo(element, platforms) : undefined;
        const accessoryMountInfo = element.type === 'accessory' ? getAccessoryMountInfo(element, platforms) : undefined;

        return (
          <ProjectElement
            key={getElementRenderKey(element, rampElevation)}
            element={element}
            viewMode={viewMode}
            rampElevation={rampElevation}
            accessoryMountInfo={accessoryMountInfo}
          />
        );
      })}
    </group>
  );
}
