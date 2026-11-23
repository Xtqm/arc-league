# Proposal: Menu & Athlete Visual Refresh

## Why

The current main menu presentation and player athlete visuals exhibit several aesthetic inconsistencies that detract from the high-velocity cyberpunk Sub-Strata lore:
1. The athlete rig in the ambient main menu diorama performs a single simple sine-wave jump, failing to showcase the iconic aerial double-jump mechanic present during combat.
2. The left tactical rail menu presents an ungrounded rectangular card with generic rounded corners, cluttered and misaligned guest identity telemetry, an awkward floating box-within-a-box for the Survival mode variants, and plain CSS color transitions with text wrapping clumsily across split buttons.
3. The athlete rigs possess flat, unarticulated rectangular box paddles for hands rather than movie-authentic humanoid robotic hands with distinct articulated fingers.
4. When holding a kinetic disc with a wireframe cosmetic skin equipped, the wireframe overlay is only rendered after throwing the projectile in flight, leaving the palm disc visually flat and missing its wireframe during idle and walking locomotion.

Upgrading these core art and presentation elements unifies the game's aesthetic, delivers tactile visual polish, and deepens player immersion.

## What Changes

- **Main Menu Ambient Diorama Double-Jump**:
  - Replace the single sine-wave leap in `ambientLobby.js` with an athletic two-stage double-jump sequence (primary launch -> mid-air impulse burst at apex -> float hang-time -> cushioned landing on the pedestal ring).
  - Synchronize mid-air particle bursts and limb kinematics during the secondary double-jump surge.
- **Left Tactical Rail UI Overhaul**:
  - Modernize the tactical rail container with authentic cyberpunk chamfered corners (`clip-path: polygon(...)`), hairline neon corner brackets, and sleek dark slate-glass backdrop blur.
  - Redesign the identity header with clean, balanced, and responsive layout for guest code, user level, and credits.
  - Integrate the Survival `STANDARD` vs `HARDCORE [LVL 5+]` mode selector as a seamless, flush tab toggle inside the tactical card rather than a disjointed nested border box.
  - Standardize button visual hierarchy (`QUICK MATCH // PLAY NOW` high-luminance primary action, dedicated mode directives, and split friendly match action cards with balanced typography).
  - Add cinematic hover effects: high-speed 45° neon light-sheen sweep across button faces, glowing accent chevrons/bars, and synthetic WebAudio audio click feedback.
  - Maintain mobile responsiveness for viewports under 768px and preserve all test-critical element IDs and handlers.
- **Humanoid 5-Finger Hands on Athlete Rigs**:
  - Replace the block paddle hand geometry on Player Athlete Rigs (`archetype: 'player'`) in `materials.js` with an articulated humanoid 5-finger hand.
  - Build a faceted palm chassis that tapers to the glowing wrist cuff, with an opposable thumb angled laterally/forward, and four anatomically proportioned segmented digits (Index, Middle, Ring, Pinky).
  - Articulate fingers in a relaxed, athletic cupped pose that naturally frames the floating Hover-Palm disc without clipping.
  - Tag all hand and finger shards with `chassis_suit` and `chassis_trim` to ensure complete compatibility with cosmetic shaders and textures in the Armory.
- **Persistent Disc Wireframe During Idle and Locomotion**:
  - Fix `applyDiscSkin` in `CosmeticMaterialEngine.js` so that when a skin has `wireframeToggle: true`, the palm-held disc (`chassis_back_disc`) receives a proportionally scaled retro wireframe overlay mesh.
  - Keep the wireframe visible and active during idle, locomotion, throw wind-up, and catch cycles, eliminating the pop-in where wireframes only appeared when thrown into flight.

## Capabilities

### Modified Capabilities

- `main-menu`: Update `Left-Aligned Tactical Rail Menu Interface` to specify chamfered cyberpunk geometry, integrated sub-mode toggle, refined button hierarchy, and neon sheen hover feedback; update `Ambient 3D Staging Presentation` to require the two-stage double-jump diorama sequence.
- `program-humanoid-rigs`: Update `Hierarchical Anatomical Humanoid Rig` to require articulated 5-finger humanoid hands (faceted palm chassis, opposable thumb, and four segmented digits) on player athlete constructs.
- `armory-catalog`: Update `Palm-Held Disc Mesh Synchronization` and `Shape-Conforming Retro Wireframe Overlays` to require that palm-held discs render the shape-conforming wireframe overlay whenever the active skin has `wireframeToggle: true`, persisting across idle and walking states.

## Impact

- **Code Files**:
  - `src/graphics/ambientLobby.js`: Update diorama jump state kinematics and timing for double-jump.
  - `index.html`: Update tactical rail CSS styles, button aesthetics, hover sheen animations, and HTML layout.
  - `src/ui/menus.js`: Update `getMainMenuHtml` markup, button classes, and audio hook event bindings.
  - `src/graphics/materials.js`: Update `buildConstructLimbs` to build 5-finger humanoid hands for athlete rigs.
  - `src/armory/CosmeticMaterialEngine.js`: Update `applyDiscSkin` to manage palm-held disc wireframe overlays.
  - `src/entities/Player.js`: Ensure palm disc wireframe state is preserved during countdown and gameplay loops.
- **Tests**:
  - `test/ambient_character_diorama.test.js` & UI test suites: Retain all required button IDs; update test assertions for the double-jump state timing if needed.
- **APIs & Compatibility**:
  - Fully backward-compatible; maintains existing cosmetic skin IDs and save state schemas.
