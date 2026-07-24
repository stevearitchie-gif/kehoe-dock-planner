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
      const wave = Math.sin(column * 0.85 + row * 0.38) * 0.032 + Math.sin(column * 0.22 - row * 0.72) * 0.018;
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
        color={isCustomerView ? '#63b7c7' : '#4aa3b7'}
        roughness={isCustomerView ? 0.18 : 0.32}
        metalness={isCustomerView ? 0.12 : 0.04}
        transparent
        opacity={isCustomerView ? 0.82 : 0.64}
      />
    </mesh>
  );
}

function RippleBands({ isCustomerView }: { isCustomerView: boolean }) {
  const bandColor = isCustomerView ? '#e3fcff' : '#c4eef7';
  const bandOpacity = isCustomerView ? 0.42 : 0.2;
  const bands = [
    { x: -44, z: -38, width: 26, rotation: -0.07 },
    { x: -8, z: -34, width: 34, rotation: 0.04 },
    { x: 35, z: -30, width: 22, rotation: -0.05 },
    { x: -30, z: -22, width: 24, rotation: 0.08 },
    { x: 12, z: -18, width: 38, rotation: -0.03 },
    { x: 48, z: -12, width: 20, rotation: 0.06 },
    { x: -50, z: -5, width: 18, rotation: -0.04 },
    { x: -14, z: 0, width: 32, rotation: 0.05 },
    { x: 30, z: 5, width: 28, rotation: -0.06 },
    { x: -36, z: 14, width: 30, rotation: 0.04 },
    { x: 4, z: 18, width: 42, rotation: -0.05 },
    { x: 46, z: 24, width: 24, rotation: 0.07 },
    { x: -18, z: 32, width: 36, rotation: -0.04 },
    { x: 28, z: 38, width: 30, rotation: 0.05 },
  ];

  return (
    <group>
      {bands.map((band, index) => (
        <mesh key={index} position={[band.x, 0.018 + index * 0.0008, band.z]} rotation={[0, band.rotation, 0]}>
          <boxGeometry args={[band.width, 0.006, isCustomerView ? 0.065 : 0.05]} />
          <meshStandardMaterial color={bandColor} roughness={0.12} metalness={0.12} transparent opacity={bandOpacity} />
        </mesh>
      ))}
    </group>
  );
}

function WaterDepthBands({ isCustomerView }: { isCustomerView: boolean }) {
  const bands = [
    { z: -36, depth: 18, opacity: isCustomerView ? 0.16 : 0.1 },
    { z: -8, depth: 22, opacity: isCustomerView ? 0.12 : 0.08 },
    { z: 24, depth: 20, opacity: isCustomerView ? 0.14 : 0.09 },
  ];

  return (
    <group>
      {bands.map((band, index) => (
        <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.052 + index * 0.0007, band.z]}>
          <planeGeometry args={[146, band.depth, 1, 1]} />
          <meshStandardMaterial color={isCustomerView ? '#4aa8bd' : '#3f9aad'} roughness={0.46} metalness={0.02} transparent opacity={band.opacity} />
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
          color={isCustomerView ? '#82cdd8' : '#5db4c3'}
          roughness={isCustomerView ? 0.4 : 0.46}
          metalness={0.02}
          transparent
          opacity={isCustomerView ? 0.58 : 0.42}
        />
      </mesh>
      <WaterDepthBands isCustomerView={isCustomerView} />
      <WaveSurface isCustomerView={isCustomerView} />
      <RippleBands isCustomerView={isCustomerView} />
    </group>
  );
}
