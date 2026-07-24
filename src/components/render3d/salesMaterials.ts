import type { DeckFinish, RenderViewMode } from '@/components/render3d/types';

export interface RenderMaterialPreset {
  color: string;
  roughness: number;
  metalness: number;
}

export interface SalesMaterialPalette {
  water: {
    baseColor: [number, number, number];
    deepColor: [number, number, number];
    highlightColor: [number, number, number];
    opacity: number;
  };
  land: RenderMaterialPreset & {
    transitionColor: string;
    edgeColor: string;
  };
  deck: Record<DeckFinish | 'cedar', RenderMaterialPreset> & {
    seam: string;
  };
  composite: RenderMaterialPreset;
  aluminum: RenderMaterialPreset & {
    darkColor: string;
  };
  darkMetal: RenderMaterialPreset;
  float: RenderMaterialPreset & {
    endColor: string;
  };
  roof: RenderMaterialPreset & {
    edgeColor: string;
  };
  fastener: RenderMaterialPreset;
}

export function getSalesMaterialPalette(viewMode: RenderViewMode): SalesMaterialPalette {
  const isCustomer = viewMode === 'customer';

  return {
    water: {
      baseColor: isCustomer ? [0.37, 0.7, 0.78] : [0.29, 0.61, 0.69],
      deepColor: isCustomer ? [0.16, 0.43, 0.56] : [0.16, 0.42, 0.52],
      highlightColor: isCustomer ? [0.74, 0.9, 0.93] : [0.58, 0.78, 0.84],
      opacity: isCustomer ? 0.72 : 0.54,
    },
    land: {
      color: isCustomer ? '#d2c096' : '#c6b27f',
      transitionColor: isCustomer ? '#bba879' : '#a99767',
      edgeColor: isCustomer ? '#2f5361' : '#0f766e',
      roughness: 0.86,
      metalness: 0,
    },
    deck: {
      'pressure-treated': {
        color: isCustomer ? '#ad7b4b' : '#9a8f63',
        roughness: isCustomer ? 0.82 : 0.78,
        metalness: 0,
      },
      cedar: {
        color: isCustomer ? '#b97743' : '#b57943',
        roughness: isCustomer ? 0.78 : 0.74,
        metalness: 0,
      },
      'composite-grey': {
        color: isCustomer ? '#a9afab' : '#8d99a6',
        roughness: isCustomer ? 0.58 : 0.54,
        metalness: 0.02,
      },
      'composite-brown': {
        color: isCustomer ? '#8e6545' : '#8a5f3d',
        roughness: isCustomer ? 0.58 : 0.54,
        metalness: 0.02,
      },
      seam: isCustomer ? '#7b5636' : '#475569',
    },
    composite: {
      color: isCustomer ? '#9fa8a6' : '#8d99a6',
      roughness: 0.56,
      metalness: 0.02,
    },
    aluminum: {
      color: isCustomer ? '#e4ecee' : '#cbd5e1',
      darkColor: isCustomer ? '#b2bec3' : '#94a3b8',
      roughness: isCustomer ? 0.28 : 0.34,
      metalness: isCustomer ? 0.36 : 0.3,
    },
    darkMetal: {
      color: isCustomer ? '#39434a' : '#334155',
      roughness: 0.46,
      metalness: 0.18,
    },
    float: {
      color: isCustomer ? '#2c2119' : '#334155',
      endColor: isCustomer ? '#3a2b21' : '#475569',
      roughness: 0.5,
      metalness: 0.14,
    },
    roof: {
      color: isCustomer ? '#eef4f7' : '#bfdbfe',
      edgeColor: isCustomer ? '#c8d5db' : '#1d4ed8',
      roughness: isCustomer ? 0.38 : 0.44,
      metalness: isCustomer ? 0.08 : 0.04,
    },
    fastener: {
      color: isCustomer ? '#e3e8ea' : '#f8fafc',
      roughness: 0.26,
      metalness: 0.34,
    },
  };
}
