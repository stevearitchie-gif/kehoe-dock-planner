export function WaterPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[120, 80, 24, 16]} />
      <meshStandardMaterial color="#4aa3b7" roughness={0.28} metalness={0.05} transparent opacity={0.72} />
    </mesh>
  );
}
