import type { ProductConfiguration } from '@/components/render3d/productConfigTypes';

export type QuoteImportRampType = 'ramp_with_rails' | 'ramp_without_rails';
export type QuoteImportDeckMaterial = 'pressure_treated_wood' | 'composite_grey';
export type QuoteImportRampMaterial = 'aluminum';

export interface NormalizedQuoteImportData {
  quoteId?: string;
  dockLengthFt: number;
  dockWidthFt: number;
  deckMaterial: QuoteImportDeckMaterial;
  tubeDiameterFt: number;
  rampEnabled: boolean;
  rampType: QuoteImportRampType;
  rampLengthFt: number;
  rampWidthFt: number;
  rampMaterial: QuoteImportRampMaterial;
}

export type QuoteImportResult =
  | {
      ok: true;
      configurations: ProductConfiguration[];
      normalized: NormalizedQuoteImportData;
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
      warnings: string[];
    };
