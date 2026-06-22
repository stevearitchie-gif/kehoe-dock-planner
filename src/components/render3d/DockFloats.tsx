interface DockFloatsProps {
  dockLength: number;
  dockWidth: number;
}

export function DockFloats({ dockLength, dockWidth }: DockFloatsProps) {
  const floatLength = Math.max(4, dockLength * 0.82);
  const floatWidth = Math.max(1, Math.min(2.2, dockWidth * 0.18));
  const zOffset = Math.max(1.4, dockWidth * 0.34);

  return (
    <group>
      {[-zOffset, zOffset].map((zPosition) => (
        <mesh key={zPosition} position={[0, 0.18, zPosition]} castShadow receiveShadow>
          <boxGeometry args={[floatLength, 0.36, floatWidth]} />
          <meshStandardMaterial color="#d7dee7" roughness={0.58} metalness={0.08} />
        </mesh>
      ))}
    </group>
  );
}
