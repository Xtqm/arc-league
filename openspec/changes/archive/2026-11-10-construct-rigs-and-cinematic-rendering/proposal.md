# Proposal: Magnetic Construct Rigs & Cinematic WebGL Rendering

## Why

While [LORE.md](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/LORE.md) already rebrands the game as an original cyber-sport (**Arc League**), the character rigs in [`makeProgram`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/graphics/materials.js#L37-L367) and the `program-humanoid-rigs` spec still rely directly on *Tron: Legacy* visual motifs (black bodysuits with neon piping, Flynn horizontal visors, Rinzler T-visors, and dorsal spine disc docks). At the same time, the renderer lacks post-processing bloom (`settings.bloom` is currently unwired), environment reflections, continuous disc ribbon trails, and throw/catch kinematics—leaving live 3D visuals flat compared to the target aesthetic.

## What Changes

- **BREAKING: Replace *Tron*-style character models with original Magnetic Hard-Light Construct archetypes** in [`makeProgram`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/graphics/materials.js#L37-L367) (preserving the 15-joint hierarchy and semantic `userData.part` tags while migrating away from `flynn`/`rinzler` visors and dorsal spine docks):
  - **Player Athlete (Base Construct):** Wingless Pure Construct built from faceted matte-obsidian/slate floating shards around a radiant cyan spherical chest core, a floating icosahedron head with a tilted cyan halo (no neck mesh), detached arm/leg shards, and tapered hover-point legs.
  - **Standard Enemy (`drone` — Chevron Drone):** Headless shoulder-integrated inverted-triangle obsidian/gold prism silhouette housing a glowing amber V-core and inner rib glow, detached limbs with hover tips, carrying one disc.
  - **Arena & Arbiter Bosses (`sentinel` — Sentinel Boss):** Sharp gold-edged triangular-shard body framing a blazing magenta-amber/tier-colored chest core, sharp triangular pauldrons, a sleek **hornless** Monolith Prism head with a single vertical glowing visor slit, clean back silhouette (**no concentric orbital rings behind shoulders**), and one disc.
- **Hover-Palm (Telekinetic) Disc Carry, Throw & Catch:** Across all characters (player, bots, bosses, and remote multiplayer avatars), replace held/spine disc placement with a spinning disc hovering horizontally above the open upturned right palm, backed by 4-state telekinetic kinematics (`Idle Hover -> Charge Wind-Up -> Open-Palm Push Throw -> Magnetic Catch`) and independent floating shard micro-hover/core pulsing.
- **Cinematic Upgrade 1 — HDR Selective Bloom & ACES Tone Mapping:** Implement a self-contained Three.js r160 post-processing bloom composer (`HalfFloatType` multi-pass bloom + `ACESFilmicToneMapping`) wired to the existing `settings.bloom` (`NEON GLOW / BLOOM`) preference.
- **Cinematic Upgrade 2 — Procedural `PMREMGenerator` Reflections + Faceted `EdgesGeometry` Trim:** Generate a startup studio/arena environment map on `scene.environment` (and Armory preview scenes) and render construct plates with `flatShading: true` plus hairline glowing `EdgesGeometry` borders.
- **Cinematic Upgrade 3 — 4-State Construct Kinematics & Shard Physics:** Upgrade [`animateProgramKinematics`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/graphics/materials.js#L369-L557) and entity callers ([`Player.js`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/entities/Player.js), [`Bot.js`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/entities/Bot.js), [`Disc.js`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/entities/Disc.js), [`sync.js`](file:///c:/Users/caleb/Documents/Coding/Games/Tron-Game/src/network/sync.js)) to animate charge wind-ups, no-contact palm throws, magnetic catches, dash flares, and subtle floating plate drift.
- **Cinematic Upgrade 4 — Continuous Additive Mesh Ribbon Trails:** Replace sparse point-dot trail bursts on flying discs with smooth, GPU-disposable triangle-strip plasma ribbon trails (and subtle hover-dash streaks) styled via `cosmeticMaterialEngine.getTrailConfig()` and gated by `settings.particles`.
- **Out of Scope / Deferred Follow-Up:** Adding unlockable **Cosmetic Wings** as a new Armory inventory/loadout category (`storage/schema.js`, `CloudSyncResolver.js`, `ArmoryCatalog.js`, `ArmoryModal.js`) is deferred to a dedicated Armory expansion change, though the construct rig will avoid hardcoding wings on the base player mesh so an optional wing mount hook can attach cleanly later.

## Capabilities

### New Capabilities
- `cinematic-rendering`: HDR thresholded post-processing bloom, ACES filmic tone mapping, procedural `PMREMGenerator` environment reflections, and continuous additive mesh ribbon trails for projectiles and locomotion streaks.

### Modified Capabilities
- `program-humanoid-rigs`: Replaces Tron: Legacy helmet optics and dorsal spine disc docks with Magnetic Hard-Light Construct archetypes (Player Base, Chevron Drone, Hornless Monolith Sentinel Boss), HDR emissive cores with `EdgesGeometry` trim, Hover-Palm telekinetic disc mounting, and 4-state throw/catch/floating-shard kinematics.
- `system-settings`: Wires the `bloom` and `particles` graphics settings to actively toggle HDR post-processing bloom and continuous ribbon/particle effects in the live render pipeline.
- `armory-catalog`: Extends chassis material application to drive HDR core/edge-trim emissives and faceted PBR plates on the new construct rigs, and transitions disc flight ribbons from sparse point sparks to continuous interpolated mesh ribbons.

## Impact

- **Graphics & Rendering:** `src/graphics/materials.js`, `src/graphics/scene.js`, `src/graphics/particles.js`, new `src/graphics/PostProcessing.js` (or `BloomPipeline.js`), `src/core/main.js`, `src/armory/ArmoryPreviewScene.js`, `src/armory/CosmeticMaterialEngine.js`.
- **Entities & Networking:** `src/entities/Player.js`, `src/entities/Bot.js`, `src/entities/Disc.js`, `src/network/roomManager.js`, `src/network/sync.js`.
- **Settings:** `src/core/settings.js` (runtime apply hooks for `bloom` / `particles`).
- **Tests:** `test/graphics/humanoid_rig.test.js`, `test/armory/cosmetic_material_engine.test.js`, plus new/updated graphics post-processing and ribbon trail verification tests.
- **Dependencies:** Zero new npm or CDN dependencies; built entirely on the vendored Three.js r160 ES module (`vendor/three.module.js`) to remain offline/Electron-safe.
