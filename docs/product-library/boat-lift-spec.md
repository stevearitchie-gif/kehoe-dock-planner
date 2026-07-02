# Kehoe 3D Product Library - Boat Lift Spec

## Product Overview

Boat lifts should start as recognizable, lightweight placeholders driven by quote/catalog data. The first safe scope is a parametric frame that communicates lift location, approximate footprint, capacity class, and broad product type without claiming exact manufacturer geometry.

## Public Manufacturer Reference Review

Internet access was available for this review. No raw manufacturer drawings, PDFs, images, CAD files, or website assets were downloaded or copied into the repository.

Public pages reviewed:

- Golden Boat Lifts resources and brochure/download hub: https://goldenboatlifts.com/download-brochure/
- Golden Aluminum 4-Post Boat Lifts product page: https://goldenboatlifts.com/aluminium-four-post-boat-lifts/
- Golden 4-Post public flyer PDF link exposed on the resources page: https://goldenboatlifts.com/wp-content/uploads/2024/11/4Post-2024-v.2-bleed.pdf
- Golden Freestanding Lift product page: https://goldenboatlifts.com/freestanding-lift/

Reference notes:

- Kehoe is a dealer for Golden Boat Lifts, so Golden should be treated as the manufacturer reference for this component.
- Golden's 4-Post Boat Lifts page describes these as traditional shafted beam boat lifts mounted on four pilings.
- Public Golden capacity ranges for 4-post lifts include 5,000 lb, 7,500 lb, 10,000 lb, 12,000 lb, 14,000 lb, 16,000 lb, 20,000 lb, 24,000 lb, 28,000 lb, 30,000 lb, 32,000 lb, 40,000 lb, and 56,000 lb.
- Golden 4-post features include 6061-T6 marine-grade aluminum structure, welded non-adjustable parts, pre-wound and assembled beams, pre-assembled cradle beams, pulleys with grease fittings, Golden Sea-Drives, stainless steel motors, grooved aluminum cable winders, and 300-series stainless hardware/cables.
- The public 4-post flyer describes the product as a saltwater-approved, traditional cable-drawn, shafted beam lift mounted on four pilings. It also notes 6061-T6 marine-grade aluminum, 300-series stainless hardware, fully welded non-adjustable aluminum structure, top beams with bearing blocks and anti-shear plates, grooved aluminum winders, Golden Sea-Drives, stainless motors, and stainless cables.
- Public Golden options called out for the 4-post lift include aluminum walkways, aluminum bunks in multiple styles, custom bunking, platforms, stairs/steps platforms with handrails, cable keepers, remote with auto-stop, top beam covers, and shallow-water angled cradles.
- Golden Freestanding Lift references are relevant for future alternate boat lift geometry but should not drive the first 4-post component. The freestanding page lists 2-motor capacities of 5,000 lb, 7,000 lb, 10,000 lb, and 12,000 lb.

Reference-use caution:

- Golden owns its drawings, PDFs, images, website assets, product marks, and exact engineering documents.
- The app should summarize Golden-derived dimensions/features only as implementation notes and should not copy diagrams, photos, table formatting, CAD, PDFs, or branding into the repo.
- The first 3D component should be a dealer sales visualization inspired by Golden 4-post lift proportions, not an exact reproduction of protected drawings.
- Exact model geometry should wait for Kehoe-approved Golden model/dimension data and permission to represent specific Golden products.
- Do not copy manufacturer diagrams, photos, table formatting, CAD, or branding into the app.

## Current Implementation Status

- Supported as a Dock Planner object type: `boat_lift`.
- Supported in the 3D project adapter and ProductConfiguration adapter.
- Rendered through the dedicated `KehoeBoatLift` product component in `src/components/render3d/products/KehoeBoatLift.tsx`.
- `ProjectDockModel` keeps the older generic boat lift frame as a safety fallback if dimensions are invalid.
- ProductConfiguration supports `boatLift` metadata for category, model name, capacity, and accessories.
- The first implementation is visual and parametric only; it is not an engineering-grade lift model.

## Implemented Scope

- Four primary vertical posts located inside the saved 2D footprint.
- Heavier top side beams and end beams to suggest a shafted 4-post lift structure.
- Small bearing block and cable winder hints at the top beam/post areas.
- Mid-height side rails.
- Simple vertical cable and cable-keeper hints.
- Cradle side beams, cross members, secondary cross braces, and two bunk supports.
- Small motor/drive box hint on one top corner with a subtle drive drum.
- Customer View uses clean muted galvanized/aluminum-style materials.
- Internal View receives the normal project debug label from `ProjectDockModel`; model/capacity-specific labels are deferred until metadata is mapped into `ProjectRenderElement`.

## Supported Dimensions And Options

- Current: length and width from Dock Planner object dimensions or ProductConfiguration defaults.
- Current: visual frame height defaults to `4.2 ft` inside `KehoeBoatLift`.
- Current: position and rotation come from the existing 2D-to-3D project render mapping.
- Future: lift length, width, frame height, cradle width, capacity class, canopy option, motor/guide posts, accessories.
- Quantity from quote data can create repeated placeholders later.

## Visual Rules

- Should sit on the 2D object footprint and preserve Top View placement.
- Customer View should read as a boat lift frame, not a solid block.
- The first model should visually read as a Golden-style 4-post cable-drawn lift while remaining a Kehoe-owned, simplified dealer visualization.
- Four posts, top beam structure, cradle beams, bunks, cable hints, and a small drive/motor hint should remain readable from angled views.
- Internal View should expose model/category/capacity when present.
- Do not overlap dock/ramp geometry unless layout explicitly places it there.
- Keep posts, beams, cables, and cradle details lightweight enough for tablet use.

## Material Rules

- Galvanized or light aluminum frame.
- Dark cable lines.
- Muted grey cradle/bunk supports.
- Optional canopy material only after boat port/canopy rules are defined.

## Simplifications

- Use rectangular posts/beams and simple cable/cradle geometry.
- Use small simplified blocks/cylinders for bearing blocks, winders, cable keepers, and drive hints.
- Do not model exact winches, pulleys, motors, bunk profiles, cable paths, or hardware until approved reference dimensions exist.
- Use default placeholder sizes when quote model dimensions are missing.
- Do not infer capacity from footprint yet.
- Do not model boat hulls, canopy frames, guide posts, branded drive units, or manufacturer-specific power units beyond a small unbranded visual drive hint.

## Assumptions

- The quote builder has model IDs and names, but not enough dimensions for exact 3D.
- Capacity can be inferred or stored later, but should not drive engineering geometry yet.
- Saved Dock Planner `boat_lift` objects currently provide reliable footprint, position, and rotation, but not model-specific height or capacity.

## Future Enhancements

- Catalog dimension fields by model.
- Accessory geometry flags.
- Capacity/model label in Internal View.
- Optional canopy/boat port integration.
- Boat position/water clearance assumptions.
- Map ProductConfiguration `boatLift.modelName` and `boatLift.capacityLbs` into `ProjectRenderElement` metadata for optional Internal View labels.

## Reference Material Still Needed

- Manufacturer/model dimension table.
- Common residential lift footprints.
- Standard frame heights.
- Accessory list with geometry relevance.
- Photos for customer-facing proportions.

## Recommended Next Component Scope

Add optional `boatLift` render metadata to `ProjectRenderElement` so saved previews and quote-driven ProductConfiguration renders can show model/capacity in Internal View without changing the clean Customer View.
