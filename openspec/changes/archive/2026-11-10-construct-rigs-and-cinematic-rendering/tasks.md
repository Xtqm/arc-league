# Tasks

## 1. Magnetic Construct Rigs & Hover-Palm Kinematics

- [x] 1.1 Refactor [`makeProgram`](../../../src/graphics/materials.js) to construct three distinct faceted archetypes (`player`, `drone`, `sentinel`) with flat-shaded obsidian-slate shards, glowing chest cores, hairline `EdgesGeometry` edge trims, HDR emissive `litMaterial`, Hover-Palm disc mounting on `rightHand`, an empty `dorsalWingPivot` reserve group (no wings by default), and no concentric rings behind `sentinel` bosses; verify `test/graphics/humanoid_rig.test.js` passes after updating assertions for the new archetypes and HDR material contract.
- [x] 1.2 Extend [`animateProgramKinematics`](../../../src/graphics/materials.js) with floating shard micro-hover, core pulsing, and the 4-state Hover-Palm animation machine (`Idle Hover`, `Charge Wind-Up`, `Open-Palm Push Throw`, `Magnetic Catch`) plus the Hover-Palm forward defensive shield brace; verify running, airborne, blocking, charging, throwing, and catching joint/disc transforms in `test/graphics/humanoid_rig.test.js`.
- [x] 1.3 Update [`CosmeticMaterialEngine.applyChassisSkin`](../../../src/armory/CosmeticMaterialEngine.js) and [`CHASSIS_PBR_PRESETS`](../../../src/armory/CosmeticMaterialEngine.js) to drive faceted PBR suit colors, HDR `emissive` + `emissiveIntensity` on cores/halos/visors, and `EdgesGeometry` trim colors across the construct rigs; verify `npm run test:armory` passes with zero material leak regressions.

## 2. Procedural Reflections, HDR Bloom & Settings Enforcement

- [x] 2.1 Implement procedural `PMREMGenerator` studio/arena environment map baking (`src/graphics/Environment.js`) and apply `scene.environment` in [`scene.js`](../../../src/graphics/scene.js) and [`ArmoryPreviewScene.js`](../../../src/armory/ArmoryPreviewScene.js) with clean temporary resource disposal and safe headless Node guards; verify metallic armor facets render specular rim highlights without console errors.
- [x] 2.2 Implement the zero-dependency Three.js r160 `CinematicComposer` (`src/graphics/PostProcessing.js`) with `HalfFloatType` scene render target, luminance threshold prefilter, multi-scale blur pyramid, and ACES filmic tone-mapping composite, plus resize handling and direct-render fallback; verify composer creation, resize sync, and headless fallback in a graphics unit test.
- [x] 2.3 Wire `CinematicComposer` into [`main.js`](../../../src/core/main.js) and runtime `bloom` / `particles` handlers into [`settings.js`](../../../src/core/settings.js) so toggling `NEON GLOW / BLOOM` and particle settings takes effect immediately and persists across restarts; verify setting toggles dynamically switch between bloomed and direct render paths without error.

## 3. Continuous Mesh Ribbon Trails & Hover-Dash Streaks

- [x] 3.1 Implement GPU-disposable `RibbonTrail` triangle-strip meshes (`src/graphics/RibbonTrail.js`) and fade-out pool management in [`particles.js`](../../../src/graphics/particles.js), plus brief additive hover-tip dash streaks; verify vertex buffer updates and `geometry.dispose()` / `material.dispose()` cleanup in unit tests.
- [x] 3.2 Replace sparse disc dot bursts in [`Disc.js`](../../../src/entities/Disc.js) with continuous `RibbonTrail` emissions colored from `cosmeticMaterialEngine.getTrailConfig()`, team/tier colors, and deflected-white highlights, gated by `settings.particles`; verify thrown, bounced, deflected, and caught discs detach and dispose ribbons cleanly with zero leaks.

## 4. Entity, Boss & Multiplayer Integration

- [x] 4.1 Update [`scene.js`](../../../src/graphics/scene.js), [`Bot.js`](../../../src/entities/Bot.js), [`roomManager.js`](../../../src/network/roomManager.js), and [`ArmoryPreviewScene.js`](../../../src/armory/ArmoryPreviewScene.js) to pass explicit construct archetypes (`player`, `drone`, `sentinel`) instead of `flynn`/`rinzler` options while removing any legacy Tron helmet assumptions; verify Duel Bosses, Arbiter Bosses, Swarm bots, and multiplayer spawns instantiate the intended silhouettes.
- [x] 4.2 Wire charge, throw, catch, and dash state parameters into `animateProgramKinematics` across [`Player.js`](../../../src/entities/Player.js), [`Bot.js`](../../../src/entities/Bot.js), and remote player interpolation in [`sync.js`](../../../src/network/sync.js) (removing hardcoded legacy disc offsets); run `npm run test:graphics`, `npm run test:armory`, `npm run test:gameplay`, and `npm test` to confirm full regression pass and inspect a live rendered frame via headless browser smoke check.
