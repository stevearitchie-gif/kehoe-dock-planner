# Kehoe 3D Product Library - Accessories Spec

## Product Overview

Accessories are small dock-attached or standalone add-ons that improve the customer-facing sales visual and eventually connect quote line items to visible 3D details.

## Current Implementation Status

- No first-class accessory Dock Planner object types exist yet.
- No ProductConfiguration `accessory` product type exists yet.
- Floating dock currently renders built-in customer-view cleats as decorative detail.
- Boat lift ProductConfiguration can carry accessory metadata, but those accessories do not render as distinct objects.

## Target Scope For Next Implementation

Start with a small accessory set:

- Cleats.
- Bumpers.
- Ladders.
- Benches.
- Posts.
- Tie-up points.

Implement accessories as lightweight parametric components with clear attachment rules before exposing broad editing or quote automation.

## Supported Dimensions And Options

- Accessory type.
- Quantity.
- Attachment target ID.
- Attachment edge or local position.
- Material/finish.
- Optional size class: small, standard, large.

## Visual Rules

- Accessories should not alter dock/ramp source footprints.
- Dock-attached accessories should follow the host dock rotation and edge.
- Quote-driven accessories without layout should use safe default placement and show Internal View assumptions.
- Customer View should avoid clutter on small docks.

## Material Rules

- Cleats/tie-up points: satin metal.
- Bumpers: black/dark rubber.
- Ladders: aluminum/galvanized metal.
- Benches: wood/composite seat with metal brackets.
- Posts: galvanized or dark painted metal/wood depending on product.

## Simplifications

- Use simple box/cylinder geometry.
- Avoid high-poly bolts, ropes, chains, and detailed ladders until needed.
- Do not auto-place every quote accessory unless layout rules exist.

## Assumptions

- Accessories will need both quote-driven and layout-driven workflows.
- Some accessories are product details on a host dock, while others are independent placed objects.

## Future Enhancements

- `accessory` ProductConfiguration type or a nested accessory model on host products.
- 2D editor accessory tools.
- Edge-snapping/attachment points.
- Quantity-driven default placement.
- Customer PDF accessory callouts.

## Recommended Accessory Model

Use a combination:

- Dock-attached objects for cleats, bumpers, ladders, benches, and tie-up points.
- Standalone placed objects for posts or layout-specific hardware.
- Quote-driven add-ons for visual defaults when exact placement is not yet known.

## Next Modular Product Implementation Order

1. Boat lift placeholder:
   - First safe scope is a parametric frame with posts, beams, cables, cradle placeholder, model/capacity metadata, and default dimensions.
   - This should work from both Dock Planner object footprints and ProductConfiguration quote preview data.

2. Boat port placeholder:
   - First safe scope is a raised canopy/frame over a configurable footprint.
   - Add only after product type and quote fields are confirmed.

3. Accessories starter set:
   - Cleats, bumpers, ladders, benches, posts, and tie-up points.
   - Begin as dock-attached objects or host-product add-ons with default placement assumptions.
   - Add standalone placement later where layout accuracy matters.

## Reference Material Still Needed

- Accessory catalog/SKU list.
- Standard dimensions.
- Material/finish options.
- Photos of common installations.
- Rules for default placement and quantity spacing.
