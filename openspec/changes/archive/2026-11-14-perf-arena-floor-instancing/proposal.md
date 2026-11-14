# Proposal: Hybrid Arena Floor Instancing

## Why

The Arc League arena consists of a 24x24 destructible floor grid (576 tiles). In the current engine, every tile is an independent `THREE.Group` holding a `THREE.Mesh` (slab) and a `THREE.LineSegments` (edges), generating **1,152 separate draw calls every frame** solely for the floor. This places severe CPU/GPU driver strain on laptops with integrated graphics (Intel Iris/UHD) and mobile devices.

By implementing a **hybrid instanced grid**, the 570+ static intact tiles are drawn in just **2 draw calls** via `THREE.InstancedMesh`. When a tile is struck, it is seamlessly swapped into an active dynamic mesh using the exact original PBR materials, emissive warning shaders, and vertical drop animations—achieving a 99% draw call reduction while preserving 100% of the game's iconic visual appeal.

## What Changes

- **Instanced Static Grid**: Consolidate intact and dormant arena slabs into one `THREE.InstancedMesh` and edge lines into a second `THREE.InstancedMesh`.
- **Dynamic Warning Delegate Pool**: Maintain a small pool (up to 8) of dynamic tile meshes. When an intact tile is struck by a disc or hazard, its instance in the `InstancedMesh` is scaled to zero (hidden), and a dynamic mesh takes over to render the warning strobe, physical shake ($\pm 0.05\text{m}$), and void plunge.
- **Reconstruction Hand-Off**: Once a rebuilding tile returns to ground elevation ($y = 0$), it returns to the static `InstancedMesh` and releases its dynamic pool slot.
- **Sector Theme Palette Updates**: Update instanced material and color attributes dynamically when changing sector campaign themes.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `arena-environment`: Add requirement for hybrid instanced grid rendering with dynamic tile state delegation.

## Impact

- **Affected Files**: `src/entities/Arena.js`, `src/graphics/materials.js`, `src/arena/hazards/SectorHazardBuilder.js`.
- **Aesthetic**: 100% identical look, reflections, neon edge glow, and warning animations.
- **Performance**: Slashes total scene draw calls from ~1,250 down to ~35, doubling or tripling frame rates on integrated GPUs.
