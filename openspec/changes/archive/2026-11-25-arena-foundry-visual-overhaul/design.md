# Design: Arena Foundry Visual Overhaul

## Context

See [proposal.md](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/openspec/changes/arena-foundry-visual-overhaul/proposal.md) for motivation. Today:
- `src/entities/Arena.js` renders 576 tiles via `instancedSlabs` (`BoxGeometry`) and `instancedEdges` (`EdgesGeometry`) plus a 32-item `delegatePool` for warning/falling/rebuilding tiles. `test/graphics/arena_floor_instancing.test.js` imports `Arena.js` directly in Node and asserts `TOTAL_TILES === 576`, `instancedSlabs`, `instancedEdges`, `defaultTileMatrices` position `y === -0.175`, and `claimDelegate`/`releaseDelegate` behavior.
- `vendor/` ships `three.module.js` (r160) without `GLTFLoader.js`, and `assets/` currently contains only 2D branding images.
- `src/graphics/scene.js` sets a near-black background (`0x01060a`), simple linear `Fog(0x02090f, 55, 170)`, one `HemisphereLight`, and one shadow-casting `DirectionalLight`.
- `src/graphics/Environment.js` synthesizes a cool-only PMREM cubemap (`createProceduralEnvironment`).
- `src/arena/hazards/SectorHazardBuilder.js` recolors `tileMatIntact`, `tileEdgeMatIntact`, `wallMat`, `glowMat`, and `delegatePool` materials per campaign grid (`grid_01`..`grid_04`).

## Goals / Non-Goals

**Goals:**
- Author a cohesive, sculpted Blender-to-`.glb` **Foundry Architecture Kit** (`assets/models/arena/*.glb`) and hydrate it cleanly in Three.js via `GLTFLoader.js` (r160) so tiles, perimeter buttresses, deflector pylons, and the 360-degree Magnetic Colosseum backdrop look hand-crafted rather than code-assembled boxes/cylinders.
- Pair `.glb` geometry with procedural PBR surface maps (`ArenaTextures.js`), physicalized Vectorfall presentation (warning tilt, amber/crimson overload strobing, chasm sparks), contrasting cyan/amber rim lighting, and quality-gated chasm mist.
- Keep `TOTAL_TILES === 576`, `defaultTileMatrices` Y-offset (`-0.175`), `instancedSlabs`/`instancedEdges` contract, synchronous `Arena.js` module initialization, and all physics collision dimensions (`config.ARENA`, `pillars` radii, tile bounds) 100% intact.

**Non-Goals:**
- Changing gameplay mechanics, disc bounce physics, tile hitboxes, or campaign hazard logic.
- Replacing the 24x24 square grid topology with non-rectangular tiles (would break `worldToTile`/`tileToWorld` physics and existing tests; instead, sculpted beveled slabs + recessed hex/circuit seam channels preserve exact collision).
- Overhauling character models or combat animations (scoped separately to `construct-rig-animation-pipeline`, which will reuse the vendored `GLTFLoader.js`).

## Decisions

### 1. Vendored `GLTFLoader.js` (r160) & `ArenaAssetLoader` with Synchronous Procedural Fallback
- **Decision:** Vendor `GLTFLoader.js` matching Three.js r160 into `vendor/GLTFLoader.js`, create `src/graphics/ArenaAssetLoader.js` to asynchronously load and cache `assets/models/arena/*.glb`, and hydrate `Arena.js` and `ArenaBackdrop.js` once loaded—while keeping initial module evaluation 100% synchronous using procedural beveled fallback geometry.
- **Rationale:** `test/graphics/arena_floor_instancing.test.js` and `main.js` expect `Arena.js` exports (`instancedSlabs`, `instancedEdges`, `delegatePool`, `walls`, `pillars`) to exist synchronously at import time, and Node tests run without a DOM/HTTP server. Hot-swapping `.geometry` on `instancedSlabs` / delegate slabs and attaching hydrated `.glb` meshes to wall/pillar/backdrop anchors preserves zero-breakage startup and testing.
- **Alternative Considered:** Pure procedural Three.js geometry only. Rejected because sculpted stadium seating ribs, induction coils, and beveled multi-channel tiles authored in Blender look dramatically richer and stay easier to iterate visually.

### 2. Standardized Blender Material Slots for Sector Tinting
- **Decision:** Author all `.glb` arena kit assets in Blender using standardized material slot names:
  - `Foundry_Armor` (dark matte basalt/obsidian metallic plating)
  - `Foundry_Trim` (brushed titanium / chamfered accent metal)
  - `Foundry_Conduit` (emissive magnetic seam/coil channel)
  On load, `ArenaAssetLoader` binds `Foundry_Armor` and `Foundry_Conduit` to shared `wallMat` / `glowMat` / sector-tinted materials so `SectorHazardBuilder` updates `.glb` conduits and armor across `grid_01`–`grid_04` automatically.
- **Rationale:** Avoids baking static cyan-only textures that would clash with Solar Sail amber (`grid_02`), Sea of Simulation violet (`grid_03`), or Core Pinnacle crimson/gold (`grid_04`).

### 3. Procedural Canvas PBR Texture Factory (`ArenaTextures.js`)
- **Decision:** Generate tileable 256x256 / 512x512 `CanvasTexture` maps (normal map from heightfield Sobel filter, roughness map, and recessed emissive seam mask) once at graphics init when `document.createElement('canvas')` is available, returning `null` safely in Node headless environments.
- **Rationale:** Adds micro-surface grain, brushed metal wear, and circuit detail onto `.glb` and fallback meshes with negligible disk footprint and zero external image fetches.

### 4. Beveled Tile Geometry + Hybrid Instancing Preservation
- **Decision:** Author `arcfield_tile.glb` normalized in Blender to `(config.TILE_W - 0.08, 0.35, config.TILE_W - 0.08)` centered around local `(0,0,0)` (matching `-0.175` vertical placement). When hydrated, swap `tileGeo` / `instancedSlabs.geometry` and `delegatePool` `slabMesh.geometry` cleanly while keeping `instancedEdges` (`isLineSegments === true`) and `defaultTileMatrices` untouched.
- **Rationale:** Gives all 576 floor tiles crisp sculpted bevels and recessed channels in a single instanced draw call without breaking `arena_floor_instancing.test.js`.

### 5. Physicalized Vectorfall Presentation
- **Decision:** Extend `updateTiles(dt)` for `delegatePool` tiles so `TILE_WARNING` transitions from sector primary color toward high-intensity amber/crimson (`#ff7b1a` -> `#ff2244`) with slight randomized pitch/roll tilt (`+-0.06 rad`) synced to jitter, and `TILE_FALLEN` tumbles slightly as it plunges while emitting downward spark/mist particles into a glowing chasm plane (`y = -18`). Reset delegate rotation cleanly inside `releaseDelegate()`.
- **Rationale:** Makes Vectorfall feel physically heavy and volatile while costing zero extra draw calls for intact tiles.

### 6. Instanced 360-Degree Magnetic Colosseum & Chasm Haze (`ArenaBackdrop.js`)
- **Decision:** Create `src/graphics/ArenaBackdrop.js` to surround the arena (`radius ~ 72m–115m`) with:
  - `stadium_segment.glb` instanced in a 360-degree ring (tiered colosseum seating/megastructure ribs) and `stadium_pylon.glb` instanced as 16–24 vertical cyan/amber induction pylons (with lightweight procedural fallback if uncached/headless).
  - A deep glowing Null Void chasm glow plane + fog gradient below `y = -18`.
  - Two or three low-cost scrolling chasm mist planes (`y = -2.5`, `-8.0`) using a soft procedural radial noise texture, hidden automatically when `particles === false` or `Competitive` preset is active.
- **Rationale:** Instancing modular `.glb` segments delivers monumental stadium architecture in a handful of draw calls with zero impact on playable arena bounds.

### 7. Dual-Temperature Lighting & PMREM Upgrade
- **Decision:** Update `Environment.js` (`createProceduralEnvironment`) to include warm amber (`#ff7b1a`) counter-rim strips opposite the cool cyan (`#00d8ff`) rim strips, and add two non-shadow-casting stadium rim `DirectionalLight`s + subtle chasm up-light in `scene.js` (tinted by `SectorHazardBuilder`).
- **Rationale:** Matches the cyan-vs-amber specular interplay visible on dark beveled basalt and Construct shards in the key art at minimal GPU cost.

## Risks / Trade-offs

- **Async `.glb` hydration vs. synchronous `Arena.js` imports & tests** -> `Arena.js` initializes synchronously with procedural fallback geometry so `arena_floor_instancing.test.js` and immediate renders always succeed, then hot-swaps `.glb` geometries/meshes safely once `ArenaAssetLoader` resolves in browser/Electron.
- **Blender `.glb` coordinate axis / bounding-box drift** -> Enforce Y-up, `+Y` scale normalization, applied transforms (`Ctrl+A`), and explicit bounding-box checks in Blender export scripts (`arcfield_tile.glb` exactly `2.92 x 0.35 x 2.92`, `deflector_pylon.glb` within `r = 2.1` footprint) before writing to `assets/models/arena/`.
- **Over-bright bloom on tiled seams or stadium conduits** -> Keep intact tile and backdrop conduit emissive intensity below `CinematicComposer`'s bloom threshold (`~0.92`) so only Vectorfall warning strobes, cores, and discs bloom strongly.
- **Fill-rate cost of chasm mist on low-end/mobile GPUs** -> Limit to 2–3 coarse mist planes and auto-disable mist on `Competitive` preset or when `particles` setting is off.
