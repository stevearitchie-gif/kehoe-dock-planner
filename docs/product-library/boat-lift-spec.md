# Kehoe 3D Product Library - Boat Lift Spec

## Product Overview

Boat lifts should start as recognizable, lightweight placeholders driven by quote/catalog data. The first safe scope is a parametric frame that communicates lift location, approximate footprint, capacity class, and broad product type without claiming exact manufacturer geometry.

## Current Implementation Status

- Supported as a Dock Planner object type: `boat_lift`.
- Supported in the 3D project adapter and ProductConfiguration adapter.
- Rendered by `BoatLiftElement` in `ProjectDockModel` as a simple frame with four posts, top beams, cables, and a cradle placeholder.
- ProductConfiguration supports `boatLift` metadata for category, model name, capacity, and accessories.
- No dedicated Kehoe/brand-specific boat lift product component exists yet.

## Target Scope For Next Implementation

- Create a first parametric boat lift placeholder component.
- Use simple posts, upper beams, cable lines, cradle bunks, and a small label/metadata cue in Internal View.
- Accept length, width, height, capacity, model name, and accessory flags when available.
- Keep exact model geometry out of scope until manufacturer dimensions are confirmed.

## Supported Dimensions And Options

- Current: length/width from Dock Planner object or ProductConfiguration defaults.
- Future: lift length, width, frame height, cradle width, capacity class, canopy option, motor/guide posts, accessories.
- Quantity from quote data can create repeated placeholders later.

## Visual Rules

- Should sit on the 2D object footprint and preserve Top View placement.
- Customer View should read as a boat lift frame, not a solid block.
- Internal View should expose model/category/capacity when present.
- Do not overlap dock/ramp geometry unless layout explicitly places it there.

## Material Rules

- Galvanized or light aluminum frame.
- Dark cable lines.
- Muted grey cradle/bunk supports.
- Optional canopy material only after boat port/canopy rules are defined.

## Simplifications

- Use rectangular posts/beams and simple cable/cradle geometry.
- Do not model winches, pulleys, motors, bunks, or exact hardware until reference dimensions exist.
- Use default placeholder sizes when quote model dimensions are missing.

## Assumptions

- The quote builder has model IDs and names, but not enough dimensions for exact 3D.
- Capacity can be inferred or stored later, but should not drive engineering geometry yet.

## Future Enhancements

- Catalog dimension fields by model.
- Accessory geometry flags.
- Capacity/model label in Internal View.
- Optional canopy/boat port integration.
- Boat position/water clearance assumptions.

## Reference Material Still Needed

- Manufacturer/model dimension table.
- Common residential lift footprints.
- Standard frame heights.
- Accessory list with geometry relevance.
- Photos for customer-facing proportions.

## Recommended First Component Scope

Implement a lightweight `BoatLiftPlaceholder` that accepts footprint length/width, optional height, model name, and capacity. Reuse it for saved project and quote preview renders before attempting brand-specific models.
