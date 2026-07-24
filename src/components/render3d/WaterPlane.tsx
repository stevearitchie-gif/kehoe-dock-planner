interface WaterPlaneProps {
  viewMode?: 'customer' | 'internal';
}

function WaveSurface({ isCustomerView }: { isCustomerView: boolean }) {
  const width = 140;
  const depth = 96;
  const columns = 36;
  const rows = 26;
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= rows; row += 1) {
    const z = -depth / 2 + (depth * row) / rows;
    for (let column = 0; column <= columns; column += 1) {
      const x = -width / 2 + (width * column) / columns;
      const wave = Math.sin(column * 0.85 + row * 0.38) * 0.018 + Math.sin(column * 0.22 - row * 0.72) * 0.012;
      vertices.push(x, wave, z);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const current = row * (columns + 1) + column;
      const next = current + columns + 1;
      indices.push(current, next, current + 1, current + 1, next, next + 1);
    }
  }

  return (
    <mesh position={[0, isCustomerView ? -0.018 : -0.022, 0]} receiveShadow>
      <bufferGeometry onUpdate={(geometry) => geometry.computeVertexNormals()}>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(vertices), 3]} />
        <bufferAttribute attach="index" args={[new Uint16Array(indices), 1]} />
      </bufferGeometry>
      <meshStandardMaterial
        color={isCustomerView ? '#68b7c5' : '#4aa3b7'}
        roughness={isCustomerView ? 0.2 : 0.32}
        metalness={isCustomerView ? 0.1 : 0.04}
        transparent
        opacity={isCustomerView ? 0.78 : 0.64}
      />
    </mesh>
  );
}

function RippleBands({ isCustomerView }: { isCustomerView: boolean }) {
  const bandColor = isCustomerView ? '#d8fbff' : '#c4eef7';
  const bandOpacity = isCustomerView ? 0.32 : 0.18;
  const bands = [
    { x: -28, z: -28, width: 18, rotation: -0.08 },
    { x: 7, z: -22, width: 24, rotation: 0.04 },
    { x: 34, z: -10, width: 16, rotation: -0.05 },
    { x: -18, z: 2, width: 22, rotation: 0.07 },
    { x: 22, z: 16, width: 28, rotation: -0.04 },
    { x: -36, z: 26, width: 19, rotation: 0.05 },
  ];

  return (
    <group>
      {bands.map((band, index) => (
        <mesh key={index} position={[band.x, 0.018 + index * 0.0008, band.z]} rotation={[0, band.rotation, 0]}>
          <boxGeometry args={[band.width, 0.006, 0.045]} />
          <meshStandardMaterial color={bandColor} roughness={0.16} metalness={0.08} transparent opacity={bandOpacity} />
        </mesh>
      ))}
    </group>
  );
}

export function WaterPlane({ viewMode = 'internal' }: WaterPlaneProps) {
  const isCustomerView = viewMode === 'customer';

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[146, 102, 1, 1]} />
        <meshStandardMaterial
          color={isCustomerView ? '#86cbd4' : '#5db4c3'}
          roughness={isCustomerView ? 0.42 : 0.46}
          metalness={0.02}
          transparent
          opacity={isCustomerView ? 0.54 : 0.42}
        />
      </mesh>
      <WaveSurface isCustomerView={isCustomerView} />
      <RippleBands isCustomerView={isCustomerView} />
    </group>
  );
}
