# Tasks

## 1. GLTF Loader Integration & Blender Rig Contract

- [x] 1.1 Vendor `GLTFLoader.js` (and `SkeletonUtils.js` if needed) matching Three.js r160 into `vendor/`, verify ES module resolution in both browser/Electron and Node test environments, and confirm `npm run test:graphics` stays green.
- [x] 1.2 Document the Blender Construct Rig export contract (`assets/models/constructs/README.md`) specifying bone hierarchy, rigid shard parenting, `suit_`/`trim_`/`visor_`/`halo_`/`core_` naming, `palm_socket_r` and `dorsal_socket` empties, and required animation clip names (`idle_hover`, `sprint_lean`, `throw_windup`, `throw_release`, `catch_recoil`, `parry_brace`, `dash_burst`, `aerial_tuck`).

## 2. Construct Asset Cache, Normalization & AnimationMixer Playback

- [x] 2.1 Implement `src/graphics/ConstructLoader.js` to asynchronously preload and cache `.glb` construct bundles under `assets/models/constructs/`, normalize node names into `userData.joints`, `userData.part` tags (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_halo`, `chassis_back_disc`), `coreMesh`, `headHalo`, and `dorsalWingPivot`, and verify with unit tests using mock/fixture GLTF hierarchies.
- [x] 2.2 Update `makeProgram()` and `animateProgramKinematics()` in `src/graphics/materials.js` to instantiate normalized `.glb` clones synchronously when cached (falling back cleanly to the procedural shard construct when uncached or in Node) and blend `THREE.AnimationMixer` combat clips layered with core/halo pulse; verify `test/graphics/humanoid_rig.test.js` passes for both paths.

## 3. Purely Cosmetic Parity, Armory & Entity Integration

- [x] 3.1 Verify and enforce purely skill-driven gameplay parity across all Construct silhouettes and `chassisSkins` in `src/entities/Player.js`, `src/entities/Bot.js`, and `src/armory/ArmoryCatalog.js` (zero stat/hitbox/parry modifiers), and update `LORE.md` to remove gameplay-stat rig class distinctions.
- [x] 3.2 Update `src/armory/CosmeticMaterialEngine.js` and `src/armory/ArmoryPreviewScene.js` so `.glb` Construct rigs support live Armory material tinting, wireframe toggles, Hover-Palm disc attachment, first-person visor clipping, and leak-free `.dispose()` cleanup; verify `npm run test:armory` passes.

## 4. Authored Construct GLB Integration, Bloom Calibration & Verification

- [x] 4.1 Author and import the initial Blender-authored Construct `.glb` (`assets/models/constructs/athlete_base.glb` and opponent variants) into the preload registry in `src/graphics/scene.js` / `src/graphics/ambientLobby.js` and verify all animation states (`idle`, `run`, `throw`, `parry`, `dash`) in live WebGL rendering.
- [x] 4.2 Calibrate `CinematicComposer` bloom (`threshold`, `knee`, `strength`) in `src/graphics/PostProcessing.js` and intact floor tile `emissiveIntensity`/`roughness` in `src/graphics/materials.js` / `src/entities/Arena.js`, verifying `npm run test:graphics` passes and live WebGL rendering shows crisp Construct cores/halos without blinding floor sparkle.
- [x] 4.3 Run the complete test suite (`npm test`) and verify zero regressions across `test:graphics`, `test:armory`, `test:combat`, and `test:gameplay`.
