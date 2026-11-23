# Proposal: Refine Humanoid Hand Rig

## Why

The player athlete construct hands currently look chunky and unnatural because the palm was implemented as a large square box (`0.076 x 0.075 x 0.034`) while the fingers are short 2-segment stubs (`0.052m` total length, 30% shorter than the palm) with near-parallel alignment (`4°` to `-8°`). To match the movie-authentic, athletic cyborg aesthetic from the reference image, the hand rig needs an anatomical overhaul featuring long, slender, 3-segment articulated fingers with dynamic radial splay and an arched knuckle bridge attached to a compact, tapered trapezoidal palm.

## What Changes

- **Compact Tapered Palm Chassis**: Replace the flat rectangular block palm with an anatomically tapered, faceted trapezoidal chassis (`~0.044m` width at wrist matching the glowing cuff, expanding to `~0.072m` width at the knuckle bridge, with a compact height of `~0.048m`).
- **Arched Knuckle Bridge**: Position the finger root pivots along a natural biomechanical knuckle arch where the middle knuckle is furthest forward and the ring/pinky/index knuckles slope naturally.
- **Long, Slender 3-Segment Articulated Fingers**:
  - Re-proportion fingers so they are longer than the palm (Middle: `~0.072m`, Index: `~0.064m`, Ring: `~0.067m`, Pinky: `~0.054m`).
  - Divide each finger into 3 distinct faceted phalanges (proximal, intermediate, distal) with subtle joint gaps revealing glowing emissive undertrim.
  - Taper segments from `~0.011m` width at the base to `~0.007m` at the distal fingertip.
- **Expressive Radial Splay**: Implement natural fan angles across the digits (Index: `~+22°`, Middle: `~+6°`, Ring: `~-14°`, Pinky: `~-30°`) providing an open, athletic silhouette.
- **Opposable Thumb Refinement**: Angle the thumb laterally (`~45°`) and elevate forward (`~25°`) from the thenar eminence with proximal and distal phalanges.
- **Hover-Palm Disc Clearance & Cosmetic Compatibility**: Ensure the cupped fingers gracefully frame the palm-mounted kinetic disc at `(0, -0.06, 0.18)` without intersecting, and maintain all `chassis_suit` and `chassis_trim` part tags for Armory shaders.

## Capabilities

### Modified Capabilities

- `program-humanoid-rigs`: Update `Hierarchical Anatomical Humanoid Rig` to require that Player Athlete Rigs feature anatomically proportioned hands with a compact tapered palm, arched knuckle placement, and long 3-segment articulated fingers exhibiting radial splay.

## Impact

- **Code Files**:
  - `src/graphics/materials.js`: Overhaul the humanoid hand section in `buildConstructLimbs`.
- **Tests**:
  - `test/graphics/`: Update any unit tests verifying hand shard structure, counts, or hierarchy.
- **Cosmetics**:
  - 100% backward-compatible with all existing Armory chassis skins, shaders, and materials.
