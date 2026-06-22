interface DockRailingsProps {
  dockLength: number;
  dockWidth: number;
  dockHeight: number;
}

export function DockRailings({ dockLength, dockWidth, dockHeight }: DockRailingsProps) {
  const railHeight = 3;
  const postHeight = 3.4;
  const postSpacing = 6;
  const postCount = Math.max(3, Math.floor(dockLength / postSpacing) + 1);
  const sideZ = dockWidth / 2 + 0.12;
  const farX = dockLength / 2 - 0.2;
  const railY = dockHeight + railHeight;
  const postY = dockHeight + postHeight / 2;

  const postPositions = Array.from({ length: postCount }, (_, index) => {
    const progress = postCount === 1 ? 0 : index / (postCount - 1);
    return -dockLength / 2 + progress * dockLength;
  });

  return (
    <group>
      {[-sideZ, sideZ].map((zPosition) => (
        <group key={zPosition}>
          {postPositions.map((xPosition) => (
            <mesh key={`${zPosition}-${xPosition}`} position={[xPosition, postY, zPosition]} castShadow>
              <boxGeometry args={[0.22, postHeight, 0.22]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.45} />
            </mesh>
          ))}
          <mesh position={[0, railY, zPosition]} castShadow>
            <boxGeometry args={[dockLength, 0.22, 0.22]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          <mesh position={[0, dockHeight + 1.8, zPosition]} castShadow>
            <boxGeometry args={[dockLength, 0.16, 0.16]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.48} />
          </mesh>
        </group>
      ))}

      <mesh position={[farX, railY, 0]} castShadow>
        <boxGeometry args={[0.22, 0.22, dockWidth]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      {[-dockWidth / 2, 0, dockWidth / 2].map((zPosition) => (
        <mesh key={zPosition} position={[farX, postY, zPosition]} castShadow>
          <boxGeometry args={[0.22, postHeight, 0.22]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}
