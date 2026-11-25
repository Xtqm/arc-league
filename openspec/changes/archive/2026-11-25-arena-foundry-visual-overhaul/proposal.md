# Proposal: Arena Foundry Visual Overhaul

## Why

While Arc League's lore defines **The Arcfield** as a magnetic containment stadium suspended over a Null Void chasm, the live 3D arena currently renders flat solid-color box tiles, basic cylinder pillars, and simple perimeter walls inside empty black fog (`#01060a`). Pairing Blender-authored hard-surface `.glb` foundry architecture with Three.js procedural PBR surface detail, physicalized Vectorfall presentation, dual-temperature stadium rim lighting, and chasm atmospheric mist establishes an unmistakable visual identity distinct from classic Tron grid visuals.

## What Changes

- Author a modular Blender-to-`.glb` **Magnetic Foundry Architecture Kit** (`assets/models/arena/`) via Blender MCP, containing sculpted hard-surface meshes with standardized material slots (`Foundry_Armor`, `Foundry_Trim`, `Foundry_Conduit`):
  - `arcfield_tile.glb`: beveled dark basalt/metallic slab with recessed magnetic seam channels, instanced 576 times.
  - `deflector_pylon.glb`: sculpted induction-coil ricochet pillar aligned strictly to the canonical `r = 2.1` physics collision cylinder.
  - `wall_buttress.glb`: industrial perimeter containment wall framing and induction ribs aligned to `config.ARENA`.
  - `stadium_segment.glb` & `stadium_pylon.glb`: curved multi-tiered colosseum megastructure segments and vertical light pylons forming a 360-degree backdrop.
- Vendor `GLTFLoader.js` (Three.js r160) into `vendor/` and introduce `ArenaAssetLoader` to load and normalize `.glb` arena assets asynchronously while keeping synchronous procedural geometry fallbacks so Node tests and first-frame rendering never block or break.
- Upgrade the 24x24 destructible floor grid (`src/entities/Arena.js`, `src/graphics/materials.js`, `src/graphics/ArenaTextures.js`) with procedural normal, roughness, and recessed emissive seam maps while preserving hybrid 576-tile `InstancedMesh` batching and all physics collision dimensions.
- Physicalize **Vectorfall** tile destabilization and reconstruction: add destabilizing tile tilt/wobble during warning, amber-to-crimson magnetic overload strobing, downward chasm spark/mist bursts on tile drop, and glowing chasm visibility beneath open void gaps.
- Add a **360-degree Magnetic Colosseum** stadium backdrop (`src/graphics/ArenaBackdrop.js`) instancing the sculpted stadium ring/pylon `.glb` modules above a lit Null Void chasm with layered chasm atmospheric mist.
- Expand arena lighting (`src/graphics/scene.js`, `src/graphics/Environment.js`, `src/arena/hazards/SectorHazardBuilder.js`) with contrasting cyan/amber stadium rim/accent lighting and sector-themed conduit/seam palettes (`grid_01`–`grid_04`).
- Ensure all new visual layers respect existing quality presets (`Competitive` through `Ultra`), `particles`/`bloom`/`shadows` toggles, and graceful headless/Node test fallback.

## Capabilities

### New Capabilities

### Modified Capabilities
- `arena-environment`: Enhance tile geometry/materials, physicalized Vectorfall warning/plunge visuals, sculpted induction-coil walls/pillars, and a 360-degree Magnetic Colosseum stadium backdrop hydrated from authored architectural `.glb` bundles with synchronous procedural fallback while keeping 24x24 grid physics and hybrid instancing invariants.
- `cinematic-rendering`: Add procedural PBR surface detail maps (normal/roughness/emissive seam masks), contrasting stadium rim lighting, and chasm atmospheric mist/haze layers gated by quality settings and headless-safe fallbacks.

## Impact

- **Dependencies & Assets**: Adds `vendor/GLTFLoader.js` (Three.js r160) and `assets/models/arena/*.glb` (`arcfield_tile.glb`, `deflector_pylon.glb`, `wall_buttress.glb`, `stadium_segment.glb`, `stadium_pylon.glb`).
- **Affected modules**: `src/entities/Arena.js`, `src/graphics/ArenaAssetLoader.js`, `src/graphics/ArenaTextures.js`, `src/graphics/ArenaBackdrop.js`, `src/graphics/materials.js`, `src/graphics/scene.js`, `src/graphics/Environment.js`, `src/graphics/particles.js`, `src/arena/hazards/SectorHazardBuilder.js`, `src/core/settings.js`.
- **Tests**: Preserves `test/graphics/arena_floor_instancing.test.js`, `test/graphics/cinematic_pipeline.test.js`, `test/campaign/campaign_phase3.test.js`, and adds loader/hydration, backdrop preset gating, and Vectorfall tilt-reset tests.
