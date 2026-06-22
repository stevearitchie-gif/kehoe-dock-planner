import type { ProductConfiguration } from '@/components/render3d/productConfigTypes';

export const sampleQuoteProductConfigurations: ProductConfiguration[] = [
  {
    id: 'quote-floating-dock-20x20',
    source: 'quote',
    quoteLineItemId: 'sample-quote-line-floating-dock',
    productType: 'floating_dock',
    productFamily: 'kehoe_floating_dock',
    displayName: 'Floating Dock, 20 ft x 20 ft',
    quantity: 1,
    dimensions: {
      lengthFt: 20,
      widthFt: 20,
    },
    material: {
      deck: 'pressure_treated_wood',
      frame: 'steel',
      finish: 'standard',
    },
    floatingDock: {
      layout: 'single',
      sectionRole: 'main',
      tubeType: 'standard_steel',
      tubeDiameterFt: 2,
      tubeSpecificationText: '24" o.d. x 3/16" spiral welded steel floatation units',
    },
    layout: {
      xFt: 0,
      yFt: 0,
      rotationDeg: 0,
    },
    notes: {
      customerWording: 'Sample quote configuration for a 20 ft x 20 ft steel tube floating dock.',
    },
  },
  {
    id: 'quote-ramp-with-rails-24',
    source: 'quote',
    quoteLineItemId: 'sample-quote-line-ramp',
    productType: 'ramp_with_rails',
    productFamily: 'kehoe_ramp_with_rails',
    displayName: 'Aluminum Ramp With Rails, 4 ft x 24 ft',
    quantity: 1,
    dimensions: {
      lengthFt: 24,
      widthFt: 4,
    },
    material: {
      deck: 'composite_grey',
      frame: 'aluminum',
      finish: 'standard',
    },
    ramp: {
      hasRails: true,
      connectionPoint: 'Dock edge',
    },
    layout: {
      xFt: 0,
      yFt: 22,
      rotationDeg: 0,
      connectedToId: 'quote-floating-dock-20x20',
      connectionEdge: 'bottom',
    },
    notes: {
      customerWording: 'Sample quote configuration for a nominal 24 ft ramp with rails connected to the floating dock.',
    },
  },
];
