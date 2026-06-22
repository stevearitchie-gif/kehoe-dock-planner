import type { ProjectRenderElement, ProjectRenderModel } from '@/components/render3d/types';

interface ProjectDockModelProps {
  model: ProjectRenderModel;
}

function PlatformElement({ element }: { element: ProjectRenderElement }) {
  const isFloatingDock = element.type === 'floating_dock';
  const isStationaryDock = element.type === 'stationary_dock';
  const platformHeight = isStationaryDock ? 0.75 : 0.55;
  const platformY = element.elevation + platformHeight / 2;

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <mesh position={[0, platformY, 0]} castShadow receiveShadow>
        <boxGeometry args={[element.length, platformHeight, element.width]} />
        <meshStandardMaterial color={element.color} roughness={0.72} transparent opacity={element.opacity} />
      </mesh>

      {isFloatingDock && (
        <>
          <mesh position={[0, 0.16, -element.width * 0.32]} castShadow receiveShadow>
            <boxGeometry args={[element.length * 0.82, 0.32, Math.max(0.45, element.width * 0.16)]} />
            <meshStandardMaterial color="#d7dee7" roughness={0.58} />
          </mesh>
          <mesh position={[0, 0.16, element.width * 0.32]} castShadow receiveShadow>
            <boxGeometry args={[element.length * 0.82, 0.32, Math.max(0.45, element.width * 0.16)]} />
            <meshStandardMaterial color="#d7dee7" roughness={0.58} />
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
            <meshStandardMaterial color="#64748b" roughness={0.5} />
          </mesh>
        )),
      )}
    </group>
  );
}

function RampElement({ element }: { element: ProjectRenderElement }) {
  const hasRails = element.type === 'ramp_with_rails';
  const rampThickness = 0.32;
  const rampY = element.elevation + 0.62;

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <mesh position={[0, rampY, 0]} rotation={[0, 0, -0.18]} castShadow receiveShadow>
        <boxGeometry args={[element.length, rampThickness, element.width]} />
        <meshStandardMaterial color={element.color} roughness={0.74} transparent opacity={element.opacity} />
      </mesh>
      {hasRails && (
        <>
          {[-1, 1].map((zSign) => (
            <group key={zSign} position={[0, rampY + 1.2, zSign * (element.width / 2 + 0.12)]}>
              <mesh castShadow>
                <boxGeometry args={[element.length, 0.16, 0.16]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.42} />
              </mesh>
              {[-0.42, 0, 0.42].map((xOffset) => (
                <mesh key={xOffset} position={[element.length * xOffset, -0.58, 0]} castShadow>
                  <boxGeometry args={[0.16, 1.3, 0.16]} />
                  <meshStandardMaterial color="#cbd5e1" roughness={0.48} />
                </mesh>
              ))}
            </group>
          ))}
        </>
      )}
    </group>
  );
}

function StepsElement({ element }: { element: ProjectRenderElement }) {
  const stepCount = 4;
  const stepDepth = element.length / stepCount;

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      {Array.from({ length: stepCount }, (_, index) => {
        const height = 0.22 + index * 0.18;
        return (
          <mesh key={index} position={[-element.length / 2 + stepDepth * (index + 0.5), element.elevation + height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[stepDepth, height, element.width]} />
            <meshStandardMaterial color={element.color} roughness={0.68} transparent opacity={element.opacity} />
          </mesh>
        );
      })}
    </group>
  );
}

function BoatLiftElement({ element }: { element: ProjectRenderElement }) {
  const postHeight = 3.2;
  const beamY = element.elevation + postHeight;
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
          <boxGeometry args={[0.18, postHeight, 0.18]} />
          <meshStandardMaterial color="#0e7490" roughness={0.38} />
        </mesh>
      ))}
      {[-element.width / 2, element.width / 2].map((z) => (
        <mesh key={z} position={[0, beamY, z]} castShadow>
          <boxGeometry args={[element.length, 0.16, 0.16]} />
          <meshStandardMaterial color="#155e75" roughness={0.36} />
        </mesh>
      ))}
      <mesh position={[0, element.elevation + 0.18, 0]} receiveShadow>
        <boxGeometry args={[element.length * 0.72, 0.08, element.width * 0.22]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.55} />
      </mesh>
    </group>
  );
}

function RoofOverlayElement({ element }: { element: ProjectRenderElement }) {
  const roofY = element.elevation + 3.4;

  return (
    <group position={[element.x, 0, element.z]} rotation={[0, element.rotation, 0]}>
      <mesh position={[0, roofY, 0]} castShadow>
        <boxGeometry args={[element.length, 0.12, element.width]} />
        <meshStandardMaterial color={element.color} roughness={0.35} transparent opacity={0.28} />
      </mesh>
      <mesh position={[0, roofY + 0.08, -element.width / 2]} castShadow>
        <boxGeometry args={[element.length, 0.12, 0.12]} />
        <meshStandardMaterial color="#475569" roughness={0.45} />
      </mesh>
      <mesh position={[0, roofY + 0.08, element.width / 2]} castShadow>
        <boxGeometry args={[element.length, 0.12, 0.12]} />
        <meshStandardMaterial color="#475569" roughness={0.45} />
      </mesh>
      <mesh position={[-element.length / 2, roofY + 0.08, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, element.width]} />
        <meshStandardMaterial color="#475569" roughness={0.45} />
      </mesh>
      <mesh position={[element.length / 2, roofY + 0.08, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, element.width]} />
        <meshStandardMaterial color="#475569" roughness={0.45} />
      </mesh>
    </group>
  );
}

function ProjectElement({ element }: { element: ProjectRenderElement }) {
  switch (element.type) {
    case 'floating_dock':
    case 'stationary_dock':
      return <PlatformElement element={element} />;
    case 'ramp_with_rails':
    case 'ramp_without_rails':
      return <RampElement element={element} />;
    case 'steps':
      return <StepsElement element={element} />;
    case 'boat_lift':
      return <BoatLiftElement element={element} />;
    case 'roof_overlay':
      return <RoofOverlayElement element={element} />;
    default:
      return null;
  }
}

export function ProjectDockModel({ model }: ProjectDockModelProps) {
  return (
    <group>
      {model.elements.map((element) => (
        <ProjectElement key={element.id} element={element} />
      ))}
    </group>
  );
}
