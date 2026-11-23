# Design: Refine Humanoid Hand Rig

## Context

See `proposal.md` for motivation and high-level requirements.
In `src/graphics/materials.js`, `buildConstructLimbs` instantiates limb hierarchies for construct avatars.
The previous implementation used a flat box for the palm (`0.076 x 0.075 x 0.034`) and 2 short phalanx segments (`0.028` and `0.024`, total `0.052m`) with near-zero fan angles (`4°` to `-8°`), resulting in a chunky, stubby hand.

## Goals / Non-Goals

**Goals:**
- Construct an anatomically proportioned cyborg hand matching the uploaded reference image:
  - Tapered trapezoidal/wedge palm chassis (`0.044m` at wrist to `0.072m` at knuckles).
  - Arched knuckle bridge with natural finger root offsets.
  - Long, slender fingers longer than the palm (Middle finger `~0.070m` vs `0.048m` palm).
  - 3 distinct articulated phalanges per finger (proximal, intermediate, distal) with natural tapering.
  - Expressive radial splay (`15°` to `35°`) and opposable thumb posture.
  - Full compatibility with existing Armory cosmetic chassis skins and Hover-Palm disc carry.

**Non-Goals:**
- Skeletal bone weight skinning (this is a procedural hierarchical Three.js faceted construct rig).
- Modifying AI bot (Chevron Drone) or Boss Sentinel limb hierarchies.

## Decisions

### 1. Tapered Trapezoidal Palm Geometry
- **Decision**: Construct the palm chassis as a tapered faceted prism:
  - Narrow at the wrist base (`width: 0.044m`) where it interfaces cleanly with the glowing cylindrical wrist cuff.
  - Expanding outwards to the knuckle bridge (`width: 0.072m`).
  - Compact vertical height (`0.048m`), keeping the palm tight and agile.
  - Depth: `0.022m` at wrist tapering to `0.015m` at the knuckle line.
- **Alternative Considered**: A single `BoxGeometry`. *Rejected because square rectangular palms look unnatural and blocky regardless of finger styling.*

### 2. Knuckle Bridge Arch & Radial Splay Offsets
- **Decision**: Rather than aligning fingers on a flat row, calculate root knuckle positions along an arched curve:
  - **Index**: `x = 0.025`, `y = -0.048`, `z = 0.002`, splay angle = `+0.38 rad` (~+22°)
  - **Middle**: `x = 0.008`, `y = -0.052` (extended furthest forward), `z = 0.004`, splay angle = `+0.10 rad` (~+6°)
  - **Ring**: `x = -0.008`, `y = -0.050`, `z = 0.001`, splay angle = `-0.24 rad` (~-14°)
  - **Pinky**: `x = -0.025`, `y = -0.046`, `z = -0.002`, splay angle = `-0.52 rad` (~-30°)
- **Rationale**: An arched knuckle bridge combined with wide angular splay recreates the dynamic, athletic hand silhouette in the reference image.

### 3. Slender 3-Segment Phalanges
- **Decision**: For each of the four fingers, construct three distinct articulated phalanges:
  - **Proximal Phalanx**: Length `0.028 * scale`, width `0.011 * scale`, slight forward tilt (`0.14 rad`).
  - **Intermediate Phalanx**: Length `0.023 * scale`, width `0.009 * scale`, curled forward (`0.26 rad`).
  - **Distal Phalanx**: Length `0.019 * scale`, width `0.007 * scale`, curled further forward (`0.38 rad`).
  - Scales:
    - Middle: `scale = 1.0` (Total length `0.070m`, ~1.46x palm height)
    - Ring: `scale = 0.94` (Total length `0.066m`)
    - Index: `scale = 0.90` (Total length `0.063m`)
    - Pinky: `scale = 0.76` (Total length `0.053m`)
- **Rationale**: 3 segments provide the biomechanical joint lines seen in the reference photo, and tapering widths give a slender, elegant appearance.

### 4. Opposable Thumb Architecture
- **Decision**:
  - Root placed at the lateral base of the palm (`x = 0.038, y = -0.018, z = 0.012`).
  - Abducted laterally (`~45°`) and elevated forward (`~24°`).
  - Constructed with a sturdy proximal phalanx (`0.015 x 0.034 x 0.015`) and an angled distal tip (`0.013 x 0.026 x 0.013`).

### 5. Hover-Palm Kinetic Disc Clearance & Materials
- **Decision**:
  - The Hover-Palm disc is parented to `rightHand` at `(0, -0.06, 0.18)`.
  - The arched knuckle and cupped fingers frame the disc's perimeter with comfortable spatial clearance.
  - All palm and finger meshes use `suit` and `edgeMat` with `userData.part = 'chassis_suit'` and `hand.userData.fingerShards = [...]` so Armory chassis skins and edge glows apply seamlessly.

## Risks / Trade-offs

- **[Extra Mesh Count]** 15 shards per hand × 2 hands = 30 small meshes.
  → *Mitigation*: Each shard is a low-poly prism (12 triangles). Total overhead is negligible (< 400 triangles) and has zero noticeable impact on 60 FPS performance.
- **[Symmetric Inversion]** Left and right hands must mirror laterally without inverting front/back curvature.
  → *Mitigation*: Lateral multiplier `s = -1` (left) and `s = 1` (right) flips `x` positions and `z` splay rotations, while `y` vertical positioning and `x` forward curling remain identical.
