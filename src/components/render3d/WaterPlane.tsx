import { useMemo } from 'react';
import { getSalesMaterialPalette } from '@/components/render3d/salesMaterials';
import type { RenderViewMode } from '@/components/render3d/types';

interface WaterPlaneProps {
  viewMode?: RenderViewMode;
}

const waterVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const waterFragmentShader = `
  uniform vec3 uBaseColor;
  uniform vec3 uDeepColor;
  uniform vec3 uHighlightColor;
  uniform float uOpacity;
  uniform float uCustomerMix;
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  float ripple(vec2 point, float scale, float strength) {
    float waveA = sin(point.x * scale + point.y * scale * 0.42);
    float waveB = sin(point.x * scale * 0.34 - point.y * scale * 0.78);
    return (waveA + waveB) * strength;
  }

  void main() {
    float broadDepth = smoothstep(0.08, 0.92, vUv.y);
    float fineRipple = ripple(vWorldPosition.xz, 1.45, 0.028) + ripple(vWorldPosition.xz + vec2(17.0, 5.0), 3.8, 0.012);
    float softSheen = smoothstep(0.68, 1.0, sin(vWorldPosition.x * 0.18 - vWorldPosition.z * 0.12) * 0.5 + 0.5) * 0.09 * uCustomerMix;
    vec3 waterColor = mix(uDeepColor, uBaseColor, broadDepth + fineRipple);
    waterColor = mix(waterColor, uHighlightColor, softSheen);
    gl_FragColor = vec4(waterColor, uOpacity);
  }
`;

export function WaterPlane({ viewMode = 'internal' }: WaterPlaneProps) {
  const isCustomerView = viewMode === 'customer';
  const water = getSalesMaterialPalette(viewMode).water;
  const uniforms = useMemo(
    () => ({
      uBaseColor: { value: water.baseColor },
      uDeepColor: { value: water.deepColor },
      uHighlightColor: { value: water.highlightColor },
      uOpacity: { value: water.opacity },
      uCustomerMix: { value: isCustomerView ? 1 : 0.35 },
    }),
    [isCustomerView, water.baseColor, water.deepColor, water.highlightColor, water.opacity],
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]} receiveShadow>
      <planeGeometry args={[146, 102, 48, 34]} />
      <shaderMaterial
        args={[
          {
            uniforms,
            vertexShader: waterVertexShader,
            fragmentShader: waterFragmentShader,
            transparent: true,
            depthWrite: false,
          },
        ]}
      />
    </mesh>
  );
}
