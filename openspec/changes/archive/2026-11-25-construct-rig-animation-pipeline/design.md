# Design: Construct Rig & Animation Pipeline

## Context

See [proposal.md](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/openspec/changes/construct-rig-animation-pipeline/proposal.md) for motivation. Currently, `src/graphics/materials.js` (`makeProgram` and `animateProgramKinematics`) constructs every character rig synchronously from Three.js primitives and drives locomotion/combat poses via manual joint Euler rotations. Downstream systems—`Player.js`, `Bot.js`, `ambientLobby.js`, `CosmeticMaterialEngine.js`, `ArmoryPreviewScene.js`, and `test/graphics/humanoid_rig.test.js`—expect `makeProgram()` to return a synchronous `THREE.Group` with `userData.joints`, `userData.part` tags (`chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_halo`, `chassis_back_disc`), `userData.coreMesh`, `userData.dorsalWingPivot`, and `userData.backDisc` attached to `rightHand`.

Meanwhile, `vendor/` currently ships only `three.module.js` without `GLTFLoader`.

## Goals / Non-Goals

**Goals:**
- Support Blender-authored `.glb` sharded Construct rigs (`assets/models/constructs/*.glb`) with `THREE.AnimationMixer` clip blending for key combat states (`idle_hover`, `sprint_lean`, `throw_windup`, `throw_release`, `catch_recoil`, `parry_brace`, `dash_burst`, `aerial_tuck`).
- Keep `makeProgram()` synchronous and non-blocking: return a ready rig immediately (using procedural fallback if `.glb` isn't preloaded or in headless Node tests) and upgrade/hydrate seamlessly once cached.
- Preserve 100% compatibility with `CosmeticMaterialEngine` (in-place color/roughness/metalness/emissive updates and `.dispose()` safety) and `ArmoryPreviewScene` turntable previews.
- Enforce strictly cosmetic, skill-only parity across all Athlete Rig variants (zero stat modifiers, identical hitbox and physics profile).

**Non-Goals:**
- Rewriting `ArmoryCatalog` into gameplay stat classes (explicitly rejected to keep gameplay 100% skill-driven).
- Removing the procedural construct fallback (`humanoid_rig.test.js` and headless environments depend on synchronous creation without WebGL/network).
- Implementing custom bone physics / ragdoll simulation.

## Decisions

### 1. Preloaded GLB Cache + Synchronous Rig Contract
- **Decision:** Add a `ConstructAssetLoader` module (backed by `vendor/GLTFLoader.js` matching Three.js r160) that preloads `.glb` construct bundles asynchronously during boot (`initGraphics()` / `ArmoryPreviewScene`), while `makeProgram(color, options)` synchronously clones from the loaded cache if present or falls back to the procedural construct builder.
- **Rationale:** `Player.js`, `Bot.js`, `ambientLobby.js`, `ArmoryPreviewScene.js`, and all Node unit tests call `makeProgram()` synchronously. Making `makeProgram()` async would ripple breaking changes across spawn, matchmaking, and tests.
- **Alternative Considered:** Refactoring all callers to `await makeProgramAsync()`. Rejected due to wide surface area and risk of race conditions during match start countdowns and WebRTC spawns.

### 2. Rigid Bone-Parented Shards over Soft Skinning
- **Decision:** Author Construct `.glb` assets with rigid faceted armor/obsidian shards parented directly to skeleton bones (Mixamo/humanoid bone naming convention) rather than continuous vertex-weighted soft-skinned meshes.
- **Rationale:** Matches the Arc League concept art (floating magnetically suspended obsidian plates around a glowing central core), avoids weight-painting deformation artifacts on sharp bevels, and enables clean per-part cosmetic material assignment and emissive edge trim overlays.
- **Alternative Considered:** Single soft-skinned humanoid mesh. Rejected because bending flat-shaded metallic shards looks rubbery and breaks the magnetic-construct silhouette.

### 3. Node Naming & Semantic Tag Normalization Layer
- **Decision:** On `.glb` clone normalization, map standardized Blender object/material prefixes (`suit_*`, `trim_*`, `visor_*`, `halo_*`, `core_*`, `palm_socket_r`, `dorsal_socket`, and Mixamo/standard bone names) onto `userData.part`, `userData.joints`, `userData.coreMesh`, `userData.headHalo`, `userData.dorsalWingPivot`, and `userData.backDisc`.
- **Rationale:** `CosmeticMaterialEngine` and `ArmoryPreviewScene` already traverse `userData.part` tags to tint suits, cores, halos, and trims in-place without material leaks. Normalizing `.glb` nodes into that exact contract avoids duplicating cosmetic logic.

### 4. Hybrid AnimationMixer + Procedural Micro-Motion
- **Decision:** When a rig carries loaded `AnimationClip`s, `animateProgramKinematics(rig, dt, params)` drives a per-rig `THREE.AnimationMixer` state machine with short cross-fades (e.g., `0.12s` for locomotion, `0.06s` snap for throw release/parry) layered underneath procedural core pulsing, halo spin, and subtle floating shard drift.
- **Rationale:** Skeletal clips deliver athletic weight transfer, wind-up recoil, and crisp five-finger palm presentation, while procedural core/halo motion keeps the magnetic construct feeling alive at any frame rate.

### 5. SkeletonUtils Clone Discipline & Disposal
- **Decision:** Use proper skinned/hierarchy cloning (equivalent to Three.js `SkeletonUtils.clone` when skinned bones are present, or clean group clone for rigid bone-parented nodes) paired with shared cached GPU geometries from the GLB template and per-instance cloned materials disposed via `disposeHierarchy()`.
- **Rationale:** Prevents cloning a `.glb` from corrupting shared bone bindings or leaking GPU geometry buffers during repeated match restarts and Armory browsing.

### 6. Bloom Threshold & Tile Specular Calibration
- **Decision:** Raise `CinematicComposer` defaults (`threshold` from `0.92` to `~1.15–1.25`, tighter `knee` `~0.20`, softened `strength` `~0.35–0.42`) in `src/graphics/PostProcessing.js`, lower intact floor tile seam `emissiveIntensity` (`0.65` -> `~0.25–0.35`) in `src/graphics/materials.js`, and keep intact tile base `roughness` in the `~0.35–0.42` range across `Arena.js` / `SectorHazardBuilder.js`.
- **Rationale:** With `threshold: 0.92` and `knee: 0.35`, mid-tone speculars above `0.57` bleed into bloom, turning beveled tile edges into sparkly glitter. Raising the cutoff and softening intact floor speculars keeps the arena crisp so Construct cores, halos, and discs stand out cleanly.

## Risks / Trade-offs

- **Three.js r160 `GLTFLoader` version mismatch** -> Vendor `GLTFLoader.js` (and `SkeletonUtils.js` if needed) from the exact Three.js r160 release matching `vendor/three.module.js`, and verify imports in Node and Electron.
- **First-person camera clipping with bulkier sculpted shards** -> Keep `first_person` visibility/clipping rules in `Player.js` hiding head/torso shards cleanly while keeping the Hover-Palm forearm/hand/disc visible.
- **Bundle size / asset load time on web & Electron** -> Keep `.glb` Construct bundles compact (low-to-mid poly faceted shards, shared base skeleton/clips, procedural or tiny packed textures) and preload during initial menu boot with non-blocking fallback.
- **Authored `.glb` assets not yet exported from Blender** -> Tasks include defining the Blender export checklist/rig specification and verifying the loader + fallback pipeline before and after `.glb` drop-in so code and tests stay green throughout.
