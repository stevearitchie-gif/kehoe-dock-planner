export const sampleQuoteImportPayload = {
  quoteNumber: 'QUOTE-3D-TEST',
  customerName: 'Sample Quote Preview',
  floatingDock: {
    dockLengthFt: 20,
    dockWidthFt: 20,
    deckMaterial: 'pressure_treated_wood',
    tubeDiameterFt: 2,
  },
  ramp: {
    rampEnabled: true,
    rampType: 'ramp_with_rails',
    rampLengthFt: 24,
    rampWidthFt: 4,
    rampMaterial: 'aluminum',
  },
};

export const sampleQuoteImportPayloadText = JSON.stringify(sampleQuoteImportPayload, null, 2);
