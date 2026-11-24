# Proposal

## Why

Following the initial implementation of the ballistic disc architecture, two visual issues remain:
1. The central hub is rendered as a clunky, mechanical spoke-wheel (resembling an industrial alloy rim or bicycle cog) with a static radius that crowds and overlaps the inner boundaries of non-circular disc shapes (such as squares, triangles, and shurikens).
2. Discs appear blindingly bright and blurry in the Armory 3D turntable preview bay due to uncalibrated luminance stacking (2.4 emissive intensity + 2.4 internal point light at close range + full-arena bloom filter), blowing out geometric facets and beveled edges into an over-saturated neon haze.

Replacing the clunky wheel with a dynamically sized, floating faceted hardlight energy core and calibrating the Armory view's lighting and bloom will make the discs look sharp, futuristic, and visually balanced across all procedural shapes.

## What Changes

- **Faceted Hardlight Energy Core with Dynamic Clearance Sizing**:
  - Replace the mechanical spoke-wheel hub with a floating, faceted 3D energy crystal (an octahedron/diamond hardlight prism suspended within a slender magnetic containment halo).
  - Dynamically calculate the shape's minimum inner boundary clearance radius ($R_{\text{clearance}}$) for each procedural shape (`circle`, `hexagon`, `square`, `triangle`, `shuriken_3`, `shuriken_4`), sizing the energy core to maintain a guaranteed floating clearance margin so it never overlaps or touches the inner disc hull.
  - Energize the crystal facets and halo with `secondaryColor` at calibrated emissive intensity.
- **Armory View Lighting & Bloom Calibration**:
  - Calibrate the disc's base `emissiveIntensity` from 2.4 down to 1.2–1.4 so saturated colors (cyan, lime, amber, crimson) remain vivid and readable rather than bleaching out to white.
  - Lower the preview turntable's internal point light intensity from 2.4 to 0.8 to eliminate point-blank self-illumination glare on beveled edges.
  - Calibrate the Armory preview's bloom pass (adjusting luminance threshold and strength) to produce a crisp, atmospheric neon halo while preserving clean, razor-sharp geometric contours.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `armory-catalog`: Update `Dynamic Identity Disc Cosmetic Material Application` and `Turntable 3D Cosmetic Preview Renderer` requirements to specify dynamic clearance sizing for the central hardlight energy core and calibrated non-blinding preview lighting.

## Impact

- **Affected Files**:
  - `src/graphics/DiscGeometryFactory.js`: Refactor `createHubGeometry` to build dynamically sized faceted prism and halo geometry based on procedural shape clearance.
  - `src/graphics/materials.js`: Calibrate default disc emissive intensities and PointLight radiance.
  - `src/armory/CosmeticMaterialEngine.js`: Apply calibrated emissive scaling to the hardlight energy core and kinetic rim.
  - `src/armory/ArmoryPreviewScene.js`: Tune studio lighting and preview bloom parameters to prevent close-up glare and blurring.
- **Dependencies**: No new external dependencies (pure Three.js WebGL).
- **Backwards Compatibility**: 100% compatible with existing catalog skins, loadouts, and test suites.
