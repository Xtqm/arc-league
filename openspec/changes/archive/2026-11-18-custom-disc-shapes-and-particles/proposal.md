# Proposal: Custom Procedural Disc Shapes and Particle Effects

## Why

All Kinetic Discs in Arc League currently share a single, fixed circular torus geometry. While color and emissive shaders are customizable, the visual silhouette remains identical across all loadouts.

Introducing procedural 2D cyber-shapes (such as Tri-Blade Deltas, Quantum Quads, Hex-Grid Cores, and aggressive notched Shurikens) with catalog-configurable particle bursts allows players to express diverse visual styles while strictly preserving the game's competitive skill-based integrity through identical collision radii.

## What Changes

- **Procedural Disc Shape Factory (`src/graphics/DiscGeometryFactory.js`)**:
  - Procedural generation of beveled 2D cyber-shapes with hollow center hubs, translucent inner faces, and matching retro wireframes.
  - Supported initial shapes:
    - `circle`: Classic circular torus.
    - `triangle`: High-speed Delta tri-blade with beveled aerodynamic edges.
    - `square`: Quantum Quad diamond rotor plate.
    - `hexagon`: Nanite Hex-Grid cellular disc.
    - `shuriken_3` & `shuriken_4`: Aggressive multi-bladed energy stars with perimeter notches.
- **Hitbox Parity & Rotational Symmetry**:
  - All procedural shapes are normalized so their maximum outer vertex distance from origin $(0,0)$ strictly matches `config.DISC_R` (0.6m), ensuring identical wall and player hitboxes with zero gameplay advantages.
  - Symmetrical origin centering ($n$-fold rotational symmetry) prevents eccentric wobbling during the 26 rad/s flight spin.
- **Cosmetic Engine & Mesh Synchronization (`src/armory/CosmeticMaterialEngine.js`)**:
  - `applyDiscSkin()` dynamically updates or swaps rim, face, and wireframe overlay geometries to match the skin's specified `shape`.
  - Automatically updates the player construct rig's Hover-Palm floating disc ([src/graphics/materials.js#L527](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/graphics/materials.js#L527)) to match the equipped disc's shape at palm scale (~0.46).
  - Ensures clean disposal of detached geometries to prevent WebGL memory leaks.
- **Shape-Matched Retro Wireframe**:
  - The wireframe overlay dynamically mirrors the exact procedural polygon geometry of the active disc rather than forcing a circular torus wireframe.
- **Catalog-Defined Particle Effects (`src/armory/ArmoryCatalog.js` & `src/entities/Disc.js`)**:
  - Allows catalog disc skins to optionally define `particles`:
    ```javascript
    particles: {
      ricochetSparks: true,
      sparkColorHex: '#ff0055',
      sparkCount: 16
    }
    ```
  - Spawns customized particle spark bursts when the disc ricochets off arena walls, shields, or obstacles.
- **Cosmetic Studio GUI Integration (`src/ui/modals/CosmeticStudioModal.js`)**:
  - Exposes a `Shape` dropdown selector (`Circle`, `Triangle`, `Square`, `Hexagon`, `Shuriken 3`, `Shuriken 4`) and particle options in the live developer studio.
  - Live turntable updates immediately when switching shapes.

## Capabilities

### Modified Capabilities
- `armory-catalog`: Extends the cosmetic catalog specification with requirements for procedural disc geometry shapes, palm disc mesh synchronization, shape-matched wireframe overlays, and catalog-driven ricochet particle customization.

## Impact

- **Affected Systems**:
  - `src/graphics/DiscGeometryFactory.js` (new procedural shape builder)
  - `src/graphics/materials.js` (integration with factory for initial disc mesh generation)
  - `src/armory/CosmeticMaterialEngine.js` (geometry swapping, wireframe alignment, palm disc sync)
  - `src/armory/ArmoryCatalog.js` (shape & particle metadata schema, new launch skin variants)
  - `src/entities/Disc.js` (skin-driven wall ricochet particle triggers)
  - `src/ui/modals/CosmeticStudioModal.js` (shape selector & export updates)
  - `test/armory/` & `test/graphics/` (unit and integration tests)
- **Zero Gameplay Balance Disruption**: Physics collision math in `Disc.js` continues to use standard `config.DISC_R` radial bounds.
