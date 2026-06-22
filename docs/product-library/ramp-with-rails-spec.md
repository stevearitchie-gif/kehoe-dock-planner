# Kehoe 3D Product Library - Ramp With Rails Spec

## Product Name

Kehoe Standard 24' Aluminum Ramp With Rails.

## Source Files Reviewed

Local reference folder:

`local-referenceramp-with-rails/KEHOE RAMP`

Reviewed directly:

- `RAMP - ALUMINUM 24 FOOT - DRAWING - 2013-03-23.pdf`
- `RAMP - ALUMINUM 24 FOOT CUT FILES - 2013-03-23.pdf`
- `RAMP - ALUMINUM 24 FOOT.SLDPRT`
- `RAMP - ALUMINUM 24 FOOT.SLDDRW`
- `RAMP - ALUMINUM 24 FOOT CUT FILES - 2013-03-23.dwg`
- `RAMP - ALUMINUM 24 FOOT CUT FILES - 2013-11-19.dwg`
- `RAMP - ALUMINUM 24 FOOT CUT FILES - 2013-11-20.dwg`
- Representative photo: `Floating Docks/Composite Floater with Aluminum Ramp.jpg`

Notes:

- The SolidWorks part and drawing files are present, but were not opened in SolidWorks during this pass.
- The main PDF drawing has extractable text and appears to be the best accessible dimension source.
- The cut-file PDF has no extractable text.
- The DWG files are named as cut files and appear most likely to be 2D fabrication/cut references rather than complete 3D model geometry.

## Known Dimensions

| Dimension | Value | Status | Source / Notes |
|---|---:|---|---|
| Nominal product length | 24 ft | Confirmed | Product title: `STANDARD 24' ALUMINUM RAMP`. |
| Actual ramp length | 288 in | Confirmed | Drawing text on sheet 2. |
| Ramp width | 48 in | Confirmed | Drawing text: `48" RAMP`. |
| Outside ramp width | 48 in | Confirmed | Drawing text: `48" OUTSIDE RAMP`. |
| Crossers and wood width | 44 in | Confirmed | Drawing text: `44" (CROSSERS & WOOD)`. |
| Outside railing width | 49 in | Confirmed | Drawing text: `49" OUTSIDE RAILING`. |
| Railing post height | 42 in | Confirmed | Drawing text: `42" RAILING POSTS`. |
| Midrail height | 20 in | Confirmed | Drawing text: `20" MIDRAIL`. |
| Decking | 5/4 PT decking and stringers | Confirmed | Drawing text: `5/4 PT DECKING & STRINGERS`. |
| Hinge / pin | 1 in pin, 1-1/2 in pin noted | Confirmed | Drawing text includes `1" PIN`, `1-1/2" PIN`, `PIPE & PIN`. |
| Bolt sizes | 5/8 in bolt, 3/8 in bolts | Confirmed | Drawing text includes `5/8" BOLT`, `3/8" BOLT`. |
| Plate thickness | 3/8 in plate, 3/16 in tread plate | Confirmed | Drawing text includes `3/8 PLATE`, `3/16 TREAD PLT`. |
| UHMW component | 4 in UHMW | Confirmed | Drawing text includes `4" UHMW`. |
| End cap count | 2 | Confirmed | Drawing text: `ENDCAP (2)`. |
| Retainer count | 2 | Confirmed | Drawing text: `RETAINER (2)`. |
| Ear count | 2; weld on 4 ears also noted | Confirmed, needs CAD clarification | Drawing text includes `EAR (2)` and `WELD ON 4 EARS`. |
| Gusset count | 2 | Confirmed | Drawing text: `GUSSET (2)`. |
| Frame / rail members | HSS 4 x 2 x 3/16, HSS 3 x 2 x 3/16, HSS 3 x 2 x 1/4, HSS 2 x 2 x 3/16, FB 2 x 1/4, channel 4 in | Confirmed as component callouts | Exact placement should be verified in CAD/SolidWorks. |
| Frame depth | Approximately 2 to 4 in member depth | Inferred | Based on HSS/channel callouts. Use simplified 4 in side frame visual depth unless CAD confirms otherwise. |
| Rail post spacing | Not confirmed from extracted PDF text | Missing / inferred | Use a parametric default, e.g. 6 ft spacing or 5 posts per side for a 24 ft ramp, until CAD/drawing inspection confirms exact bay spacing. |
| Lower end roller / foot dimensions | Rollers noted, exact assembly not fully confirmed from text | Partially confirmed | Drawing includes `ROLLERS`, `ROUND BOTTOM LEADING EDGE`, `SHORE MOUNT`. |

## Confirmed vs Inferred Dimensions

Confirmed from the drawing PDF:

- 24 ft nominal ramp.
- 288 in actual length.
- 48 in ramp/outside ramp width.
- 44 in crossers and wood width.
- 49 in outside railing width.
- 42 in railing posts.
- 20 in midrail.
- 5/4 PT decking and stringers.
- 3/16 in tread plate.
- HSS and channel member callouts listed above.
- Pin, bolt, plate, UHMW, retainer, endcap, ear, gusset, and roller callouts.

Inferred or still needing confirmation:

- Exact rail post spacing and count.
- Exact rail tube centerlines relative to ramp frame.
- Exact hinge geometry and ear placement.
- Exact roller/shore-end assembly geometry.
- Whether the SolidWorks part contains all rail and hinge details as modeled geometry or only the ramp body.
- Exact material finish and deck color variation for customer-facing rendering.

## Visual Features To Model

Core ramp body:

- Long aluminum side frames running full ramp length.
- Cross members under or flush with deck surface.
- Deck surface inside the aluminum frame, visually about 44 in wide inside a 48 in ramp envelope.
- Thin ramp depth/profile, with aluminum side members more visually prominent than the deck slab.

Rails:

- Railings on the two long sides of the ramp.
- Vertical posts rising from the side frames.
- Top rails following the ramp slope.
- Midrails around 20 in above the deck.
- Rail post height around 42 in above the deck.
- Rails should follow the existing 2D convention: rail lines run along the ramp local Y axis, mapped to the 3D local Z axis.

Dock connection:

- High end should meet the dock edge cleanly.
- Add a simple hinge/connection plate at the dock end.
- Optional visual ears, pin, or pipe-and-pin detail can be added as small simplified metal shapes.
- The ramp should not visually pass through the dock deck even if the saved 2D footprint overlaps slightly.

Lower end:

- Shore/landing end can include a simple tread plate or metal transition plate.
- Optional rollers or feet can be represented by small cylinders/blocks if visible in customer view.
- Keep lower end above the water/base plane.

Optional details for later:

- UHMW block.
- Retainers.
- Gussets.
- End caps.
- Shore mount.
- Rounded bottom leading edge.

## Material Notes

Aluminum:

- Use a light grey/silver metal material.
- Customer View should use a clean satin aluminum finish, not mirror chrome.
- Internal View can use slightly higher contrast edges for diagnostics.

Deck:

- Drawing calls out 5/4 PT decking and stringers.
- Product photo shows a grey composite-like deck surface in at least one installation.
- Component should support a `deckFinish` prop so the same geometry can display pressure-treated, composite grey, or composite brown.

Connection plates / tread plate:

- Use a slightly brighter metal material.
- Diamond-plate texture is optional for Phase 1; a simple ribbed/striped plane is acceptable.

Colour assumptions:

- Aluminum: `#cfd5d8` to `#e2e8eb`.
- Shadowed aluminum sides: `#9ca3a8`.
- Grey deck: `#8f9290`.
- Pressure-treated deck: `#9a8f63`.
- Brown composite: `#8a5f3d`.

## Recommended Simplified Web Geometry

Use parametric React Three Fiber geometry, not raw CAD import, for Phase 1.

Suggested parts:

- One sloped deck surface generated from four top vertices and four bottom vertices.
- Two aluminum side beams along the long sides.
- Cross members at configurable spacing.
- Deck board strips or subtle board lines on the sloped top surface.
- Rail posts at configurable spacing on both side beams.
- Top rail and midrail on each side, both following the ramp slope.
- Hinge/connection plate at dock end.
- Optional lower tread plate at shore/landing end.
- Optional rollers/feet as simple cylinders or blocks.

Keep the existing project footprint logic:

- Do not move the source ramp center.
- Do not change the 2D-to-3D footprint mapping.
- Render any visual trim/cap inside the product component while preserving the raw footprint for diagnostics.

## Proposed TypeScript Props

```ts
export type RampDeckFinish = 'pressure-treated' | 'composite-grey' | 'composite-brown';

export interface KehoeRampWithRailsProps {
  lengthFt?: number;
  widthFt?: number;
  deckWidthFt?: number;
  outsideRailingWidthFt?: number;
  frameDepthFt?: number;
  deckThicknessFt?: number;
  railHeightFt?: number;
  midRailHeightFt?: number;
  postSpacingFt?: number;
  postCount?: number;
  slope?: {
    dockEnd: 'negative-z' | 'positive-z';
    dockEndHeightFt: number;
    lowerEndHeightFt: number;
    visualDockEndZFt?: number;
  };
  deckFinish?: RampDeckFinish;
  showConnectionPlate?: boolean;
  showLowerTreadPlate?: boolean;
  showRollers?: boolean;
  viewMode?: 'customer' | 'internal';
  opacity?: number;
}
```

Recommended defaults:

```ts
const defaultKehoeRampWithRailsProps = {
  lengthFt: 24,
  widthFt: 4,
  deckWidthFt: 44 / 12,
  outsideRailingWidthFt: 49 / 12,
  frameDepthFt: 4 / 12,
  deckThicknessFt: 0.18,
  railHeightFt: 42 / 12,
  midRailHeightFt: 20 / 12,
  postSpacingFt: 6,
  deckFinish: 'composite-grey',
  showConnectionPlate: true,
  showLowerTreadPlate: true,
  showRollers: false,
};
```

## Proposed Implementation Plan

1. Add a new product-library component folder, for example:
   `src/components/render3d/products/ramp-with-rails/`

2. Create a `KehoeRampWithRails.tsx` component that renders in local coordinates:
   - local X = ramp width direction,
   - local Z = ramp length direction,
   - local Y = height.

3. Move the existing sloped ramp height interpolation into reusable helper functions:
   - `getRampTopHeightAtZ`,
   - `getVisibleRampSpan`,
   - `getRailPostPositions`.

4. Keep the existing `ProjectDockModel` adapter responsible for:
   - project-data footprint,
   - rotation,
   - dock connection detection,
   - slope heights,
   - visual dock-end trim.

5. Replace only the current `ramp_with_rails` 3D rendering path with `KehoeRampWithRails` after the component is complete and visually checked.

6. Leave `ramp_without_rails` on the generic ramp renderer initially, or create a sibling `KehoeRampWithoutRails` that reuses the same ramp body without rails.

7. Add Internal View diagnostics around the product component:
   - raw footprint outline,
   - visible trimmed span,
   - dock end,
   - connection plate position,
   - post count/spacing.

8. Validate with:
   - `/render3d/local-test`,
   - a saved project with a ramp centered against a floating dock,
   - Top camera view comparison to the 2D editor,
   - Customer View PNG export.

## Risks And Missing Information

- SolidWorks files were not opened in CAD during this documentation pass.
- Exact rail post spacing and bay count still need visual/CAD confirmation.
- Exact hinge ear geometry is not fully confirmed from extracted PDF text.
- DWG cut files are likely useful for fabrication profiles but may not represent complete 3D geometry.
- Product photos show installation context and finish, but not reliable dimensional data.
- Direct CAD-to-GLB may produce excessive geometry for web use and should not be the primary Phase 1 implementation path.
- Drawing text includes proprietary/confidential notices; source files should remain local and ignored.

## Recommended Next Build Step

Build a parametric `KehoeRampWithRails` React Three Fiber component from the confirmed drawing dimensions, using simplified geometry and the existing project ramp connection data.

Do not convert or commit CAD assets for Phase 1. Use the SolidWorks part and drawing only as local reference, and keep the web component lightweight, parametric, and compatible with saved Dock Planner project dimensions.
