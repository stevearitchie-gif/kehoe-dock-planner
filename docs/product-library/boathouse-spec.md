# Kehoe Boathouse Product Spec

## Product Name

Kehoe Boathouse, covered boat shelter visualization.

## Current Implementation Status

Boathouse v1 is implemented as a lightweight parametric sales visualization for the 2D Dock Planner and 3D renderer. It is intended to communicate footprint, wall height, roof form, slip count, door/opening style, and finish direction. It is not an engineering-grade building model.

## Supported Dimensions And Options

- Length and width use the existing Dock Planner object footprint.
- Wall Height defaults to 9 ft and represents side/eave height from base to roof support.
- Roof Rise defaults to 3 ft and represents the added height above the wall/eave for a gable roof.
- Roof Type supports Flat and Gable.
- Slip Count supports 1 or 2 slips.
- Door Style supports Open, Single Door, Double Doors, Two Slip Doors, and None.
- Wall Finish supports Neutral, Wood, and Metal.
- Roof Finish supports Neutral, Metal, and Shingle.

## Default Configuration

- `wallHeightFt`: 9
- `roofRiseFt`: 3
- `roofType`: `gable`
- `slipCount`: 1
- `doorStyle`: `open`
- `wallFinish`: `neutral`
- `roofFinish`: `metal`

## 2D Editor Rules

The 2D editor represents a boathouse as a rectangular footprint with simple visual cues for roof type, slip lanes, and front door/opening style. The footprint remains the source of truth for length, width, position, and rotation.

The right-side details panel exposes boathouse-specific fields for wall height, roof rise, roof type, slip count, door style, wall finish, and roof finish.

## 3D Visual Rules

- Preserve the exact 2D footprint when viewed from Top camera.
- Render vertical posts and wall planes to show wall/eave height.
- Render a flat roof as a simple rectangular roof slab.
- Render a gable roof with two clean roof planes and a ridge running along the boathouse length.
- Render slip lane guides for two-slip layouts.
- Render front openings or door panels based on door style.
- Use clean, opaque, customer-facing materials to avoid transparency artifacts.
- Keep Customer View simple and sales-friendly.
- Internal View may use brighter diagnostic colors but should preserve the same geometry.

## Simplifications

- No structural engineering details, fasteners, trusses, foundations, snow load logic, door hardware, or exact manufacturer profiles are included.
- Roof thickness, wall thickness, posts, and overhangs are visual defaults.
- Door styles are represented as simple front panels or openings.
- Slip lanes are visual guides only.

## Future Enhancements

- Confirm standard Kehoe boathouse dimensions and construction options.
- Add more accurate wall panel, roof panel, and trim profiles.
- Add optional open sides, windows, roof overhang presets, truss hints, and shoreline/foundation context.
- Add quote-builder ProductConfiguration support once product options are finalized.
- Add customer PDF/export presentation notes for boathouse-specific options.

## Reference Material Still Needed

- Standard residential boathouse sizes and slip dimensions.
- Confirmed wall/eave height options.
- Confirmed roof pitch/rise options.
- Finish/material options offered for walls and roofing.
- Door/opening option naming used in sales quotes.
- Photos or drawings approved for internal reference.
