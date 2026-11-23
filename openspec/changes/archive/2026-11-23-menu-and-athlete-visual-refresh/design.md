# Design: Menu & Athlete Visual Refresh

## Context

See `proposal.md` for the motivation and high-level scope.
The game currently uses Three.js for 3D rendering (including the ambient lobby diorama and character rigs) and standard HTML/CSS with WebAudio for the tactical rail HUD.
Cosmetic skin configurations are registered in `src/armory/ArmoryCatalog.js` and applied dynamically via `src/armory/CosmeticMaterialEngine.js`.

## Goals / Non-Goals

**Goals:**
- Provide a cinematic, physics-consistent two-stage double-jump sequence in the main menu diorama matching the in-game double-jump ability.
- Redesign the left tactical rail menu with chamfered cyberpunk geometry, integrated flush sub-mode controls, high-speed light-sheen hovers, and procedural audio cues.
- Articulate movie-authentic 5-finger humanoid hands on player athlete rigs with faceted palm chassis and segmented phalanges framing the Hover-Palm disc.
- Enable persistent retro wireframe overlays on the player's palm-mounted disc during idle, walking, and combat stances when equipping a wireframe-enabled cosmetic skin.
- Maintain seamless responsive scaling for mobile viewports (< 768px) and preserve test compatibility.

**Non-Goals:**
- Modifying combat physics, disc projectile velocity, or player movement speeds during actual gameplay.
- Altering Chevron Drone (AI bot) arm models, keeping their detached triangular drone claw silhouette for role differentiation.
- Forcing wireframes onto skins that do not have `wireframeToggle: true` in the catalog.

## Decisions

### 1. Ambient Lobby Diorama: Two-Stage Parabolic Jump Trajectory
- **Decision**: Structure the diorama jump into a 2.3s multi-phase timeline in `src/graphics/ambientLobby.js`:
  - `0.0s - 0.65s`: Primary launch rising from `y = 0` to `y = 1.05m`.
  - `0.65s - 1.45s`: At `t = 0.65s`, trigger a secondary impulse kick and particle burst (`burst()`), boosting vertical displacement to `y = 1.95m`.
  - `1.45s - 2.0s`: Aerodynamic hang-time with floating limb kinematics descending back toward the pedestal.
  - `2.0s - 2.3s`: Knee-compression landing cushion returning cleanly to `y = 0`.
- **Alternative Considered**: Re-using the exact tick-by-tick physics loop from `Player.js`. *Rejected because the diorama runs autonomously without player input or arena collision grids; a deterministic, frame-independent trigonometric spline guarantees silky smooth, reproducible staging loops.*

### 2. Tactical Rail Cyberpunk Layout & Chamfered Profiles
- **Decision**: Update `index.html` and `src/ui/menus.js`:
  - Use CSS 45-degree polygon chamfers (`clip-path: polygon(...)`) for the tactical rail container and mode buttons.
  - Re-structure the Survival container so the `STANDARD` vs `HARDCORE` toggle is rendered as an integrated, flush segmented tab strip directly inside the card without an awkward nested orange border box.
  - Resolve the positioning collision where `.identity-header` was styled as `position: absolute; top: 16px; right: 16px;`, ensuring it renders cleanly inside the tactical rail's top identity section.
  - Add a high-speed diagonal light-sheen sweep animation (`@keyframes tacticalSheen`) on button hover, and wire WebAudio synth audio feedback (`playTerminalKeySound()` on hover, `playEquipSound()` on click).
- **Alternative Considered**: Full canvas or WebGL-rendered UI. *Rejected to maintain accessibility, standard DOM event binding, responsive mobile support, and test runner assertions.*

### 3. Humanoid 5-Finger Hand Construction
- **Decision**: In `src/graphics/materials.js` (`buildConstructLimbs`), construct distinct hand geometry for `archetype === 'player'`:
  - **Palm**: Tapered faceted box/prism with chamfered dorsal surfaces, connecting seamlessly to the glowing wrist cuff.
  - **Thumb**: Symmetrically mirrored across left/right hands (`s = -1, 1`), angled ~35° laterally and ~20° forward with proximal and distal phalanges.
  - **4 Digits (Index, Middle, Ring, Pinky)**: Proportioned anatomically (Middle longest, Pinky shortest), each constructed from 2-3 segmented faceted prism phalanges with micro-gaps revealing glowing emissive undertrim (`edgeMat`).
  - **Pose**: Fingers gently curled in a relaxed athletic cup (`~12°` per knuckle) that frames the floating disc at `(0, -0.06, 0.18)` without geometry intersections.
  - **Parts Tagging**: Tag all components with `chassis_suit` and `chassis_trim` so `CosmeticMaterialEngine.applyChassisSkin()` continues to dynamically tint all armor plates.
- **Alternative Considered**: Loading an external rigged GLTF mesh. *Rejected because the game's aesthetic and codebase rely on procedural Three.js geometry with flat shading and custom shader/color mutation.*

### 4. Persistent Palm Disc Wireframe Overlay
- **Decision**: In `src/armory/CosmeticMaterialEngine.js` (`applyDiscSkin`):
  - Remove the early return for `discMesh.userData.part === 'chassis_back_disc'`.
  - Calculate `palmRadius = (config.DISC_R || 0.6) * 0.46`.
  - When `shader.wireframeToggle` is true, generate and parent a conforming `wireframeOverlay` mesh using `createWireframeGeometry` scaled to `palmRadius`, colored with `secondaryColor` (`opacity: 0.85`).
  - When false, dispose and remove any existing wireframe overlay from the palm disc.
  - In `src/entities/Player.js`, preserve the wireframe overlay mesh on `state.player.obj.userData.backDisc` during gameplay countdown and idle states.
- **Alternative Considered**: Making wireframes universal across all skins. *Rejected per user decision; only skins with `wireframeToggle: true` render wireframe overlays.*

## Risks / Trade-offs

- **[Performance / Draw Calls]** Adding 5 fingers with segmented phalanges on both hands adds extra meshes to the rig.
  → *Mitigation*: Merge or keep geometry counts minimal (low-poly faceted prisms, ~12-16 triangles per finger segment). The athlete rig is single-player or low-entity count (ambient lobby + player), keeping WebGL draw calls well within budget.
- **[Disc Clashing]** Articulated fingers could intersect with the palm-mounted identity disc.
  → *Mitigation*: The Hover-Palm disc sits at `y = -0.06, z = 0.18` relative to the hand pivot. We position the palm and finger curl radii so the digits cup beneath and around the disc's 0.28m perimeter without clipping.
- **[DOM / Test Breakage]** Modifying the tactical rail layout could break automated UI tests.
  → *Mitigation*: Preserve all canonical DOM IDs (`#campaignBtn`, `#swarmBtn`, `#practiceBtn`, `#quickMatchBtn`, `#hostMatchBtn`, `#joinOnlineBtn`, `#armoryBtn`, `#achievementsBtn`, `#directivesBtn`, `#settingsBtn`) and event listener bindings.
