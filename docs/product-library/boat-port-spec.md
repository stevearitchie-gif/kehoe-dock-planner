# Kehoe 3D Product Library - Boat Port Spec

## Product Overview

Boat ports should be represented first as lightweight covered boat port / boat shelter visuals associated with a dock, lift, or standalone footprint. The first version should communicate footprint, support height, and roof form without detailed engineering.

## Current Implementation Status

- `boat_port` is supported as a first-class Dock Planner object type.
- `boat_port` is supported as a `ProjectRenderElementType`.
- `boat_port` is supported as a ProductConfiguration product type for future quote-driven previews.
- Rendered through the dedicated `KehoeBoatPort` covered-structure component in `src/components/render3d/products/KehoeBoatPort.tsx`.
- `ProjectDockModel` keeps a simple generic boat port fallback if dimensions are invalid.

## Target Scope For Next Implementation

- Rectangular footprint.
- Four vertical support posts.
- Top perimeter frame at wall height.
- Flat or pitched roof form.
- Clean customer-facing metal/support and light roof material.

## Supported Dimensions And Options

- Current: length and width from Dock Planner object dimensions or ProductConfiguration dimensions.
- Current: wall height from `metadata.boatPortWallHeightFt` or ProductConfiguration `boatPort.wallHeightFt`.
- Current: roof rise from `metadata.boatPortRoofRiseFt` or ProductConfiguration `boatPort.roofRiseFt`.
- Current: roof type from `metadata.boatPortRoofType` or ProductConfiguration `boatPort.roofType`.
- Current: position and rotation from the existing 2D-to-3D project render mapping.
- Current defaults: 7 ft wall height, 1.4 ft roof rise, pitched roof.
- Future: product model, port family, attachment mode, roof material, roof colour, and connection hardware.

## Visual Rules

- Preserve source footprint in Top View.
- Customer View should read as a covered boat port / boat shelter, not a flat drive-on port.
- Wall/support height and roof rise should be visually obvious from angled views.
- Flat roof and pitched roof should be visually distinct.
- Keep the structure simple and open, not a fully enclosed building.
- Internal View can show debug footprint labels through the existing project render diagnostics.

## Material Rules

- Posts/frame: light aluminum or galvanized metal.
- Roof: light grey/white canopy or metal roof.
- Base/footprint: subtle light blue-grey marker only.
- Avoid manufacturer-specific colours, logos, textures, or copied product styling until permissions and exact references are confirmed.

## Simplifications

- Use simple box geometry for posts, frame rails, and flat roof.
- Use a simplified triangular prism for pitched roof.
- Do not model trusses, fasteners, exact roof panels, foundations, curtains, doors, gutters, or product-specific profiles.
- Do not infer exact product model or capacity from footprint yet.

## Assumptions

- First pass represents a generic Kehoe dealer sales visualization, not a manufacturer-exact model.
- Existing saved projects will only contain `boat_port` after the new type is used or imported.
- Quote workflows can use ProductConfiguration `boat_port` later, but live quote import mapping has not been changed in this pass.

## Future Enhancements

- Quote import mapping for boat port line items.
- ProductConfiguration-specific options such as roof material, roof colour, port family, and attachment side.
- Better roof style variations if Kehoe-approved reference dimensions are provided.
- Connection hardware to floating docks.
- Customer PDF export support for boat port product previews.

## Reference Material Still Needed

- Standard Kehoe boat port dimensions and variants.
- Photos of installed covered boat ports.
- Product family/model references.
- Wall/support height defaults by model.
- Roof pitch, flat roof depth, and roof material options.
- Attachment rules to docks or lifts.

## Recommended First Component Scope

Add quote import support only after the Quote Builder has structured boat port fields. The current app-side render path can already consume `boat_port` ProductConfiguration records, but pasted quote JSON mapping intentionally remains unchanged.
