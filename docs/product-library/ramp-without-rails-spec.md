# Kehoe 3D Product Library - Ramp Without Rails Spec

## Product Overview

Kehoe ramp without rails is the rail-free variant of the parametric aluminum ramp family. It should share the same footprint, slope, dock-end connection, side frame, deck/tread, and lower-end visual rules as the ramp-with-rails component, while omitting rail posts, top rails, midrails, and rail braces.

## Current Implementation Status

- Supported as a Dock Planner object type: `ramp_without_rails`.
- Supported in the 3D project adapter and ProductConfiguration adapter.
- Implemented as `src/components/render3d/products/KehoeRampWithoutRails.tsx`.
- Used for `ramp_without_rails` elements in saved project renders and ProductConfiguration quote previews.
- Falls back to the generic `RampElement` path only if required ramp dimensions or slope data are invalid.
- Preserves 2D footprint, position, rotation, slope, and dock connection detection.
- Quote import can map ramp type to `ramp_without_rails`, but the current residential quote workflow primarily exports the standard ramp-with-rails product.

## Implemented Component Scope

- `KehoeRampWithoutRails` uses the same local ramp footprint convention as `KehoeRampWithRails`.
- Local X is the ramp width and local Z is the ramp length.
- All ramp placement, rotation, dock connection, slope, and visual trim logic remains in `ProjectDockModel`.
- The component renders a sloped ramp deck, aluminum side frames, subtle tread lines, cross members, dock-end hinge/plate details, and lower-end rollers.
- It intentionally omits rail posts, handrails, midrails, and rail braces.
- Do not add elevation engineering claims beyond the current visual slope approximation.

## Supported Dimensions And Options

- Length and width from saved project or ProductConfiguration data.
- Deck/tread finish: pressure-treated, TruNorth/PVC/composite grey, composite brown as future inputs.
- Frame material: aluminum or painted steel as future inputs.
- Slope data from the existing ramp elevation model.
- Optional dock-end plate and lower-end roller/foot details.

## Visual Rules

- Top View must preserve the source 2D footprint exactly.
- Body should slope along the same local length axis used by ramp-with-rails.
- No rail elements should be rendered.
- Dock-end trim/cap should remain visual only and not alter the debug footprint.
- Tread lines should be subtle, opaque, and slightly offset above the sloped deck surface to avoid z-fighting.
- Customer View should read as a clean Kehoe aluminum ramp body without the visual weight of handrails.

## Shared Logic With Ramp With Rails

- Same `KehoeRampSlope` shape.
- Same visible span calculation for dock-end visual trim.
- Same height interpolation along the ramp length axis.
- Same deck, side-frame, cross-member, hinge, lower plate, and roller proportions.
- Same subtle tread spacing and material tone used in the approved ramp-with-rails visual pass.

## Differences From Ramp With Rails

- No vertical rail posts.
- No top rails.
- No midrails.
- No diagonal rail braces.
- Slightly simpler silhouette for customer-facing previews.

## Material Rules

- Default frame: satin aluminum.
- Deck: muted grey or pressure-treated tone depending on product data.
- Plates/rollers: slightly darker galvanized metal.

## Simplifications

- Use rectangular side frames and simple sloped deck geometry.
- Use simple cylinders/blocks for rollers or lower feet.
- Do not model exact hinge ears, bolt holes, UHMW, or retainer geometry until confirmed.

## Assumptions

- Rail-free ramp shares the same basic ramp body dimensions and local coordinate convention as ramp-with-rails.
- Quote-driven ramp_without_rails support is useful for future workflows even if current standard residential quote wording assumes rails.

## Future Enhancements

- Extract shared ramp body helpers if a third ramp variant is added.
- Deck finish prop.
- Optional anti-slip/tread plate detail.
- Confirmed lower-end foot/roller geometry.
- Internal View diagnostics for rail-free ramp body and trim span.

## Reference Material Still Needed

- Drawing or photo confirmation of the rail-free variant.
- Confirmed standard lengths and widths.
- Confirmed deck/tread material.
- Confirmed hinge and lower-end hardware.
