# Design: Custom Procedural Disc Shapes and Particle Effects

## Context

Tron Disc Arena renders Kinetic Discs using Three.js standard primitives defined in `src/graphics/materials.js`. While disc skin colors, emissive intensity, and trail parameters are modular, the 3D meshes are hardcoded to circular toruses (`TorusGeometry`).

This design introduces a procedural 2D cyber-shape generator (`src/graphics/DiscGeometryFactory.js`) that produces clean regular polygons and aggressive bladed shurikens with hollow centers, beveled rims, translucent inner faces, and synchronized palm-disc representations, without compromising competitive collision balance. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Provide procedural geometric disc generation for `circle`, `triangle`, `square`, `hexagon`, and multi-pointed `shuriken` variants.
- Enforce strict hitbox parity where all shapes are bounded by `config.DISC_R` (0.6m).
- Ensure perfect rotational symmetry ($N$-fold symmetry around origin) to guarantee smooth high-speed rotation during flight (`D.spin += dt * 26`).
- Synchronize the player character's Hover-Palm disc to reflect the equipped disc shape at palm scale (~0.46).
- Support catalog-configurable ricochet particle spark bursts on surface impact.
- Support live shape switching and code generation in the in-game Cosmetic Studio GUI.

**Non-Goals:**
- Variable gameplay stats or hitbox differences based on shape (all disc shapes remain 100% cosmetic for competitive fairness).
- Complex multi-part skeletal rigging for discs (discs remain rigid kinetic constructs).

## Architecture & Data Flow

```
                      +------------------------------------------+
                      | ArmoryCatalog.js                         |
                      | - shape: 'triangle' | 'shuriken_4' | ... |
                      | - particles: { ricochetSparks: true }    |
                      +---------------------+--------------------+
                                            |
                                            v
                      +------------------------------------------+
                      | CosmeticMaterialEngine.js                |
                      +---------------------+--------------------+
                                            |
                     +----------------------+----------------------+
                     |                                             |
                     v                                             v
        +-------------------------+                   +-------------------------+
        | DiscGeometryFactory.js  |                   | Disc.js / Player.js     |
        | - createOuterGeometry() |                   | - Thrown kinetic disc   |
        | - createFaceGeometry()  |                   | - Palm-held hover disc  |
        | - createWireframeGeo()  |                   | - Ricochet spark bursts |
        +-------------------------+                   +-------------------------+
                     |
                     v
        +-------------------------+
        | ArmoryPreviewScene.js   |
        | CosmeticStudioModal.js  |
        | (3D Turntable Preview)  |
        +-------------------------+
```

## Decisions

### 1. Dedicated Procedural Shape Factory (`DiscGeometryFactory.js`)
- **Decision**: Centralize all procedural 2D paths, beveled extrusions, and face geometry generation into a dedicated factory module `src/graphics/DiscGeometryFactory.js`.
- **Rationale**: Isolates 2D vector path math and Three.js geometry construction from gameplay entities and UI code. Supports easy expansion for future seasonal shapes.
- **Alternatives Considered**: Inlining procedural math into `materials.js` or `Disc.js`. Rejected due to file bloating and poor testability.

### 2. Rotational Symmetry and Normalization
- **Decision**: All procedural 2D shapes are defined with $N$-fold rotational symmetry centered at $(0, 0)$, where the maximum outer vertex distance is clamped exactly to `radius` (`config.DISC_R` = 0.6m for full disc; palm disc = $0.6 \times 0.46 \approx 0.276\text{m}$).
- **Rationale**: Prevents centrifugal wobbling or off-axis center-of-mass shifts when spinning at 26 radians per second, and prevents visual mesh clipping through physical arena boundaries.

### 3. Geometry Swapping in `CosmeticMaterialEngine`
- **Decision**: When `applyDiscSkin` encounters a disc mesh whose `userData.currentShape` differs from the requested skin shape, cleanly dispose the existing geometry buffers and assign the newly generated procedural geometry buffers in-place.
- **Rationale**: Preserves the parent `THREE.Group` hierarchy, existing scene graph attachments, position/velocity vectors, and PointLight rigs without requiring entity re-instantiation.

### 4. Shape-Matched Wireframe Overlays
- **Decision**: Wireframe overlays are created by generating the matching outer procedural geometry with a slight scale delta ($1.04\times$) and `wireframe: true`.
- **Rationale**: Replaces the circular torus wireframe assumption with an overlay that perfectly hugs the facets and points of triangles, squares, and shurikens.

### 5. Catalog-Driven Particle Sparks
- **Decision**: In `src/entities/Disc.js`, surface ricochets check `skin.particles?.ricochetSparks`. If enabled, a directional particle burst is triggered using `skin.particles.sparkColorHex` and `sparkCount` via `burst()`.
- **Rationale**: Allows specific exotic discs to emit intense sparks or neon shards on impact while standard discs retain default clean reflections.

## Risks / Trade-offs

- **[Risk] ExtrudeGeometry vertex buffer allocation overhead.**
  → *Mitigation*: Procedural geometries are generated once when the skin is applied or swapped and cached per active instance; during active flight frames, zero allocations occur.
- **[Risk] WebGL memory leak on rapid skin switching.**
  → *Mitigation*: Explicitly call `.dispose()` on previous `outerMesh.geometry`, `faceMesh.geometry`, and `wireframeMesh.geometry` before swapping.
- **[Risk] Hover-Palm disc clipping with character armor.**
  → *Mitigation*: Palm-scale procedural shapes are scaled to $0.46\times$ radius with matched thickness ($0.042\text{m}$), preserving clearance above the construct hand.
