import { useMemo } from 'react';
// @ts-ignore -- three is provided by the existing React Three Fiber runtime dependency.
import { CanvasTexture, RepeatWrapping } from 'three';

interface WaterPlaneProps {
  viewMode?: 'customer' | 'internal';
}

function createWaterTexture(isCustomerView: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  const gradient = context.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, isCustomerView ? '#73bdca' : '#4b9cad');
  gradient.addColorStop(0.48, isCustomerView ? '#82cbd5' : '#59aebe');
  gradient.addColorStop(1, isCustomerView ? '#6fb8c5' : '#438fa0');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  for (let y = 14; y < 256; y += 17) {
    const offset = Math.sin(y * 0.11) * 12;
    context.beginPath();
    context.moveTo(-20, y + offset * 0.08);
    for (let x = -20; x <= 276; x += 18) {
      context.lineTo(x, y + Math.sin((x + y) * 0.045) * 1.8 + offset * 0.05);
    }
    context.strokeStyle = isCustomerView ? 'rgba(189, 226, 232, 0.16)' : 'rgba(170, 214, 224, 0.12)';
    context.lineWidth = 1;
    context.stroke();
  }

  for (let index = 0; index < 420; index += 1) {
    const x = (index * 47) % 256;
    const y = (index * 83) % 256;
    const opacity = 0.035 + ((index * 13) % 9) / 1000;
    context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    context.fillRect(x, y, 1, 1);
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(8, 6);
  return texture;
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
      const wave = Math.sin(column * 0.85 + row * 0.38) * 0.014 + Math.sin(column * 0.22 - row * 0.72) * 0.008;
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
        color={isCustomerView ? '#6ebdcc' : '#4aa3b7'}
        roughness={isCustomerView ? 0.34 : 0.38}
        metalness={isCustomerView ? 0.04 : 0.03}
        transparent
        opacity={isCustomerView ? 0.58 : 0.5}
      />
    </mesh>
  );
}

function RippleBands({ isCustomerView }: { isCustomerView: boolean }) {
  const bandColor = isCustomerView ? '#b9e3ea' : '#a8d5df';
  const bandOpacity = isCustomerView ? 0.16 : 0.11;
  const bands = [
    { x: -42, z: -36, width: 18, rotation: -0.04 },
    { x: -5, z: -30, width: 24, rotation: 0.03 },
    { x: 34, z: -24, width: 17, rotation: -0.03 },
    { x: -30, z: -12, width: 20, rotation: 0.04 },
    { x: 8, z: -6, width: 26, rotation: -0.02 },
    { x: 42, z: 2, width: 16, rotation: 0.04 },
    { x: -36, z: 14, width: 22, rotation: 0.03 },
    { x: 2, z: 22, width: 28, rotation: -0.03 },
    { x: 34, z: 32, width: 20, rotation: 0.03 },
  ];

  return (
    <group>
      {bands.map((band, index) => (
        <mesh key={index} position={[band.x, 0.018 + index * 0.0008, band.z]} rotation={[0, band.rotation, 0]}>
          <boxGeometry args={[band.width, 0.004, isCustomerView ? 0.024 : 0.02]} />
          <meshBasicMaterial color={bandColor} transparent opacity={bandOpacity} />
        </mesh>
      ))}
    </group>
  );
}

export function WaterPlane({ viewMode = 'internal' }: WaterPlaneProps) {
  const isCustomerView = viewMode === 'customer';
  const waterTexture = useMemo(() => createWaterTexture(isCustomerView), [isCustomerView]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[146, 102, 1, 1]} />
        <meshStandardMaterial
          color={isCustomerView ? '#7fc7d3' : '#5db4c3'}
          map={waterTexture ?? undefined}
          bumpMap={waterTexture ?? undefined}
          bumpScale={isCustomerView ? 0.012 : 0.008}
          roughness={isCustomerView ? 0.52 : 0.5}
          metalness={0.01}
          transparent
          opacity={isCustomerView ? 0.66 : 0.48}
        />
      </mesh>
      <WaveSurface isCustomerView={isCustomerView} />
      <RippleBands isCustomerView={isCustomerView} />
    </group>
  );
}
