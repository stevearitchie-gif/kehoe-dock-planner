# Quote Builder to 3D Data Mapping Spec

## Purpose

Define how the Kehoe Residential Quote Builder can feed the Dock Planner 3D render workflow without coupling the renderer to raw quote rows.

Recommended architecture:

`QuoteLineItem -> ProductConfiguration -> 3D component props`

Where layout is needed:

`ProductConfiguration -> DockObject -> existing project-data 3D render`

This document is an investigation and mapping spec only. It does not implement the integration.

## Source Files Reviewed

Quote Builder folder:

`C:\Users\SteveR\Documents\Kehoe Custom Quote Wording Builder`

Reviewed files:

- `package.json`
- `src/App.tsx`
- `src/quoteWording.ts`
- `src/floatingDock.ts`
- `src/ramp.ts`
- `src/boatLift.ts`
- `src/data/boatLiftCatalog.ts`
- `src/services/googleSheetsExport.ts`
- `apps-script/README.md`
- `apps-script/Code.gs`

Dock Planner files referenced:

- `src/types/dock.ts`
- `src/components/render3d/projectModelAdapter.ts`

Ignored/generated folders observed in the quote builder folder:

- `.firebase`
- `.git`
- `.pnpm-store`
- `dist`
- `node_modules`

The Dock Planner `.gitignore` already ignores `local-reference/`, so `local-reference/quote-builder` would be ignored if reference files are copied later.

## System Type

The quote builder appears to be:

- A React/Vite/TypeScript app.
- A browser-local draft tool using `localStorage`.
- A Google Sheets/PDF export workflow using an Apps Script web app.
- Firebase Hosting is present for hosting/deployment, but quote records are not stored in Firebase in the inspected code.
- GoHighLevel appears only as an internal opportunity reference field; no direct GoHighLevel API integration was found in the inspected code.

## Quote Storage and Generation

### Draft Storage

Working quote drafts are saved in browser `localStorage` under:

`kehoe-residential-quote-builder-draft`

The saved draft includes:

- `quoteInfo`
- `quoteStatus`
- `quoteLineItems`
- `form`
- `weatherPlanDraft`
- `anchorsDraft`
- `deliveryDraft`
- `anchorDetails`
- `deliveryDetails`
- `issueOverrides`

The richest product configuration data is in `form`, not in the final exported Google Sheet rows.

### Export Generation

The app builds a `QuoteExportPayload` and posts it to an Apps Script endpoint configured by:

- `VITE_QUOTE_EXPORT_WEB_APP_URL`
- `VITE_QUOTE_EXPORT_TOKEN`

The Apps Script:

- Copies a residential quote master spreadsheet.
- Writes quote header data.
- Writes line items into the `Contract` sheet.
- Writes payment terms.
- Creates a PDF export.
- Saves generated Sheets/PDFs in Drive quote-number folders.

The exported payload contains line item wording and pricing, but not enough structured geometry data for reliable 3D.

## Current Quote Data Structures

### QuoteFormState

`QuoteFormState` is the main input state for product-specific configuration.

Important sections:

- `floatingDock`
- `ramp`
- `boatLift`
- `dimensions`
- `customItemType`
- `scopeAction`
- `constructionDetails`
- `verticalStaving`
- `customNotes`
- `removalDisposal`
- Other non-3D or later-phase scopes such as shoreline work, dredging, weed harvesting, permits, boathouse work, boat port, pile work, concrete work, and dock repair.

### QuoteLineItem

Quote line items are generated from the form and customer wording.

Current fields include:

- `id`
- `parentId`
- `lineLabel`
- `itemType`
- `itemTitle`
- `standardGeneratedWording`
- `customerWording`
- `dimensions`
- `quantity`
- `price`
- `rate`
- `isHourlyRate`
- `calculatedPrice`
- `manualOverridePrice`
- `manualPrice`
- `pricingStatus`
- `pricingBreakdown`
- `isCustomSizeOverride`
- `customSections`
- `manualShapeAddInPrice`
- `manualPricingNote`
- `pricingWarnings`
- `pricingBasis`
- `requiresDescriptionReview`
- `requiresPriceReview`
- `relatedItemIds`
- `classification`
- `includedInBaseTotal`
- `optionGroupName`
- `optionGroupId`
- `isAlternativeOption`
- `paymentTermsCategory`
- `paymentTermsTreatment`
- `paymentTermsPercentages`
- `paymentTermsText`
- `internalNotes`

`QuoteLineItem.id` is generated with `crypto.randomUUID()`, so it is stable within the saved quote draft and exported payload, but it is not a product catalog identifier.

## Product Representation

### Floating Dock

Quote item type:

`Floating Dock`

Input state:

`form.floatingDock`

Fields available:

- `layout`: `Single Dock`, `L Dock`, `T Dock`, `U Dock`
- `useCustomSizeOverride`
- `mainWidth`
- `mainLength`
- `returnWidth`
- `returnLength`
- `tHeadWidth`
- `tHeadLength`
- `secondTHeadWidth`
- `secondTHeadLength`
- `leftFingerWidth`
- `leftFingerLength`
- `rightFingerWidth`
- `rightFingerLength`
- `sandblastEpoxyPaintUpgrade`
- `truNorthDeckingUpgrade`
- `steelTubeSpecificationType`: `Standard` or `Alternate size / custom specification`
- `customSteelTubeSpecification`
- `manualPriceOverride`
- `manualPrice`
- `manualShapeAddInPrice`
- `manualPricingNote`
- `internalNotes`

Standard floating dock dimensions are selected from:

- Widths: `6`, `8`, `10`
- Lengths: `16`, `20`, `24`, `30`, `40`, `50`, `60`

Current wording confirms the default standard tube spec:

`24" o.d. x 3/16" spiral welded steel floatation units`

3D usefulness:

- Strong enough for standalone section previews.
- Strong enough to create one or more simple `floating_dock` `DockObject` records if a default layout algorithm is added.
- Not enough to perfectly match customer layout without placement and connection rules.

### Ramp

Quote item type:

`Ramp`

Input state:

`form.ramp`

Fields available:

- `pricingType`: `Standard ramp` or `Custom / pro-rated ramp`
- `width`
- `length`
- `customWidth`
- `customLength`
- `manualPrice`
- `internalPricingNote`
- `restsOnPatioStones`
- `includeTruNorthDeckingUpgrade`
- `includeSandblastEpoxyPaintUpgrade`
- `pvcDeckingManualOverride`
- `pvcDeckingUpgradePrice`
- `sandblastEpoxyPaintManualOverride`
- `sandblastEpoxyPaintUpgradePrice`
- `connectionPoint`
- `deckingType`
- `options`
- `price`
- `internalNotes`

Standard ramp dimensions are selected from:

- Widths: `4`, `5`
- Lengths: `12`, `16`, `20`, `24`, `30`

Current generated wording always describes a ramp with handrails:

`Ramp is complete with 1-1/2" x 1-1/2" painted steel handrails.`

3D usefulness:

- Strong enough for a standalone Kehoe ramp-with-rails preview.
- Strong enough for a rough `ramp_with_rails` `DockObject`.
- Not enough to know exact attachment edge, rotation, dock connection target, or shore direction unless layout fields are added.

### Boat Lift

Quote item type:

`Boat Lift`

Input state:

`form.boatLift`

Fields available:

- `modelId`
- `pricingBasis`
- `quantity`
- `manualPriceOverride`
- `manualPrice`
- `manualPricingNote`
- `customCustomerNote`
- `modelSearch`
- `accessorySearch`
- `accessories`: `accessoryId`, `quantity`
- `liftType`
- `capacity`
- `installationNotes`
- `electricalNotes`
- `options`
- `price`
- `internalNotes`

Catalog source:

`src/data/boatLiftCatalog.ts`

Catalog model fields:

- `id`
- `category`
- `modelName`
- `description`
- `descriptionLines`
- `prices`
- `requiresDescriptionReview`
- `requiresPriceReview`

Accessory fields:

- `id`
- `category`
- `name`
- `notes`
- `price`
- `installedRiver`
- `installedLake`
- `fobKehoe`
- `defaultQuantity`
- `requiresPriceReview`

3D usefulness:

- Boat lifts have stable catalog IDs and names.
- Existing catalog descriptions often include capacity and broad product type.
- Exact 3D dimensions are not present. The 3D render would need default placeholder sizes by category/model, or catalog dimension fields added.

### Custom Items

Custom item types include:

- `Stationary Dock`
- `Shoreline Work`
- `Boathouse Work`
- `Boat Port`
- `Crib Removal`
- `Pile Work`
- `Concrete Work`
- `Dock Repair`
- `Custom Fabrication`
- `Dredging`
- `Weed Harvesting`
- `Permits and Applications`
- `Other Custom Scope`

Generic dimension fields:

- `form.dimensions.width`
- `form.dimensions.length`
- `form.dimensions.height`
- `form.dimensions.sameAsExisting`
- `form.dimensions.irregularShape`
- `form.dimensions.customNote`

3D usefulness:

- `Stationary Dock` can potentially map to a simple `stationary_dock` placeholder if dimensions exist.
- Most other custom scopes should not auto-render until explicit product type and geometry rules are added.
- `customerWording` is useful for display, but should not be parsed as the primary 3D source.

## Field Availability Matrix

| Field | Floating Dock | Ramp | Boat Lift | Custom / Stationary Dock | Notes |
|---|---|---|---|---|---|
| Stable quote line ID | Yes | Yes | Yes | Yes | `QuoteLineItem.id`, generated UUID. |
| Product type | Yes | Yes | Yes | Partial | `itemType` / `customItemType`. Needs canonical enum. |
| Product catalog ID | No | No | Yes | No | Boat lift `modelId`; accessories have `accessoryId`. |
| SKU | No | No | No | No | Add if needed for catalog sync. |
| Item name/title | Yes | Yes | Yes | Yes | `itemTitle`. |
| Length | Yes | Yes | No | Partial | Floating dock sections and ramp selections. |
| Width | Yes | Yes | No | Partial | Floating dock sections and ramp selections. |
| Height | No | No | No | Partial | Generic custom dimension only. |
| Quantity | Mostly 1 | Mostly 1 | Yes | Yes | Boat lift quantity is explicit. |
| Material | Partial | Partial | Partial | Partial | Often represented in wording/options, not normalized. |
| Finish | Partial | Partial | No | Partial | Sandblast/epoxy and Tru North flags exist. |
| Rail option | No explicit toggle | Implicit yes | N/A | No | Ramp wording assumes rails. |
| Tube type | Yes | N/A | N/A | N/A | Standard vs alternate tube specification. |
| Tube diameter | Yes for standard | N/A | N/A | N/A | Standard text implies 24 in diameter. Alternate is free text. |
| Options | Yes | Yes | Yes | Yes | Not normalized consistently. |
| Position | No | No | No | No | Required for layout scenes. |
| Rotation | No | No | No | No | Required for Dock Planner layout. |
| Attachment/connection | No | Weak | No | No | Ramp `connectionPoint` exists but is not populated in visible UI. |

## Proposed Shared ProductConfiguration

```ts
type ProductConfigurationSource = "quote" | "dock_planner" | "manual";

type ProductConfigurationType =
  | "floating_dock"
  | "stationary_dock"
  | "ramp_with_rails"
  | "ramp_without_rails"
  | "boat_lift"
  | "custom";

type ProductConfiguration = {
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
    deck?: "pressure_treated_wood" | "tru_north_pvc" | "composite_grey" | "composite_brown" | "unknown";
    frame?: "steel" | "painted_steel" | "aluminum" | "unknown";
    finish?: "standard" | "sandblast_epoxy_paint" | "unknown";
  };
  floatingDock?: {
    layout?: "single" | "l" | "t" | "u";
    sectionRole?: "main" | "return" | "t_head" | "second_t_head" | "left_finger" | "right_finger";
    tubeType?: "standard_steel" | "alternate";
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
    connectionEdge?: "top" | "right" | "bottom" | "left";
  };
  notes?: {
    customerWording?: string;
    internalNotes?: string;
    warnings?: string[];
  };
};
```

## QuoteLineItem to ProductConfiguration

### Preferred Source

Use the quote builder draft `form` plus generated `quoteLineItems`.

Reason:

- `QuoteLineItem.dimensions` is a formatted string.
- `QuoteLineItem.customerWording` is prose.
- The export payload does not include the nested form selections.
- The `form` object has structured dimensions/options.

### Floating Dock Mapping

For each section returned by `getFloatingDockSections(form.floatingDock)`:

- `id`: new product config ID or `${quoteLineItem.id}:${section.label}`
- `quoteLineItemId`: parent floating dock line item ID
- `productType`: `floating_dock`
- `productFamily`: `kehoe_floating_dock`
- `displayName`: section label
- `dimensions.widthFt`: section width
- `dimensions.lengthFt`: section length
- `quantity`: 1
- `material.deck`: `tru_north_pvc` when `truNorthDeckingUpgrade` is true, otherwise `pressure_treated_wood`
- `material.frame`: `painted_steel` when `sandblastEpoxyPaintUpgrade` is true, otherwise `steel`
- `material.finish`: `sandblast_epoxy_paint` when selected, otherwise `standard`
- `floatingDock.layout`: normalized layout
- `floatingDock.sectionRole`: normalized section label
- `floatingDock.tubeType`: `standard_steel` or `alternate`
- `floatingDock.tubeDiameterFt`: `2` for standard tube specification
- `floatingDock.tubeSpecificationText`: standard or custom tube text

### Ramp Mapping

For a ramp quote line:

- `id`: quote line item ID or new config ID
- `quoteLineItemId`: quote line item ID
- `productType`: `ramp_with_rails`
- `productFamily`: `kehoe_ramp_with_rails`
- `displayName`: quote item title
- `dimensions.widthFt`: selected standard width or custom width
- `dimensions.lengthFt`: selected standard length or custom length
- `quantity`: 1
- `material.deck`: `tru_north_pvc` when `includeTruNorthDeckingUpgrade` is true, otherwise `pressure_treated_wood`
- `material.frame`: `painted_steel` when `includeSandblastEpoxyPaintUpgrade` is true, otherwise `steel`
- `material.finish`: `sandblast_epoxy_paint` when selected, otherwise `standard`
- `ramp.hasRails`: `true`
- `ramp.restsOnPatioStones`: from quote state
- `ramp.connectionPoint`: from quote state, once it is populated

Note: the current quote builder appears to model the standard residential ramp as a ramp with handrails. It does not expose a rail/no-rail choice.

### Boat Lift Mapping

For a boat lift quote line:

- `id`: quote line item ID or new config ID
- `quoteLineItemId`: quote line item ID
- `productType`: `boat_lift`
- `productFamily`: `golden_boat_lift` or `boat_lift_placeholder`
- `productModelId`: `form.boatLift.modelId`
- `displayName`: selected catalog `modelName`
- `quantity`: parsed boat lift quantity
- `boatLift.category`: catalog category
- `boatLift.modelName`: catalog model name
- `boatLift.capacityLbs`: inferred from model name where possible until a structured field is added
- `boatLift.accessories`: selected accessory IDs/names/quantities

This can produce a recognizable placeholder, but accurate dimensions require model dimension fields.

### Custom and Stationary Dock Mapping

For `Stationary Dock`:

- `productType`: `stationary_dock`
- Use generic `form.dimensions.width`, `length`, and `height` when present.
- Use `constructionDetails`, `verticalStaving`, and `customNotes` as non-geometry notes.

For unsupported custom items:

- Map to `custom` product configuration with notes only.
- Do not auto-render as geometry unless a specific component and dimension mapping exists.

## ProductConfiguration to 3D Component Props

### Floating Dock

Target component:

`KehoeFloatingDock`

Props can be derived from:

- `lengthFt`
- `widthFt`
- `deckMaterial`
- `frameMaterial`
- `tubeDiameterFt`
- `tubeSpecificationText`
- `customerView`

When rendering without Dock Planner layout, arrange sections using a simple layout generator based on `floatingDock.layout` and `sectionRole`.

### Ramp With Rails

Target component:

`KehoeRampWithRails`

Props can be derived from:

- `lengthFt`
- `widthFt`
- `deckMaterial`
- `frameMaterial`
- `finish`
- `hasRails`
- `restsOnPatioStones`

For standalone preview, use a default modest slope and a simple dock-end plate.

For Dock Planner project render, continue using calculated placement, slope, dock connection, trim, and rail direction from the project adapter/render layer.

### Boat Lift

Target component:

Current simple boat lift placeholder.

Props can be derived from:

- `category`
- `modelName`
- `capacityLbs`
- `accessories`

Missing model dimensions should trigger default placeholder sizes by category.

## ProductConfiguration to DockObject

Use this only when a quote needs to create or seed a Dock Planner layout.

Dock Planner `DockObject` requires:

- `id`
- `type`
- `x`
- `y`
- `width`
- `height`
- `rotation`
- `label`
- `color`
- `zIndex`
- `locked`
- optional `metadata`

Suggested mapping:

```ts
function productConfigurationToDockObject(
  config: ProductConfiguration,
  layout: Required<ProductConfiguration["layout"]>,
  pixelsPerFoot: number,
): DockObject
```

Rules:

- `floating_dock`: `width = lengthFt * pixelsPerFoot`, `height = widthFt * pixelsPerFoot`
- `stationary_dock`: same footprint convention as floating dock
- `ramp_with_rails`: `width = lengthFt * pixelsPerFoot`, `height = widthFt * pixelsPerFoot`, matching the existing Dock Planner ramp footprint convention
- `boat_lift`: use configured or default footprint dimensions
- `x/y/rotation`: must come from explicit layout metadata, not pricing data
- `metadata.material`: deck/finish value
- `metadata.modelType3D`: product family/model

If no layout is provided, do not create final DockObjects automatically. Generate a draft layout only with a visible "needs layout review" status.

## Fields Usable Immediately

- Floating dock layout and section dimensions.
- Floating dock standard tube type and 24 inch tube diameter.
- Floating dock Tru North decking upgrade.
- Floating dock sandblast/epoxy paint upgrade.
- Ramp standard/custom width and length.
- Ramp implicit rail presence.
- Ramp rests-on-patio-stones option.
- Ramp Tru North decking upgrade.
- Ramp sandblast/epoxy paint upgrade.
- Boat lift model ID.
- Boat lift model name.
- Boat lift category.
- Boat lift quantity.
- Boat lift accessories.
- Quote line item ID, parent ID, title, wording, classification, and pricing status.

## Missing Fields for Reliable 3D

Add these before relying on quote-to-3D as a customer-facing workflow:

- Canonical product type enum stored on quote items.
- Product family/component ID, such as `kehoe_floating_dock` or `kehoe_ramp_with_rails`.
- SKU or catalog ID for floating docks and ramps.
- Explicit unit for every dimension.
- Normalized material and finish fields instead of relying on wording.
- Explicit ramp rail option, even if the default is rails.
- Ramp dock connection target and connection edge.
- Ramp shore/lower-end direction.
- Layout position and rotation when generating a scene.
- Floating dock section connection rules for L, T, and U layouts.
- Floating dock tube count and tube centerline placement if it varies by width/length.
- Boat lift length, width, height, cradle dimensions, and water/deck placement assumptions.
- Boat lift accessory geometry flags.
- Custom item renderability flag.
- Version field for quote/product configuration schema.

## Standalone 3D Preview Feasibility

Quote data can generate standalone 3D product previews now for:

- Floating dock sections.
- Ramp with rails.
- Boat lift placeholders.

Limitations:

- It cannot accurately render the full customer site layout without layout metadata.
- It cannot know where a ramp attaches to a dock unless that relationship is captured.
- It cannot place boat lifts relative to docks without position/connection fields.
- It should not parse customer wording as geometry except as a fallback or warning source.

## Direct Dock Planner Object Creation Feasibility

Quote data can create draft Dock Planner objects, but only with assumptions.

Good candidate:

- A single floating dock can become one `floating_dock` object.
- A ramp can become one `ramp_with_rails` object.

Needs layout logic:

- L dock, T dock, and U dock section arrangement.
- Ramp attachment to a specific dock edge.
- Boat lift location.

Recommended behavior:

- Create a draft Dock Planner project from quote configuration.
- Mark it as approximate.
- Require a user to review placement before using it as final customer layout.

## Recommended First Integration Step

Add a shared `ProductConfiguration` model to the Dock Planner codebase, then build a pure adapter in the quote builder or shared package:

`QuoteFormState + QuoteLineItem[] -> ProductConfiguration[]`

First preview target:

- Standalone quote-to-3D product preview.
- Start with one floating dock section and one ramp-with-rails product preview.
- Do not create Dock Planner `DockObject` records yet.

This lets the team validate dimensions, materials, tube defaults, rail defaults, and product visuals without introducing layout risk.

## Recommended Long-Term Integration Path

1. Add normalized product configuration fields to the quote builder.
2. Include `productConfigurations` in the quote draft/export payload.
3. Let the 3D renderer consume `ProductConfiguration[]` directly for standalone previews.
4. Add an optional quote-to-layout wizard that converts selected `ProductConfiguration` records into `DockObject` records.
5. Store any confirmed Dock Planner layout as the authoritative source for assembled 3D scenes.
6. Keep quote pricing/wording and 3D geometry connected by stable IDs, not by parsing text.

## Risks and Assumptions

- The quote builder source is outside the Dock Planner repo, so this spec is based on local inspection only.
- `QuoteLineItem.id` is stable within a saved draft/export, but not a catalog ID.
- The exported Google Sheet payload is too thin for reliable 3D unless product configuration data is added.
- Floating dock and ramp products currently lack SKU/product IDs.
- Ramp rail presence is implied by wording, not selected as structured data.
- Boat lift catalog IDs are strong, but dimensions are missing.
- Layout cannot be inferred safely from quote pricing alone.
- Customer wording may be manually edited, so it should not be treated as authoritative geometry data.
- Browser `localStorage` draft storage is not a durable shared source for cross-app integration.

