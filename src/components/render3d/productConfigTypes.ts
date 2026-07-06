export type ProductConfigurationSource = 'quote' | 'dock_planner' | 'manual';

export type ProductConfigurationType =
  | 'floating_dock'
  | 'stationary_dock'
  | 'ramp_with_rails'
  | 'ramp_without_rails'
  | 'boat_lift'
  | 'boat_port'
  | 'custom';

export interface ProductConfiguration {
  id: string;
  source: ProductConfigurationSource;
  sourceItemId?: string;
  quoteLineItemId?: string;
  parentQuoteLineItemId?: string;
  productType: ProductConfigurationType;
  productFamily?: string;
  productModelId?: string;
  sku?: string;
  displayName: string;
  quantity: number;
  dimensions?: {
    lengthFt?: number;
    widthFt?: number;
    heightFt?: number;
  };
  material?: {
    deck?: 'pressure_treated_wood' | 'tru_north_pvc' | 'composite_grey' | 'composite_brown' | 'unknown';
    frame?: 'steel' | 'painted_steel' | 'aluminum' | 'unknown';
    finish?: 'standard' | 'sandblast_epoxy_paint' | 'unknown';
  };
  floatingDock?: {
    layout?: 'single' | 'l' | 't' | 'u';
    sectionRole?: 'main' | 'return' | 't_head' | 'second_t_head' | 'left_finger' | 'right_finger';
    tubeType?: 'standard_steel' | 'alternate';
    tubeDiameterFt?: number;
    tubeSpecificationText?: string;
  };
  ramp?: {
    hasRails: boolean;
    restsOnPatioStones?: boolean;
    deckingUpgrade?: boolean;
    connectionPoint?: string;
  };
  boatLift?: {
    category?: string;
    modelName?: string;
    capacityLbs?: number;
    accessories?: Array<{ accessoryId: string; name: string; quantity: number }>;
  };
  pricing?: {
    classification?: string;
    priceText?: string;
    calculatedPriceText?: string;
  };
  layout?: {
    xFt?: number;
    yFt?: number;
    rotationDeg?: number;
    connectedToId?: string;
    connectionEdge?: 'top' | 'right' | 'bottom' | 'left';
  };
  notes?: {
    customerWording?: string;
    internalNotes?: string;
    warnings?: string[];
  };
}
