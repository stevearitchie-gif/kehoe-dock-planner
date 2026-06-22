import { Text } from '@react-three/drei';
import type { ProjectRenderElement, ProjectRenderModel, RenderViewMode } from '@/components/render3d/types';

interface RampElevationInfo {
  hasConnection: boolean;
  dockEndSign: -1 | 1;
  connectedPlatformType?: ProjectRenderElement['type'];
  connectionDistance: number | null;
  deckTopHeight: number;
  lowerEndHeight: number;
  railAxisLabel: string;
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
const FLOATING_DOCK_DECK_TOP_HEIGHT = 0.52;
const STATIONARY_DOCK_DECK_TOP_HEIGHT = 0.68;

function getDeckColor(element: ProjectRenderElement, viewMode: RenderViewMode) {
  if (viewMode === 'internal') {
    return element.color;
  }

  if (element.type === 'stationary_dock') {
    return '#9b7a52';
  }

  return '#b08a5a';
}

function getLocalRampTopHeight(z: number, width: number, elevationInfo: RampElevationInfo) {
  if (!elevationInfo.hasConnection) {
    return elevationInfo.deckTopHeight;
  }

  const normalized = z / (width / 2);
  const dockEndWeight = elevationInfo.dockEndSign === 1 ? (normalized + 1) / 2 : (1 - normalized) / 2;

  return elevationInfo.lowerEndHeight + (elevationInfo.deckTopHeight - elevationInfo.lowerEndHeight) * dockEndWeight;
}

function DeckBoardLines({
  length,
  width,
  y,
  color = '#6b5438',
  rampElevation,
}: {
  length: number;
  width: number;
  y: number;
  color?: string;
  rampElevation?: RampElevationInfo;
}) {
  const lineCount = Math.max(3, Math.min(18, Math.round(width / 0.75)));
  const spacing = width / lineCount;

  return (
    <>
      {Array.from({ length: lineCount + 1 }, (_, index) => {
        const z = -width / 2 + index * spacing;
        const lineY = rampElevation ? getLocalRampTopHeight(z, width, rampElevation) + 0.025 : y;

        return (
          <mesh key={index} position={[0, lineY, z]} receiveShadow>
            <boxGeometry args={[length + 0.02, 0.018, 0.018]} />
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
        }`
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
      <DeckBoardLines length={element.length} width={element.width} y={element.elevation + platformHeight + 0.04} />

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
  const halfWidth = element.width / 2;
  const topNegativeZ = getLocalRampTopHeight(-halfWidth, element.width, elevationInfo);
  const topPositiveZ = getLocalRampTopHeight(halfWidth, element.width, elevationInfo);
  const bottomNegativeZ = topNegativeZ - RAMP_THICKNESS;
  const bottomPositiveZ = topPositiveZ - RAMP_THICKNESS;
  const vertices = new Float32Array([
    -halfLength,
    bottomNegativeZ,
    -halfWidth,
    halfLength,
    bottomNegativeZ,
    -halfWidth,
    halfLength,
    bottomPositiveZ,
    halfWidth,
    -halfLength,
    bottomPositiveZ,
    halfWidth,
    -halfLength,
    topNegativeZ,
    -halfWidth,
    halfLength,
    topNegativeZ,
    -halfWidth,
    halfLength,
    topPositiveZ,
    halfWidth,
    -halfLength,
    topPositiveZ,
    halfWidth,
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
  const zA = -element.width / 2;
  const zB = element.width / 2;
  const yA = getLocalRampTopHeight(zA, element.width, elevationInfo) + 0.9;
  const yB = getLocalRampTopHeight(zB, element.width, elevationInfo) + 0.9;
  const beamCenterY = (yA + yB) / 2;
  const beamLength = Math.hypot(element.width, yB - yA);
  const slopeAngle = Math.atan2(yA - yB, element.width);

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, beamCenterY, 0]} rotation={[slopeAngle, 0, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, beamLength]} />
        <meshStandardMaterial color={railColor} roughness={0.42} />
      </mesh>
      {railOffsets.map((zOffset) => {
        const z = element.width * zOffset;
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
  const deckColor = viewMode === 'customer' ? '#aa8454' : element.color;
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

function StepsElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  const stepCount = 4;
  const stepDepth = element.length / stepCount;
  const stepColor = viewMode === 'customer' ? '#a98255' : element.color;

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

function BoatLiftElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
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

function RoofOverlayElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  const roofY = element.elevation + 3.8;
  const canopyColor = viewMode === 'customer' ? '#f3f8fb' : element.color;
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

function getRampLowerEndHeight(deckTopHeight: number) {
  const preferredHeightDifference = Math.max(
    RAMP_MIN_HEIGHT_DIFFERENCE,
    Math.min(RAMP_MAX_HEIGHT_DIFFERENCE, deckTopHeight - (RAMP_THICKNESS + RAMP_MIN_BOTTOM_HEIGHT)),
  );

  return Math.max(RAMP_THICKNESS + RAMP_MIN_BOTTOM_HEIGHT, deckTopHeight - preferredHeightDifference);
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

function getRampElevationInfo(element: ProjectRenderElement, platforms: ProjectRenderElement[]): RampElevationInfo {
  if (!isRampElement(element) || platforms.length === 0) {
    return {
      hasConnection: false,
      dockEndSign: 1,
      connectionDistance: null,
      deckTopHeight: RAMP_FLAT_TOP_HEIGHT,
      lowerEndHeight: RAMP_FLAT_TOP_HEIGHT,
      railAxisLabel: RAMP_RAIL_AXIS_LABEL,
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
    };
  }

  const deckTopHeight = getPlatformDeckTopHeight(closest.platform);

  return {
    hasConnection: true,
    dockEndSign,
    connectedPlatformType: closest.platform.type,
    connectionDistance: closest.distance,
    deckTopHeight,
    lowerEndHeight: getRampLowerEndHeight(deckTopHeight),
    railAxisLabel: RAMP_RAIL_AXIS_LABEL,
  };
}

function ProjectElement({
  element,
  viewMode,
  rampElevation,
}: {
  element: ProjectRenderElement;
  viewMode: RenderViewMode;
  rampElevation?: RampElevationInfo;
}) {
  let renderedElement: JSX.Element | null = null;

  switch (element.type) {
    case 'floating_dock':
    case 'stationary_dock':
      renderedElement = <PlatformElement element={element} viewMode={viewMode} />;
      break;
    case 'ramp_with_rails':
    case 'ramp_without_rails':
      renderedElement = (
        <RampElement
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

        return <ProjectElement key={element.id} element={element} viewMode={viewMode} rampElevation={rampElevation} />;
      })}
    </group>
  );
}
