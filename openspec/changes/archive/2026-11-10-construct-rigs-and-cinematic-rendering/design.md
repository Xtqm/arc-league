# Design: Magnetic Construct Rigs & Cinematic WebGL Rendering

## Context

See [proposal.md](proposal.md) for motivation and scope. Current codebase constraints discovered during inspection:
- **Zero-bundler ES module setup:** [index.html](../../../index.html) and Electron load ES modules directly with [vendor/three.module.js](../../../vendor/three.module.js) (Three.js **r160**) and no `three/examples/jsm` directory or npm `three` package.
- **Unwired graphics settings:** [settings.js](../../../src/core/settings.js) and [SettingsModal.js](../../../src/ui/modals/SettingsModal.js) persist `bloom` and `particles`, but [main.js](../../../src/core/main.js) calls raw `renderer.render(scene, camera)` directly without tone mapping or post-processing.
- **Flat metallic shading:** [scene.js](../../../src/graphics/scene.js) configures one `HemisphereLight` and one `DirectionalLight` with no `scene.environment`, leaving `metalness: 0.9` armor plates nearly black along unlit facets.
- **Existing rig & test contracts:** `makeProgram`, `animateProgramKinematics`, [CosmeticMaterialEngine.js](../../../src/armory/CosmeticMaterialEngine.js), [Player.js](../../../src/entities/Player.js), [Bot.js](../../../src/entities/Bot.js), [Disc.js](../../../src/entities/Disc.js), [sync.js](../../../src/network/sync.js), [roomManager.js](../../../src/network/roomManager.js), and [ArmoryPreviewScene.js](../../../src/armory/ArmoryPreviewScene.js) rely on the 15-joint `userData.joints` tree and semantic tags (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_back_disc`, `chassis_halo`).

## Goals / Non-Goals

**Goals:**
- Deliver three distinct, non-Tron Magnetic Hard-Light Construct silhouettes (`player`, `drone`, `sentinel`) sharing one unified 15-joint hierarchy and cosmetic material pipeline.
- Replace spine/grip disc attachment with **Hover-Palm** telekinetic carrying, 4-state throw/catch kinematics, and floating shard micro-hover.
- Upgrade WebGL visual fidelity with zero external dependencies using Three.js r160: thresholded HDR bloom + ACES tone mapping, startup `PMREMGenerator` environment reflections, faceted `EdgesGeometry` trim, and continuous additive mesh ribbon trails.
- Preserve headless Node testability across character rig and cosmetic unit tests.

**Non-Goals:**
- Introducing an external bundler, CDN imports, or binary `.glb`/`.hdr` texture assets.
- Implementing the unlockable **Cosmetic Wings** Armory category and storage schema migration (reserved via an empty dorsal attachment pivot only).
- Rewriting non-visual UI/auth/storage *Tron* identifiers outside the character/rendering domain.

## Decisions

### 1. Self-Contained Three.js r160 Post-Processing Bloom (`src/graphics/PostProcessing.js`)
- **Decision:** Build a dedicated `CinematicComposer` using native `THREE.WebGLRenderTarget` (`HalfFloatType`), `THREE.ShaderMaterial`, and a fullscreen orthographic quad:
  1. Render the main 3D scene into an HDR `HalfFloatType` offscreen buffer.
  2. Prefilter luminance pass extracting only HDR texels above threshold (`~0.95` with soft knee) so dark arena floor tiles remain crisp while `emissiveIntensity >= 2.0` cores, halos, discs, and edge trims bloom.
  3. 5-level dual-filter downsample/upsample Kawase blur chain (`1/2` down to `1/32` resolution) using hardware bilinear sampling.
  4. Final composite shader combining HDR scene + scaled bloom, applying `ACESFilmicToneMapping` and linear-to-sRGB output encoding.
- **Rationale:** Works completely offline in Electron and browser ES modules with zero new dependencies, respects `settingsManager.get('bloom', true)`, and bypasses straight to `renderer.render(scene, camera)` when disabled or when WebGL render targets are unavailable.
- **Alternatives Considered:** Vendoring Three.js r160 `EffectComposer` + `UnrealBloomPass` + `OutputPass` + `ShaderPass` + `LuminosityHighPassShader` (rejected: larger vendored footprint and fragile relative import paths across `jsm/` modules).

### 2. Procedural `PMREMGenerator` Studio/Arena Environment Map (`src/graphics/Environment.js`)
- **Decision:** Generate an environment cubemap once at startup using `THREE.PMREMGenerator(renderer).fromScene(envScene, 0.04)` built from a dark sky sphere plus soft cool cyan and slate emissive panel strips, assign the resulting texture to `scene.environment` in both `scene.js` and `ArmoryPreviewScene.js`, and immediately dispose the temporary `PMREMGenerator` and helper meshes.
- **Rationale:** Faceted obsidian/slate armor (`metalness: 0.85`, `roughness: 0.34`, `flatShading: true`) immediately catches clean metallic bevel highlights matching the concept art at near-zero startup cost (`<2ms`) and zero asset fetches.
- **Alternatives Considered:** Adding multiple directional rim lights around the arena (rejected: higher per-fragment PBR cost across all tiles and doesn't produce broad metallic edge reflections).

### 3. Construct Archetypes & Compatibility Architecture (`src/graphics/materials.js`)
- **Decision:** Parameterize `makeProgram(color, options)` with `options.archetype` (`'player' | 'drone' | 'sentinel'`):
  - Map legacy options cleanly during transition: explicit `archetype` wins; otherwise `options.isBoss` -> `'sentinel'`, `options.isPlayer || options.helmetType === 'flynn'` -> `'player'`, else -> `'drone'` (updated across all callers in `scene.js`, `Bot.js`, `roomManager.js`, `ArmoryPreviewScene.js`).
  - **15-Joint Tree Preservation:** Keep every joint `Group` (`pelvis`, `abdomen`, `torso`, `neck`, `head`, `left/rightShoulder`, `left/rightElbow`, `left/rightHand`, `left/rightHip`, `left/rightKnee`) intact. Leave `neck` empty of geometry so `head` floats organically over a magnetic gap while preserving joint parenting.
  - **Archetype Geometry:**
    - `'player'` (Pure Option B Base): Faceted obsidian torso shards floating around an illuminated spherical core (`IcosahedronGeometry` / `SphereGeometry`), floating `IcosahedronGeometry(0.26, 0)` head encircled by a tilted `TorusGeometry` halo, detached faceted shoulder/arm/leg shards, tapered glowing hover-point tips (`ConeGeometry`), and an empty `dorsalWingPivot` `Group` on `torso` for future wings.
    - `'drone'` (Chevron Drone): Sharp inverted-triangle prism chest/shoulder chassis (`ExtrudeGeometry` / tapered faceted wedges) with an embedded glowing amber V-core + recessed rib slits, no separate spherical head (`head` group hosts the upper crest prism/visor or stays low-profile), detached slender arm/leg shards with hover tips.
    - `'sentinel'` (Sentinel Boss): Sharp triangular-prism shoulder pauldrons and angled chest shards framing an open blazing octahedral/spherical core, tall chamfered hornless **Monolith Prism** head with a vertical glowing visor slit, detached heavy lower-limb shards, and **strictly no concentric orbital rings behind the shoulders**.
  - **Faceted Edge Trim & HDR Materials:**
    - Upgrade `suitMaterial` to `MeshStandardMaterial` with `flatShading: true`, `color: 0x161c24`, `metalness: 0.85`, `roughness: 0.34`.
    - Upgrade `litMaterial` to HDR-ready `MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.4, roughness: 0.18, metalness: 0.05 })` (updating `CosmeticMaterialEngine.applyChassisSkin` and test assertions accordingly).
    - Attach `EdgesGeometry(geom, 24)` `LineSegments` using a dedicated `edgeTrimMaterial` (`LineBasicMaterial` or thin emissive trim) tagged `chassis_trim` on major armor facets so dark plates gain crisp glowing silhouettes.
    - Maintain exactly 1 `chassis_visor` mesh per rig (player: subtle forward prism brow/optic facet; drone: glowing chest V-core crest; sentinel: vertical monolith visor slit) for consistent `CosmeticMaterialEngine` and test guarantees.
- **Alternatives Considered:** Separate factory functions per archetype (rejected: splits `ArmoryPreviewScene`, multiplayer sync, and cosmetic engine code paths; unified `makeProgram` with archetype builders keeps one contract).

### 4. Hover-Palm Disc Mount & 4-State Kinematics (`animateProgramKinematics`)
- **Decision:** Keep `rig.userData.backDisc` (tagged `chassis_back_disc`) parented to `rightHand` for drop-in visibility/skinning compatibility across callers, and reposition it locally above the upturned open palm (`(0, -0.02, 0.18)` oriented horizontally).
- **State Machine in `animateProgramKinematics(rig, dt, params)`:**
  - Track transient timers in `rig.userData._anim` (`throwTimer`, `catchTimer`, `prevHasDisc`), auto-detecting `hasDisc` transitions (`true -> false` triggers `throwTimer = 0.28s`; `false -> true` triggers `catchTimer = 0.25s`) so both local (`Player.js`), AI (`Bot.js`), and remote multiplayer (`sync.js`) rigs animate throws and catches without extra network packet fields.
  - Read `chargingThrow` and `throwCharge` (`0..1`) to coil the torso/right arm back and tilt/rev the hovering disc during wind-up.
  - Apply phase-offset sinusoidal micro-hover (`±0.02m`) to floating shard sub-meshes tagged with `userData.floatBaseY` and pulse core `emissiveIntensity` subtly with charge/idle time.
  - **Blocking Stance:** Elevate the open right palm forward in front of the chest and orient the hovering disc vertically (`facing +Z`) as a telekinetic energy barrier.
- **Note on `sync.js`:** Remove the hardcoded `backDisc.position.set(0.04, -0.28, 0.02)` override in [sync.js](../../../src/network/sync.js#L130-L138) and instead pass `chargingThrow`, `throwCharge`, and `hasDisc` into `animateProgramKinematics` for remote players.

### 5. Continuous Additive Mesh Ribbon Trails (`src/graphics/RibbonTrail.js` + `particles.js`)
- **Decision:** Implement a lightweight `RibbonTrail` class backed by a pre-allocated ring-buffered triangle-strip `BufferGeometry` (`28` segments, `2` vertices per sample, dynamic `position` + `color` attributes, `AdditiveBlending`, `depthWrite: false`, `DoubleSide`).
- Each active disc (`Disc.js`) maintains a `RibbonTrail` updated every frame while in flight (using `cosmeticMaterialEngine.getTrailConfig()` primary -> secondary color gradient and `trailOpacity` on player discs, team/tier color on bots/bosses, bright white on parried discs).
- On catch or removal, detach the ribbon into a short fade-out pool (`0.25s`) in `particles.js` that fades opacity to `0` and calls `geometry.dispose()` + `material.dispose()`.
- Gate both `RibbonTrail` spawning and dash hover-tip streaks on `settingsManager.get('particles', true)`.

## Risks / Trade-offs

- **[Risk] Test suite expectations on `litMaterial` type and `flynn`/`rinzler` options** → **Mitigation:** Update `test/graphics/humanoid_rig.test.js` and `test/armory/cosmetic_material_engine.test.js` to validate construct archetypes (`player`, `drone`, `sentinel`), HDR emissive `litMaterial` properties, Hover-Palm disc orientation, and 4-state throw/charge/catch kinematics, while retaining graceful fallback in `makeProgram` for legacy options.
- **[Risk] Mobile / software-WebGL fill-rate pressure from 5-pass bloom** → **Mitigation:** Use half-res mip start (`1/2` viewport) for the bloom pyramid, respect pixel ratio capping (`1.5` touch / `2.0` desktop), and let `settings.bloom = false` bypass post-processing completely.
- **[Risk] Over-the-shoulder wingless camera sightlines vs. floating palm disc visibility** → **Mitigation:** Position the upturned right palm slightly outward (`rightShoulder.rotation.z`, `rightElbow`) during idle/charge so the hovering disc remains clearly visible to the right of the torso in the `SHOULDER = 1.7` over-the-shoulder camera framing in `scene.js`.
- **[Risk] Rear-hemisphere readability for 2x critical hits** → **Mitigation:** Give all three archetypes distinct front cues (player forward optic brow + open palm disc; drone bright amber front V-core; sentinel vertical front visor slit) contrasted against darker, steeper faceted back plates.

## Migration Plan

1. Add `PostProcessing.js`, procedural `PMREM` environment setup, and `RibbonTrail` without breaking `headless` Node tests (guard all WebGL-only passes behind `if (renderer)` / context availability).
2. Refactor `makeProgram` and `animateProgramKinematics` in `src/graphics/materials.js`, keeping `userData.joints`, `userData.part`, and `userData.backDisc` contracts intact while upgrading `CosmeticMaterialEngine.js`.
3. Wire `Player.js`, `Bot.js`, `Disc.js`, `roomManager.js`, `sync.js`, `settings.js`, `main.js`, and `ArmoryPreviewScene.js` to the new archetype options, throw/charge kinematics, ribbons, and bloom settings.
4. Update and run `npm run test:graphics`, `npm run test:armory`, `npm run test:gameplay`, and full `npm test` (including headless Puppeteer browser verification of live rendering).
