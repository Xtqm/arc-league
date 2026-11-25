# Proposal: Construct Rig & Animation Pipeline

## Why

Arc League's concept art defines Athletes as magnetically suspended, faceted obsidian/ceramic shard constructs orbiting a glowing central plasma core with an overhead halo and articulated five-fingered hands—a purely skill-driven aesthetic with zero stat-altering rig classes. Today, `makeProgram()` assembles those constructs out of code-built Three.js primitives and animates them with procedural Euler math, which limits silhouette crispness and combat motion fidelity. Introducing a Blender-to-`.glb` Construct rig and `THREE.AnimationMixer` pipeline unlocks sculpted hard-surface armor shards and fluid combat animations while keeping every cosmetic rig strictly style-only.

## What Changes

- Introduce a `.glb` asset loading and rig-caching layer (`GLTFLoader` + `THREE.AnimationMixer` wrapper) capable of loading sculpted hard-surface Construct rigs and retargeted combat animation clips (`idle_hover`, `sprint_lean`, `throw_windup`, `throw_release`, `catch_recoil`, `parry_brace`, `dash_burst`, `aerial_tuck`, `eliminated`).
- Preserve the existing synchronous `makeProgram()` / `animateProgramKinematics()` contract and procedural construct fallback so Node unit tests, offline environments, and initial frame spawns remain synchronous and zero-breakage while upgrading live WebGL scenes to `.glb` rigs once cached.
- Enforce semantic part tagging (`chassis_root`, `chassis_suit`, `chassis_trim`, `chassis_visor`, `chassis_halo`, `chassis_back_disc`, `coreMesh`) and joint/socket attachment points (including the `rightHand` Hover-Palm disc mount and `dorsalWingPivot`) across loaded `.glb` Construct meshes so `CosmeticMaterialEngine` and `ArmoryPreviewScene` work identically without material leaks.
- Re-affirm purely cosmetic, skill-driven parity across all Construct silhouettes: no gameplay stat differences (speed, hitbox, parry radius, knockback) between Athlete Rig variants; update `LORE.md` / rig archetype framing where needed to keep cosmetics strictly visual.
- Support the new `.glb` Construct pipeline in both main arena entities (`Player.js`, `Bot.js`, `ambientLobby.js`) and the Armory 3D turntable (`ArmoryPreviewScene.js`, `CosmeticStudioModal.js`).
- Calibrate `CinematicComposer` HDR bloom thresholds (`PostProcessing.js`) and intact arena floor tile seam/roughness values (`materials.js`, `Arena.js`) so beveled floor tiles and seams no longer sparkle or blow out, keeping Construct cores, halos, and kinetic discs crisp and readable.

## Capabilities

### New Capabilities

### Modified Capabilities
- `program-humanoid-rigs`: Support authored `.glb` sharded magnetic-construct meshes and `THREE.AnimationMixer` blended combat clip playback alongside procedural fallback, preserving semantic `userData.part` cosmetic hooks, Hover-Palm disc mounting, and unified skill-only competitive hitboxes/stats across all Athlete Rigs.
- `cinematic-rendering`: Calibrate HDR selective bloom thresholds and intact floor surface roughness/emissive balance so beveled arena tiles do not produce distracting specular glitter or blinding bloom while Construct cores and discs glow cleanly.

## Impact

- **Affected modules**: `vendor/` (adding `GLTFLoader` module alongside `vendor/three.module.js`), `src/graphics/materials.js`, `src/graphics/PostProcessing.js`, `src/entities/Arena.js`, `src/entities/Player.js`, `src/entities/Bot.js`, `src/graphics/ambientLobby.js`, `src/armory/CosmeticMaterialEngine.js`, `src/armory/ArmoryPreviewScene.js`, `LORE.md`.
- **Assets**: New `assets/models/constructs/` directory for Blender-authored `.glb` Construct rigs and animation clip bundles (with procedural fallback if `.glb` files are absent or running in Node).
- **Tests**: Preserves all assertions in `test/graphics/humanoid_rig.test.js`, `test/armory/cosmetic_material_engine.test.js`, and adds tests for `.glb` rig socket/tag normalization, `AnimationMixer` state blending, and headless fallback.
