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
        color={isCustomerView ? '#75bdc8' : '#4aa3b7'}
        roughness={isCustomerView ? 0.24 : 0.34}
        metalness={isCustomerView ? 0.08 : 0.04}
        transparent
        opacity={isCustomerView ? 0.72 : 0.62}
      />
    </mesh>
  );
}

export function WaterPlane({ viewMode = 'internal' }: WaterPlaneProps) {
  const isCustomerView = viewMode === 'customer';

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[146, 102, 1, 1]} />
        <meshStandardMaterial
          color={isCustomerView ? '#8fd2d9' : '#5db4c3'}
          roughness={isCustomerView ? 0.38 : 0.44}
          metalness={0.02}
          transparent
          opacity={isCustomerView ? 0.48 : 0.42}
        />
      </mesh>
      <WaveSurface isCustomerView={isCustomerView} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <planeGeometry args={[138, 94, 1, 1]} />
        <meshStandardMaterial
          color={isCustomerView ? '#d9fbff' : '#bfeefa'}
          roughness={0.18}
          metalness={0.05}
          transparent
          opacity={isCustomerView ? 0.16 : 0.1}
        />
      </mesh>
    </group>
  );
}
