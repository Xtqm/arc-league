# Tasks

## 1. GLTF Loader, Procedural PBR Textures & Dual-Temperature Lighting

- [x] 1.1 Vendor `GLTFLoader.js` matching Three.js r160 into `vendor/` and verify ES module resolution in both browser/Electron and Node test environments (`npm run test:graphics`).
- [x] 1.2 Create `src/graphics/ArenaTextures.js` to procedurally synthesize tileable normal, roughness, and recessed emissive seam `CanvasTexture` maps with safe `null` fallback in headless Node environments, and verify unit tests pass when importing in Node without DOM (`npm run test:graphics`).
- [x] 1.3 Upgrade `src/graphics/Environment.js` (`createProceduralEnvironment`) and `src/graphics/scene.js` to add contrasting cyan/amber rim light strips, dual-temperature stadium directional rim lights, and subtle chasm up-lighting, verifying `test/graphics/cinematic_pipeline.test.js` passes cleanly.

## 2. Blender-Authored Magnetic Foundry Kit (`.glb` Assets)

- [x] 2.1 Author and export `assets/models/arena/arcfield_tile.glb` in Blender with chamfered dark basalt slab geometry (`Foundry_Armor`), recessed magnetic seam channels (`Foundry_Conduit`), applied transforms, and exact normalized bounds (`2.92m x 0.35m x 2.92m`), verifying dimensions and vertex budget via Blender scene inspection.
- [x] 2.2 Author and export `assets/models/arena/deflector_pylon.glb` and `assets/models/arena/wall_buttress.glb` in Blender featuring sculpted induction coils, chamfered armor ribs, and `Foundry_Armor`/`Foundry_Trim`/`Foundry_Conduit` material slots aligned strictly to `r = 2.1` pillar and `config.ARENA` wall collision envelopes, verifying bounds and clean `.glb` export.
- [x] 2.3 Author and export `assets/models/arena/stadium_segment.glb` and `assets/models/arena/stadium_pylon.glb` in Blender for the curved multi-tier Magnetic Colosseum backdrop and vertical light pylons with clean origins for radial instancing, verifying polygon budget and `.glb` export.

## 3. Asset Loader, Beveled Floor Instancing, Vectorfall & Foundry Perimeter

- [x] 3.1 Implement `src/graphics/ArenaAssetLoader.js` to asynchronously load, cache, normalize, and bind `Foundry_*` material slots for `assets/models/arena/*.glb` with safe headless/offline fallback, and add unit tests covering loader cache and fallback behavior (`npm run test:graphics`).
- [x] 3.2 Upgrade `src/entities/Arena.js` and `src/graphics/materials.js` to initialize synchronously with procedural beveled tile geometry and hot-swap `arcfield_tile.glb`, `deflector_pylon.glb`, and `wall_buttress.glb` upon load while preserving `TOTAL_TILES = 576`, `defaultTileMatrices` (`y = -0.175`), `instancedSlabs`/`instancedEdges`, and exact wall/pillar collision bounds; verify `npm run test:graphics` and `npm run test:combat` pass.
- [x] 3.3 Enhance `updateTiles(dt)` and `releaseDelegate()` in `src/entities/Arena.js` for physicalized Vectorfall (amber-to-crimson warning strobing, destabilizing pitch/roll tilt, downward chasm plunge tumble, and extra de-rez sparks) and verify `test/graphics/arena_floor_instancing.test.js` covers tilt reset and passes.
- [x] 3.4 Update `src/arena/hazards/SectorHazardBuilder.js` so sector theme transitions (`grid_01`–`grid_04`) tint procedural seam maps, `.glb` `Foundry_Conduit` materials, and rim/chasm lights cleanly; verify `npm run test:campaign` passes.

## 4. 360-Degree Magnetic Colosseum Backdrop & Chasm Mist

- [x] 4.1 Create `src/graphics/ArenaBackdrop.js` instancing `stadium_segment.glb` and `stadium_pylon.glb` (with procedural silhouette fallback) around the arena perimeter above an illuminated Null Void chasm floor (`y <= -18`) and scrolling chasm mist planes.
- [x] 4.2 Wire `ArenaBackdrop` into `src/graphics/scene.js` and `src/core/settings.js` so chasm mist planes scale or hide cleanly under the `Competitive` preset and `particles: false`, and add unit/integration tests verifying backdrop initialization, preset gating, and headless Node safety (`npm run test:graphics`).

## 5. End-to-End Visual & Performance Verification

- [x] 5.1 Run the full test suite (`npm test`) and a live WebGL/Electron render smoke check across `Competitive` and `Ultra` presets to confirm `.glb` hydration, draw-call discipline, balanced bloom on conduits/seams, and zero WebGL errors.
