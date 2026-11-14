# Design: Hybrid Arena Floor Instancing

## Context

See `proposal.md` for motivation. The arena floor has $24 \times 24 = 576$ tiles. Today, each tile has a distinct `THREE.Group` with a `slabMesh` and `edgeMesh`, creating 1,152 draw calls. Most tiles remain completely intact throughout combat; typically only 1–4 tiles are ever destabilizing, shaking, or falling into the void at any instant.

## Goals / Non-Goals

**Goals:**
- Reduce arena floor draw calls from 1,152 to 2 (plus ~2 per active warning tile).
- Preserve the exact metallic PBR appearance, specular reflections, neon edge glow, and warning animations.
- Maintain seamless compatibility with sector hazard theming and collision queries (`getTileAt`, `worldToTile`).

**Non-Goals:**
- Changing tile dimensions ($46\text{m} \times 2 / 24 = 3.83\text{m}$), grid resolution, warning duration (0.75s), or regeneration delay (12.0s).
- Altering void survival mechanics or lip colliders.

## Decisions

### Decision 1: Hybrid Instanced + Dynamic Mesh Architecture
- **Rationale**: Three.js `InstancedMesh` supports per-instance transforms and colors, but does not support per-instance material swapping, emissive intensity pulsing, or transparency out of the box without complex custom shaders. By delegating the 1–4 actively warning tiles to a pool of standard dynamic meshes, we achieve full draw-call consolidation for the 570+ static tiles while retaining 100% of the custom warning shaders and physics.
- **Alternatives Considered**:
  - *Full custom instanced shader*: Requires reimplementing PBR standard lighting, environment map reflections, and emissive pulsing in custom GLSL. High risk of visual mismatch with walls and characters.
  - *Keep separate meshes*: Continues generating 1,152 draw calls every frame.

### Decision 2: Zero-Scale Matrix Hiding for Instanced Slots
- **Rationale**: When a tile is handed off to a dynamic mesh, its 4x4 transform matrix in `InstancedMesh` is scaled to `(0, 0, 0)` and `instanceMatrix.needsUpdate = true` is set. When the tile regenerates, its identity transform is restored.
- **Alternatives Considered**:
  - *Rebuilding the InstancedMesh geometry buffers on every hit*: Expensive CPU-GPU buffer re-upload. Setting scale to zero in the instance matrix buffer takes less than 0.01ms.

## Risks / Trade-offs

- **[Handoff pop/jitter during swap]** → Mitigation: The dynamic mesh is positioned at the exact same world coordinate and Y-offset at the instant of handoff, ensuring zero perceptible visual seam.
- **[Dynamic mesh pool starvation]** → Mitigation: Even in extreme gameplay (e.g. boss area-of-effect tile barrage), no more than 16 tiles destabilize at once. Sizing the pool to 32 instances guarantees capacity with zero allocation during combat.
