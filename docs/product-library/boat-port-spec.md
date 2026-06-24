# Kehoe 3D Product Library - Boat Port Spec

## Product Overview

Boat ports should be represented first as simple canopy/frame structures associated with a dock, lift, or standalone footprint. The first version should communicate covered-boat-port intent without detailed engineering.

## Current Implementation Status

- No first-class Dock Planner object type currently exists for `boat_port`.
- No ProductConfiguration product type currently exists for `boat_port`.
- No 3D component currently exists.
- `roof_overlay` exists as a generic raised translucent canopy/outline and can inform the first boat-port visual approach.

## Target Scope For Next Implementation

- Add a product type only after 2D editor and quote mapping decisions are confirmed.
- Start with a parametric canopy frame: posts, roof plane, perimeter rails, and optional open sides.
- Support attachment to a dock/lift footprint or standalone placement.

## Supported Dimensions And Options

- Length, width, clear height, roof height, roof pitch/flat roof, frame material, canopy colour.
- Attachment mode: standalone, dock-attached, lift-attached.
- Optional side curtains or roof-only visual in future.

## Visual Rules

- Preserve source footprint in Top View.
- Roof/canopy should sit clearly above dock/lift geometry.
- Customer View should show a simple frame and roof, not a solid opaque block.
- Internal View should label unsupported/approximate status until dimensions are confirmed.

## Material Rules

- Frame: galvanized steel or aluminum.
- Roof/canopy: translucent or lightly opaque grey/white material.
- Keep opacity low enough to see related dock/lift geometry.

## Simplifications

- Use simple posts and rectangular roof plane.
- Avoid roof truss detail, fasteners, fabric seams, and exact foundations initially.
- Do not infer boat port dimensions from quote wording without structured fields.

## Assumptions

- Boat ports may belong to quote workflows before they exist in the 2D Dock Planner.
- A standalone quote preview component may arrive before full layout editing support.

## Future Enhancements

- ProductConfiguration `boat_port` type.
- 2D editor tool/object type.
- Roof pitch and canopy material options.
- Integration with boat lift placeholder.
- Accessory mounting points and customer PDF export.

## Reference Material Still Needed

- Standard Kehoe boat port dimensions and variants.
- Photos of installed boat ports.
- Frame material and finish.
- Roof/canopy colours and profiles.
- Attachment rules to docks or lifts.

## Recommended First Component Scope

Create a `BoatPortPlaceholder` only after product type and quote fields are confirmed. Begin with rectangular posts plus a raised translucent roof over a configurable footprint.
