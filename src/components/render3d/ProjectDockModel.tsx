import { Text } from '@react-three/drei';
import type { ProjectRenderElement, ProjectRenderModel, RenderViewMode } from '@/components/render3d/types';

interface ProjectDockModelProps {
  model: ProjectRenderModel;
  viewMode: RenderViewMode;
}

function getDeckColor(element: ProjectRenderElement, viewMode: RenderViewMode) {
  if (viewMode === 'internal') {
    return element.color;
  }

  if (element.type === 'stationary_dock') {
    return '#9b7a52';
  }

  return '#b08a5a';
}

function DeckBoardLines({ length, width, y, color = '#6b5438' }: { length: number; width: number; y: number; color?: string }) {
  const lineCount = Math.max(3, Math.min(18, Math.round(width / 0.75)));
  const spacing = width / lineCount;

  return (
    <>
      {Array.from({ length: lineCount + 1 }, (_, index) => (
        <mesh key={index} position={[0, y, -width / 2 + index * spacing]} receiveShadow>
          <boxGeometry args={[length + 0.02, 0.018, 0.018]} />
          <meshStandardMaterial color={color} roughness={0.82} />
        </mesh>
      ))}
    </>
  );
}

function DebugLabel({ element }: { element: ProjectRenderElement }) {
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
      )} h:${Math.round(element.sourceHeight)} r:${Math.round(element.sourceRotation)}deg\n${element.anchorInterpretation}\n${element.scaleSourceLabel}`}
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

function RampElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  const hasRails = element.type === 'ramp_with_rails';
  const rampThickness = 0.32;
  const rampY = element.elevation + rampThickness / 2;
  const railColor = viewMode === 'customer' ? '#f8fafc' : '#e2e8f0';
  const deckColor = viewMode === 'customer' ? '#aa8454' : element.color;
  const railBaseY = element.elevation + rampThickness + 0.9;
  const railsAlongZ = element.width > element.length;
  const railOffsets = [-0.45, 0, 0.45];

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <mesh position={[0, rampY, 0]} castShadow receiveShadow>
        <boxGeometry args={[element.length, rampThickness, element.width]} />
        <meshStandardMaterial color={deckColor} roughness={0.76} transparent opacity={element.opacity} />
      </mesh>
      <DeckBoardLines length={element.length} width={element.width} y={element.elevation + rampThickness + 0.035} />
      {hasRails && (
        <>
          {railsAlongZ
            ? [-1, 1].map((xSign) => (
                <group key={xSign} position={[xSign * (element.length / 2 + 0.12), railBaseY, 0]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.12, 0.12, element.width]} />
                    <meshStandardMaterial color={railColor} roughness={0.42} />
                  </mesh>
                  {railOffsets.map((zOffset) => (
                    <mesh key={zOffset} position={[0, -0.58, element.width * zOffset]} castShadow>
                      <boxGeometry args={[0.13, 1.3, 0.13]} />
                      <meshStandardMaterial color={railColor} roughness={0.48} />
                    </mesh>
                  ))}
                </group>
              ))
            : [-1, 1].map((zSign) => (
                <group key={zSign} position={[0, railBaseY, zSign * (element.width / 2 + 0.12)]}>
                  <mesh castShadow>
                    <boxGeometry args={[element.length, 0.12, 0.12]} />
                    <meshStandardMaterial color={railColor} roughness={0.42} />
                  </mesh>
                  {railOffsets.map((xOffset) => (
                    <mesh key={xOffset} position={[element.length * xOffset, -0.58, 0]} castShadow>
                      <boxGeometry args={[0.13, 1.3, 0.13]} />
                      <meshStandardMaterial color={railColor} roughness={0.48} />
                    </mesh>
                  ))}
                </group>
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

function ProjectElement({ element, viewMode }: { element: ProjectRenderElement; viewMode: RenderViewMode }) {
  let renderedElement: JSX.Element | null = null;

  switch (element.type) {
    case 'floating_dock':
    case 'stationary_dock':
      renderedElement = <PlatformElement element={element} viewMode={viewMode} />;
      break;
    case 'ramp_with_rails':
    case 'ramp_without_rails':
      renderedElement = <RampElement element={element} viewMode={viewMode} />;
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
          <DebugLabel element={element} />
        </>
      )}
    </>
  );
}

export function ProjectDockModel({ model, viewMode }: ProjectDockModelProps) {
  return (
    <group>
      {model.elements.map((element) => (
        <ProjectElement key={element.id} element={element} viewMode={viewMode} />
      ))}
    </group>
  );
}
