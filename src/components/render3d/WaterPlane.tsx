interface WaterPlaneProps {
  viewMode?: 'customer' | 'internal';
}

export function WaterPlane({ viewMode = 'internal' }: WaterPlaneProps) {
  const isCustomerView = viewMode === 'customer';

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[140, 96, 32, 24]} />
      <meshStandardMaterial
        color={isCustomerView ? '#6eb7c7' : '#4aa3b7'}
        roughness={isCustomerView ? 0.18 : 0.28}
        metalness={isCustomerView ? 0.12 : 0.05}
        transparent
        opacity={isCustomerView ? 0.86 : 0.72}
      />
    </mesh>
  );
}
