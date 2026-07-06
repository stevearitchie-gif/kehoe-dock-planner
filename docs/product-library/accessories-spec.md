# Kehoe 3D Product Library - Accessories Spec

## Product Overview

Accessories are small dock-attached or standalone add-ons that improve customer-facing site visit presentations. Accessories v1 is a lightweight visual framework, not an engineering-grade accessory catalog.

## Current Implementation Status

- A first-class `accessory` Dock Planner object type exists.
- Accessory subtype is stored in `metadata.accessoryType`.
- Accessory finish is stored in `metadata.accessoryFinish`.
- Accessories can be placed, selected, moved, rotated, resized, saved, exported to PDF, and sent to View 3D.
- Accessories render in the 3D project model through `KehoeAccessory`.
- ProductConfiguration can carry a basic `accessory` product type for future quote-driven previews.
- Floating dock built-in decorative cleats remain separate from first-class accessory objects.
- Floating dock built-in cleats remain visible because standard cleats are generally supplied with floating docks. Manual accessory cleats represent extra/additional cleats.
- Floating dock standard cleats can be hidden per dock with `metadata.showStandardCleats = false`. Missing/undefined keeps standard cleats visible for legacy projects.

## Supported V1 Accessories

- Cleat.
- Bumper.
- Ladder.
- Bench.
- Post.
- Tie-up point.

## Data Model

Accessories use one generic object type instead of six separate object types:

- `type`: `accessory`
- `metadata.accessoryType`: `cleat | bumper | ladder | bench | post | tie_up_point`
- `metadata.accessoryFinish`: `metal | rubber | wood | neutral`

This keeps the tablet editor simpler while allowing the right-side panel to switch the visual subtype.

## Defaults

- New accessory objects default to `cleat`.
- New accessory finish defaults to `metal`.
- Default 2D footprint is compact so accessories are easy to place manually.
- Missing or invalid accessory type safely falls back to cleat.
- Missing or invalid finish safely falls back to metal.

## 2D Behavior

- Accessories use a simple rectangular footprint like other placed objects.
- The selected accessory can be resized and rotated using existing editor controls.
- Each accessory subtype has a simple plan-view cue:
  - Cleat: horn-style line symbol.
  - Bumper: dark rubber strip.
  - Ladder: rails and rungs.
  - Bench: seat and support line.
  - Post: circular marker.
  - Tie-up point: ring marker.
- No automatic dock-edge snapping is included in v1.

## 3D Behavior

The 3D renderer preserves accessory position, size, rotation, type, and finish.

If an accessory is manually placed over a floating or stationary dock footprint, it renders on top of the dock deck surface with a small clearance so cleats and other deck-mounted accessories remain visible. Accessories that are not over a dock footprint render at the project base plane.

Ladder accessories use a dock-mounted visual when placed over or near a dock footprint. The 3D renderer moves the ladder visual to the nearest dock edge, aligns it with that edge, and draws vertical side rails and rungs dropping down from deck height. If no nearby dock is detected, the ladder renders as a simple upright placeholder.

- Cleat: low metal cleat with two horn hints.
- Bumper: dark rubber bumper strip.
- Ladder: simple metal rails and rungs.
- Bench: simple seat, legs, and back rail.
- Post: short vertical post/piling marker.
- Tie-up point: small base with ring.

Customer View uses clean, low-detail geometry. Internal View uses stronger colors for troubleshooting.

## Material Rules

- Cleats and tie-up points default to satin metal.
- Bumpers default to dark rubber.
- Ladders default to aluminum/metal.
- Benches use wood-like seats with simple metal supports.
- Posts use neutral/metal colors unless changed later.

## Simplifications

- Accessories are manually placed; no host-dock attachment model exists yet.
- No automatic quantity spacing, edge detection, or quote placement rules are included.
- No bolts, ropes, chain, hardware labels, SKU details, or manufacturer-specific profiles are modeled.
- Accessory dimensions are visual and driven by the object footprint, not product catalog dimensions.

## Future Enhancements

- Add edge snapping and attachment points on dock products.
- Add a Show Standard Cleats toggle and automatic standard-cleat spacing rule, such as cleats on each side at no more than 10 ft spacing.
- Add quantity-driven default placement from Quote Builder ProductConfiguration.
- Add accessory size classes such as small, standard, and large.
- Add accessory labels/callouts for customer PDF exports.
- Add approved reference dimensions and SKU mappings.
- Add host product relationships so accessories can move with a dock section.

## Reference Material Still Needed

- Accessory catalog/SKU list.
- Standard dimensions by accessory type.
- Finish/material options.
- Photos of common installations.
- Rules for default placement and quantity spacing.
