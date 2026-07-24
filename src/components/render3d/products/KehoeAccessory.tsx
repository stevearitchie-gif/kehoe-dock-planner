import { getSalesMaterialPalette } from '@/components/render3d/salesMaterials';
import type { AccessoryFinish, AccessoryType, RenderViewMode } from '@/components/render3d/types';

export interface KehoeAccessoryProps {
  footprintLengthFt: number;
  footprintWidthFt: number;
  accessoryType?: AccessoryType;
  finish?: AccessoryFinish;
  opacity?: number;
  mountStyle?: 'deck' | 'dock_ladder';
  viewMode: RenderViewMode;
}

const DEFAULT_LENGTH_FT = 3;
const DEFAULT_WIDTH_FT = 1;

function getPositiveValue(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getMaterialColor(type: AccessoryType, finish: AccessoryFinish, viewMode: RenderViewMode) {
  const palette = getSalesMaterialPalette(viewMode);

  if (viewMode === 'internal') {
    return {
      primary: '#0f766e',
      secondary: '#f59e0b',
      dark: '#0f172a',
    };
  }

  if (type === 'bumper' || finish === 'rubber') {
    return {
      primary: '#1f2937',
      secondary: '#111827',
      dark: '#0f172a',
    };
  }

  if (type === 'bench' || finish === 'wood') {
    return {
      primary: '#9a6b3f',
      secondary: '#c49a6c',
      dark: '#475569',
    };
  }

  return {
    primary: finish === 'neutral' ? '#94a3b8' : palette.aluminum.color,
    secondary: '#e2e8f0',
    dark: palette.aluminum.darkColor,
  };
}

export function KehoeAccessory({
  footprintLengthFt,
  footprintWidthFt,
  accessoryType = 'cleat',
  finish = 'metal',
  opacity = 1,
  mountStyle = 'deck',
  viewMode,
}: KehoeAccessoryProps) {
  const length = getPositiveValue(footprintLengthFt, DEFAULT_LENGTH_FT);
  const width = getPositiveValue(footprintWidthFt, DEFAULT_WIDTH_FT);
  const normalizedType: AccessoryType =
    accessoryType === 'bumper' ||
    accessoryType === 'ladder' ||
    accessoryType === 'bench' ||
    accessoryType === 'post' ||
    accessoryType === 'tie_up_point'
      ? accessoryType
      : 'cleat';
  const normalizedFinish: AccessoryFinish =
    finish === 'rubber' || finish === 'wood' || finish === 'neutral' ? finish : 'metal';
  const colors = getMaterialColor(normalizedType, normalizedFinish, viewMode);
  const materialProps = {
    roughness: normalizedFinish === 'metal' ? 0.28 : 0.46,
    metalness: normalizedFinish === 'metal' ? 0.36 : 0.04,
    transparent: opacity < 1,
    opacity,
  };

  if (normalizedType === 'bumper') {
    return (
      <group>
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, 0.22, Math.max(0.22, width * 0.45)]} />
          <meshStandardMaterial color={colors.primary} {...materialProps} />
        </mesh>
        <mesh position={[0, 0.34, 0]} castShadow>
          <boxGeometry args={[length * 0.9, 0.08, Math.max(0.12, width * 0.22)]} />
          <meshStandardMaterial color={colors.secondary} roughness={0.55} metalness={0.02} />
        </mesh>
      </group>
    );
  }

  if (normalizedType === 'ladder') {
    const railX = Math.max(0.14, width * 0.22);
    const rungCount = 4;
    const ladderDrop = Math.max(2.2, Math.min(4.2, length));

    return (
      <group>
        {[-1, 1].map((sign) => (
          <mesh key={`ladder-rail-${sign}`} position={[sign * railX, mountStyle === 'dock_ladder' ? -ladderDrop / 2 : ladderDrop / 2, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, ladderDrop, 12]} />
            <meshStandardMaterial color={colors.primary} {...materialProps} />
          </mesh>
        ))}
        {Array.from({ length: rungCount }, (_, index) => {
          const y =
            mountStyle === 'dock_ladder'
              ? -ladderDrop * 0.88 + (index * ladderDrop * 0.68) / (rungCount - 1)
              : ladderDrop * 0.16 + (index * ladderDrop * 0.68) / (rungCount - 1);

          return (
            <mesh key={`ladder-rung-${index}`} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, railX * 2, 12]} />
              <meshStandardMaterial color={colors.secondary} roughness={0.36} metalness={0.18} />
            </mesh>
          );
        })}
        {mountStyle === 'dock_ladder' && [-1, 1].map((sign) => (
          <mesh key={`ladder-hook-${sign}`} position={[sign * railX, 0.08, 0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.34, 12]} />
            <meshStandardMaterial color={colors.secondary} roughness={0.36} metalness={0.18} />
          </mesh>
        ))}
      </group>
    );
  }

  if (normalizedType === 'bench') {
    return (
      <group>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, 0.16, Math.max(0.55, width)]} />
          <meshStandardMaterial color={colors.primary} roughness={0.58} metalness={0.02} />
        </mesh>
        {[-0.36, 0.36].map((xRatio) => (
          <mesh key={`bench-leg-${xRatio}`} position={[length * xRatio, 0.28, 0]} castShadow>
            <boxGeometry args={[0.1, 0.5, Math.max(0.12, width * 0.65)]} />
            <meshStandardMaterial color={colors.dark} roughness={0.42} metalness={0.14} />
          </mesh>
        ))}
        <mesh position={[0, 0.92, -width * 0.42]} castShadow>
          <boxGeometry args={[length, 0.14, 0.12]} />
          <meshStandardMaterial color={colors.secondary} roughness={0.58} metalness={0.02} />
        </mesh>
      </group>
    );
  }

  if (normalizedType === 'post') {
    return (
      <group>
        <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[Math.max(0.12, Math.min(length, width) * 0.18), Math.max(0.12, Math.min(length, width) * 0.18), 1.7, 18]} />
          <meshStandardMaterial color={colors.primary} {...materialProps} />
        </mesh>
        <mesh position={[0, 1.72, 0]} castShadow>
          <cylinderGeometry args={[Math.max(0.16, Math.min(length, width) * 0.22), Math.max(0.16, Math.min(length, width) * 0.22), 0.12, 18]} />
          <meshStandardMaterial color={colors.secondary} roughness={0.42} metalness={0.12} />
        </mesh>
      </group>
    );
  }

  if (normalizedType === 'tie_up_point') {
    return (
      <group>
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[Math.max(0.18, Math.min(length, width) * 0.24), Math.max(0.18, Math.min(length, width) * 0.24), 0.16, 20]} />
          <meshStandardMaterial color={colors.dark} roughness={0.42} metalness={0.16} />
        </mesh>
        <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[Math.max(0.22, Math.min(length, width) * 0.28), 0.035, 10, 24]} />
          <meshStandardMaterial color={colors.primary} roughness={0.34} metalness={0.22} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[Math.max(0.28, length * 0.72), 0.12, Math.max(0.16, width * 0.28)]} />
        <meshStandardMaterial color={colors.primary} {...materialProps} />
      </mesh>
      {[-1, 1].map((sign) => (
        <mesh key={`cleat-horn-${sign}`} position={[sign * length * 0.28, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, Math.max(0.34, width * 0.64), 12]} />
          <meshStandardMaterial color={colors.secondary} roughness={0.34} metalness={0.22} />
        </mesh>
      ))}
    </group>
  );
}
