# Kehoe 3D Product Library - Boat Port Spec

## Product Overview

Boat ports should be represented first as lightweight modular drive-on port visuals associated with a dock, lift, or standalone footprint. The first version should communicate floating boat/PWC port intent without detailed engineering.

## Current Implementation Status

- `boat_port` is supported as a first-class Dock Planner object type.
- `boat_port` is supported as a `ProjectRenderElementType`.
- `boat_port` is supported as a ProductConfiguration product type for future quote-driven previews.
- Rendered through the dedicated `KehoeBoatPort` product component in `src/components/render3d/products/KehoeBoatPort.tsx`.
- `ProjectDockModel` keeps a simple generic boat port fallback if dimensions are invalid.

## Target Scope For Next Implementation

- Lightweight floating drive-on port body.
- Raised side guide rails with an open entry end.
- Subtle segmented float/block surface detail.
- Center keel groove/channel hint.
- Small entry roller/hardware hints.
- Clean customer-facing plastic/floating dock material.

## Supported Dimensions And Options

- Current: length and width from Dock Planner object dimensions or ProductConfiguration dimensions.
- Current: position and rotation from the existing 2D-to-3D project render mapping.
- Current: safe ProductConfiguration defaults of 12 ft length by 6 ft width if dimensions are missing.
- Future: product model, port family, attachment mode, float module count, roller options, colour, and connection hardware.

## Visual Rules

- Preserve source footprint in Top View.
- Customer View should read as a modular floating drive-on port, not a canopy, solid block, or trailer.
- Raised side guides should leave the entry end visually open.
- Segment seams and center groove should stay subtle and avoid dark striping.
- Internal View can show debug footprint labels through the existing project render diagnostics.

## Material Rules

- Body: light blue-grey molded plastic / floating port material.
- Side guides: slightly darker blue-grey plastic.
- Hardware/rollers: muted metal.
- Avoid manufacturer-specific colours, logos, textures, or copied product styling until permissions and exact references are confirmed.

## Simplifications

- Use simple box geometry for the port body, side guides, grooves, and seams.
- Use small cylinder hints for entry rollers only.
- Do not model exact float module geometry, underside buoyancy, fasteners, molded texture, hinge hardware, winches, or product-specific profiles.
- Do not infer exact product model or capacity from footprint yet.

## Assumptions

- First pass represents a generic Kehoe dealer sales visualization, not a manufacturer-exact model.
- Existing saved projects will only contain `boat_port` after the new type is used or imported.
- Quote workflows can use ProductConfiguration `boat_port` later, but live quote import mapping has not been changed in this pass.

## Future Enhancements

- Quote import mapping for boat port line items.
- ProductConfiguration-specific options such as roller count, port family, colour, and attachment side.
- Better tapered or molded module shape if Kehoe-approved reference dimensions are provided.
- Connection hardware to floating docks.
- Customer PDF export support for boat port product previews.

## Reference Material Still Needed

- Standard Kehoe boat port dimensions and variants.
- Photos of installed ports.
- Product family/model references.
- Float module count and segmentation.
- Roller/hardware options.
- Attachment rules to docks or lifts.

## Recommended First Component Scope

Add quote import support only after the Quote Builder has structured boat port fields. The current app-side render path can already consume `boat_port` ProductConfiguration records, but pasted quote JSON mapping intentionally remains unchanged.
