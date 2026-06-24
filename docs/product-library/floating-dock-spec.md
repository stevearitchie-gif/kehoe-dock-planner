# Kehoe 3D Product Library - Floating Dock Spec

## Product Name

Kehoe Floating Dock.

Phase 1B target: a parametric floating dock component that can represent Kehoe wood-deck and composite-deck floating dock sections in the 3D project render.

## Current Implementation Status

- Implemented as `src/components/render3d/products/KehoeFloatingDock.tsx`.
- Used for `floating_dock` elements in saved project renders and ProductConfiguration quote previews.
- Preserves the 2D footprint, center, rotation, length, and width supplied by the project or quote adapter.
- Supports pressure-treated, TruNorth/PVC/composite grey, and composite brown visual finishes through `DeckFinish` mapping.
- Renders a deck slab, deck board detail, perimeter fascia, rub strip, cross members, 24 inch default round tube pontoons, side fasteners, connection plates, and customer-view cleats.
- Stationary docks intentionally remain outside the product-library scope for now and continue using generic platform geometry.

## Target Scope For Next Implementation

- Keep the component fully parametric and lightweight.
- Refine the existing sales visual rather than importing CAD.
- Confirm standard tube centerlines, frame/fascia depth, deck board direction, and connection plate positions before making geometry claims.
- Add optional spud sleeves, chain pockets, and connection hardware only after confirmed reference dimensions are available.

## Supported Dimensions And Options

- `footprintWidthFt` and `footprintLengthFt` from the 2D project/quote footprint.
- `tubeDiameterFt`, defaulting to 2 ft for the standard 24 inch steel flotation tube.
- `deckFinish`: pressure treated, composite grey/TruNorth PVC, composite brown, and cedar-compatible placeholder.
- Customer/Internal view material differences.

## Visual Rules

- The component must stay inside the source 2D footprint in Top View.
- Pontoons should sit below the deck/fascia and remain visible from side and angled Customer View.
- Deck detail should read as board/tread lines without becoming too visually noisy.
- Internal View footprint outlines and diagnostics are owned by `ProjectDockModel`, not by the product component.

## Material Rules

- Pressure-treated decks use warmer wood colours with subtle plank variation.
- TruNorth/PVC/composite decks use cooler grey/tan values with cleaner, flatter plank highlights.
- Steel tubes use dark muted metal colours.
- Hardware uses satin galvanized/aluminum colours.

## Source Files Reviewed

Local reference folder:

`local-referencefloating-dock`

Reviewed directly or inventoried:

- `FLOATING DOCK - WOOD/DOCK-ASSEMBLY.SLDASM`
- `FLOATING DOCK - WOOD LONG/DOCK-ASSEMBLY.SLDASM`
- `FLOATING DOCK - WOOD/FRAME.SLDASM`
- `FLOATING DOCK - WOOD LONG/FRAME.SLDASM`
- `FLOATING DOCK - WOOD/TUBE-SUBASSY.SLDASM`
- `FLOATING DOCK - WOOD LONG/TUBE-SUBASSY.SLDASM`
- `FLOATING DOCK - WOOD/WOOD DECK.SLDPRT`
- `FLOATING DOCK - WOOD LONG/WOOD DECK.SLDPRT`
- `FLOATING DOCK - WOOD/Q-DECK.SLDPRT`
- `FLOATING DOCK - WOOD/Q-DECK2.SLDPRT`
- `FLOATING DOCK - WOOD/Q-DECK3.SLDPRT`
- `FLOATING DOCK - WOOD LONG/80 FOOT FLOATING DOCK.SLDDRW`
- `FLOATING DOCK - WOOD/IVYLEA-RESTAURANT-FLOATING DOCK.SLDDRW`
- `FLOATING DOCK - WOOD LONG/IVYLEA-RESTAURANT-FLOATING DOCK.SLDDRW`
- `KEHOE STANDARD T SECTION/KEHOE STANDARD T-SECTION.dwg`
- `KEHOE STANDARD T SECTION/KEHOE STANDARD T-SECTION - REV 0 - SHEET 1 OF 4.pdf`
- `KEHOE STANDARD T SECTION/KEHOE STANDARD T-SECTION - REV 0 - SHEET 2 OF 4.pdf`
- `KEHOE STANDARD T SECTION/KEHOE STANDARD T-SECTION - REV 0 - SHEET 3 OF 4.pdf`
- `KEHOE STANDARD T SECTION/KEHOE STANDARD T-SECTION - REV 0 - SHEET 4 OF 4.pdf`
- `FLOATING DOCK - WOOD/ROUND TUBE BOUYANCY CALC.xls`
- `FLOATING DOCK - WOOD LONG/ROUND TUBE BOUYANCY CALC.xls`
- `FLOATING DOCK - WOOD/COUNTER WEIGHT CALCULATOR.xls`
- `FLOATING DOCK - WOOD LONG/COUNTER WEIGHT CALCULATOR.xls`
- Representative photos:
  - `Floating Docks/8x40.jpg`
  - `Floating Docks/Composite Floater.jpg`
  - `Floating Docks/Floating Dock with Spuds 2.jpg`
  - `Floating Docks/Composite Floater with Aluminum Ramp.jpg`

Notes:

- The SolidWorks assemblies and part files were present but not opened in SolidWorks during this pass.
- The T-section PDFs did not expose extractable text in the local tooling, so drawing dimensions need manual CAD/PDF review.
- The `.xls` calculators are old Excel files. They were not opened as spreadsheets in this environment, but string scanning confirms fields for tube diameter, number of tubes, tube length, dock length, dock width, dead weight, counterweight, sonotube diameter, and sonotube cut length.
- The DWG is a full AutoCAD drawing file (`AC1024`) but was not opened in CAD during this pass.

## Known Dimensions

| Dimension | Value | Status | Source / Notes |
|---|---:|---|---|
| Common section width | 8 ft | Inferred | Photo filename `8x40.jpg`; common saved product size should be confirmed. |
| Common section length | 40 ft | Inferred | Photo filename `8x40.jpg`; likely standard/common section. |
| Long assembly length | 80 ft | Inferred from drawing filename | `80 FOOT FLOATING DOCK.SLDDRW`; may represent full dock assembly, not one modular section. |
| T-section layout | Present | Confirmed source availability | `KEHOE STANDARD T-SECTION` DWG and 4 PDF sheets. Exact dimensions require CAD/PDF visual review. |
| Deck type | Wood and composite options | Confirmed visually / source structure | `WOOD DECK.SLDPRT`, `Q-DECK*.SLDPRT`, wood photos, composite photos. |
| Deck board direction | Across dock width in visible wood reference; composite/ramp photos show board-line direction by installation | Inferred from photos | `8x40.jpg` shows boards running side-to-side across the dock width. |
| Pontoon / float type | Large round tubes running lengthwise | Inferred from photos and source names | `TUBE.SLDPRT`, `TUBE-SUBASSY.SLDASM`, `ROUND TUBE BOUYANCY CALC.xls`, and `8x40.jpg`. |
| Number of tubes | Likely 2 primary side tubes | Inferred from photos | `8x40.jpg` shows large round tubes below both long sides. Confirm exact layout. |
| Tube diameter | Not confirmed | Missing | Calculator includes `TUBE DIAMETER`; exact value needs spreadsheet/CAD confirmation. |
| Tube spacing | Approximately near long side edges | Inferred | Based on photos; exact centerline spacing needs CAD confirmation. |
| Frame depth / fascia depth | Not confirmed | Missing / inferred | Photos show substantial timber/side fascia depth; component should expose as prop. |
| Deck thickness | Not confirmed | Missing / inferred | Use visual default around 0.18-0.25 ft until CAD confirms. |
| Fascia / side frame | Present | Confirmed visually | Photos show perimeter side boards/fascia, dark rub line, fasteners. |
| Cross tubes / cross members | Present | Confirmed source availability | `CROSS-TUBE.SLDPRT`, `END-FRAME.SLDPRT`, `FRAME.SLDASM`. |
| Connection plates | Present | Confirmed source availability | `MOUNTPLATE.SLDPRT`, `FISH-PLATE.SLDPRT`, `CENTER-PLATE.SLDPRT`, `SIDE-PLATE.SLDPRT`, `ENDPLATE.SLDPRT`, `STAT-PLATE.SLDPRT`. |
| Chain pockets / pin hardware | Present | Confirmed source availability | `CHAIN-POCKET-TUBE.SLDPRT`, `PIN.SLDPRT`, `PIPE.SLDPRT`, `HITCH-PIN-CLIP.SLDPRT`. |
| Counterweight / concrete elements | Present in source files | Confirmed source availability | `COUNTERWEIGHT.SLDASM`, `COUNTERWEIGHT-CONCRETE-FILL.SLDPRT`, `CONCRETE.SLDPRT`, calculators. |
| Spud details | Visible in some photos / source should be checked | Inferred | `Floating Dock with Spuds 2.jpg` likely useful. Exact spud bracket geometry needs confirmation. |

## Confirmed vs Inferred Dimensions

Confirmed from source inventory:

- SolidWorks assemblies exist for dock assembly, frame, tube subassembly, bumper, ramp assembly, counterweight, and long variants.
- SolidWorks parts exist for tube, cross tube, wood deck, Q-deck, stringers, staves, end frame, plates, chain pocket tube, pin, pipe, saddle, rubber, concrete, and counterweight elements.
- Four PDF sheets and a DWG exist for a Kehoe standard T-section.
- Buoyancy and counterweight calculator files exist.
- Photos show wood and composite floating dock variants.

Inferred from filenames/photos/source structure:

- A common product size appears to include 8 ft x 40 ft sections.
- A longer 80 ft floating dock assembly exists or was drawn.
- Primary float support appears to be two large round tubes/pontoons running lengthwise.
- Deck boards on the wood dock run across the dock width.
- Composite deck products use cleaner grey/tan deck boards and a lower, more finished fascia appearance.
- Side fascia includes visible fasteners and a dark horizontal rub/break line.

Not confirmed yet:

- Exact tube diameter.
- Exact tube centerline spacing.
- Exact frame/fascia depth.
- Exact top deck thickness.
- Exact side frame construction.
- Exact connection plate sizes and hole positions.
- Exact T-section dimensions.
- Whether the standard product is modular by 20 ft, 40 ft, 80 ft, or multiple configurations.

## Standard Visual Features To Model

Core dock platform:

- Rectangular deck platform with configurable length and width.
- Wood deck or composite deck finish.
- Deck board grooves/lines, preferably running across dock width for the wood floating dock default.
- Slight deck thickness above a deeper frame/fascia.
- Perimeter side frame/fascia around all edges.
- Dark side rub strip or shadow groove below the upper fascia where visible.
- Visible fastener heads along the side fascia if practical.

Float / pontoon system:

- Two large round tube pontoons below the deck, running lengthwise.
- Pontoons should sit below the frame with only the lower side visible in Customer View.
- Optional cross tube/cross member hints between side pontoons.
- Tube ends should be rounded/capped visually, not plain square blocks.

Connection and hardware:

- Mount plates or fish plates along side/end edges as small metal plates.
- Chain pocket or pin connection details as optional simplified blocks/cylinders.
- Cleats on deck surface as optional customer-view detail.
- Spud or guide posts optional for later, controlled by props.
- T-section connection should eventually support matching adjacent floating dock footprints.

## Material Notes

Wood deck:

- Warm pressure-treated / cedar-like wood.
- Visible board seams across dock width.
- Slight colour variation is desirable but not required for Phase 1B.

Composite deck:

- Grey/tan composite boards as shown in `Composite Floater.jpg`.
- Cleaner, flatter surface with regular grooves.

Frame / fascia:

- Wood/timber fascia for wood floating dock references.
- Composite/finished fascia for composite reference.
- Dark horizontal rub strip or shadow gap can be represented with a thin dark band.

Pontoons:

- Dark brown/black round tubes in the wood dock photo.
- Use dark, low-roughness material with subtle highlights.

Hardware:

- Metal cleats, fasteners, plates, pins, and connection hardware should use satin aluminum/galvanized steel colours.
- Fasteners should be lightweight repeated small discs/cylinders, not high-poly bolts.

## Recommended Simplified Web Geometry

Use parametric React Three Fiber geometry, not raw CAD import, for Phase 1B.

Suggested geometry:

- Top deck slab:
  - length and width from project element footprint.
  - board grooves as thin raised/recessed lines.
  - finish controlled by prop.

- Perimeter frame/fascia:
  - four side fascia beams around the footprint.
  - configurable fascia depth.
  - optional dark rub strip band on long sides and ends.

- Pontoons:
  - two lengthwise cylinders below deck near long edges.
  - configurable diameter, length, and x-offset.
  - rounded/capped ends if simple enough.

- Cross structure:
  - cross tubes or cross beams at configurable spacing under deck.
  - simplified rectangular or cylindrical members.

- Hardware:
  - optional cleats as small low-poly shapes.
  - optional side plates/fish plates as flat metal rectangles.
  - optional chain pocket markers.
  - optional spud sleeves/posts in a later pass.

Keep the project footprint logic:

- The component must render inside the current `floating_dock` 2D-to-3D footprint.
- It must not change the saved project center, rotation, width, height, or scale mapping.
- Internal View should continue showing the raw footprint outline and debug labels from `ProjectDockModel`.

## Proposed TypeScript Props

```ts
export type FloatingDockDeckFinish = 'pressure-treated' | 'cedar' | 'composite-grey' | 'composite-brown';

export interface KehoeFloatingDockProps {
  lengthFt: number;
  widthFt: number;
  deckThicknessFt?: number;
  fasciaDepthFt?: number;
  frameHeightFt?: number;
  deckFinish?: FloatingDockDeckFinish;
  boardDirection?: 'width' | 'length';
  boardSpacingFt?: number;
  pontoonCount?: 2 | 3;
  pontoonDiameterFt?: number;
  pontoonLengthFt?: number;
  pontoonInsetFt?: number;
  pontoonColor?: string;
  crossMemberSpacingFt?: number;
  showRubStrip?: boolean;
  showFasteners?: boolean;
  showCleats?: boolean;
  cleatCount?: number;
  showConnectionPlates?: boolean;
  showChainPockets?: boolean;
  showSpudSleeves?: boolean;
  opacity?: number;
  viewMode?: 'customer' | 'internal';
}
```

Recommended temporary defaults:

```ts
const defaultKehoeFloatingDockProps = {
  lengthFt: 40,
  widthFt: 8,
  deckThicknessFt: 0.22,
  fasciaDepthFt: 1.1,
  frameHeightFt: 0.6,
  deckFinish: 'pressure-treated',
  boardDirection: 'width',
  boardSpacingFt: 0.5,
  pontoonCount: 2,
  pontoonDiameterFt: 2.0,
  pontoonInsetFt: 1.15,
  crossMemberSpacingFt: 4,
  showRubStrip: true,
  showFasteners: true,
  showCleats: true,
  cleatCount: 4,
  showConnectionPlates: true,
  showChainPockets: false,
  showSpudSleeves: false,
};
```

Defaults above are provisional and should be replaced or adjusted after Steve confirms exact tube diameter, frame depth, and standard section sizing.

## Proposed Implementation Plan

1. Add a new product component:
   `src/components/render3d/products/KehoeFloatingDock.tsx`

2. Render the component in local coordinates:
   - local X = dock width direction,
   - local Z = dock length direction,
   - local Y = height.

3. Keep `ProjectDockModel` responsible for:
   - project-data position,
   - rotation,
   - footprint length/width,
   - opacity,
   - view mode.

4. Replace only the `floating_dock` render branch with `KehoeFloatingDock` after the product component is complete.

5. Leave `stationary_dock` unchanged initially.

6. Preserve Internal View diagnostics:
   - raw footprint outline,
   - element labels,
   - scale warnings.

7. Validate with:
   - `/render3d/local-test`,
   - a real saved project with floating dock plus ramp,
   - Top camera comparison to the 2D editor,
   - Customer View export PNG.

## Risks And Missing Information

- SolidWorks files were not opened in CAD during this documentation pass.
- T-section PDF sheets have no extractable text in the local tooling.
- Old `.xls` calculators could not be read as spreadsheets without an old Excel reader, so values are not confirmed.
- Direct CAD-to-GLB may be too heavy and less flexible than a parametric component.
- Exact standard dimensions need confirmation before final product modeling.
- There may be multiple product variants: wood, composite, long, T-section, spud, ramp-connected, and counterweighted versions.
- The 2D `floating_dock` element may represent many sizes, so the component must adapt to arbitrary project dimensions rather than assuming 8x40 only.

## Dimensions Steve Should Confirm

Before final product modeling, confirm:

- Standard residential floating dock section sizes, especially whether 8 ft x 40 ft is a standard/default.
- Whether 80 ft drawings represent one assembly, two 40 ft sections, or another configuration.
- Standard tube/pontoon diameter.
- Number of tubes per standard section.
- Tube centerline spacing from dock centerline or edge.
- Tube length relative to deck length.
- Frame/fascia depth below deck.
- Deck board thickness and nominal board spacing.
- Deck board direction for wood and composite products.
- Standard cleat count and locations.
- Standard connection plate/fish plate locations.
- Whether chain pockets should be visible in customer-facing renders.
- Whether spud sleeves/posts are a standard option or separate product feature.
- Whether composite floating dock geometry differs from wood beyond material/finish.

## Recommended Next Build Step

Build a lightweight parametric `KehoeFloatingDock` component from the confirmed/inferred layout:

- rectangular deck,
- perimeter fascia,
- two round lengthwise pontoons,
- crossmembers,
- board-line detail,
- optional cleats and plates.

Do not convert or commit CAD assets for Phase 1B. Use the SolidWorks assemblies, drawings, calculators, and photos as local reference only.
