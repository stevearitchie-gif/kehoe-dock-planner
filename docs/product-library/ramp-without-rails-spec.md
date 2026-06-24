# Kehoe 3D Product Library - Ramp Without Rails Spec

## Product Overview

Kehoe ramp without rails is the rail-free variant of the parametric aluminum ramp family. It should share the same footprint, slope, dock-end connection, side frame, deck/tread, and lower-end visual rules as the ramp-with-rails component, while omitting rail posts, top rails, midrails, and rail braces.

## Current Implementation Status

- Supported as a Dock Planner object type: `ramp_without_rails`.
- Supported in the 3D project adapter and ProductConfiguration adapter.
- Rendered today by the generic `RampElement` path in `ProjectDockModel`, not by a dedicated Kehoe product component.
- Preserves 2D footprint, position, rotation, slope, and dock connection detection.
- Quote import can map ramp type to `ramp_without_rails`, but the current residential quote workflow primarily exports the standard ramp-with-rails product.

## Target Scope For Next Implementation

- Create `KehoeRampWithoutRails` by extracting/reusing the sloped ramp body from `KehoeRampWithRails`.
- Keep all ramp placement, rail-direction, dock connection, and visual trim logic in `ProjectDockModel`.
- Add side frame, deck/tread lines, cross members, dock-end hinge/plate, and lower-end rollers/feet.
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

- Dedicated product component and shared ramp body helpers.
- Deck finish prop.
- Optional anti-slip/tread plate detail.
- Confirmed lower-end foot/roller geometry.
- Internal View diagnostics for rail-free ramp body and trim span.

## Reference Material Still Needed

- Drawing or photo confirmation of the rail-free variant.
- Confirmed standard lengths and widths.
- Confirmed deck/tread material.
- Confirmed hinge and lower-end hardware.
