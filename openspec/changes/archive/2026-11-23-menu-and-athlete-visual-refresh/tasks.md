# Tasks: Menu & Athlete Visual Refresh

## 1. Branch Setup & Baseline Verification

- [x] 1.1 Switch to or create isolated git branch `change/menu-and-athlete-visual-refresh` from `main` and verify `git status` reports the active branch.
- [x] 1.2 Run baseline test runner (`node test/runner.js ui` and `node test/runner.js graphics`) to verify test suite passes prior to modifications.

## 2. Persistent Disc Wireframe Synchronization

- [x] 2.1 Update `applyDiscSkin` in `src/armory/CosmeticMaterialEngine.js` to construct and attach a scaled `wireframeOverlay` on `chassis_back_disc` when `shader.wireframeToggle === true`, and cleanly dispose/detach it when false.
- [x] 2.2 Update `src/entities/Player.js` and `src/graphics/ambientLobby.js` to preserve the palm-held disc wireframe overlay during countdown, idle, walking, and diorama loops.
- [x] 2.3 Add test assertions for palm disc wireframe lifecycle in `test/armory/` or `test/graphics/` and verify with `node test/runner.js armory`.

## 3. Humanoid 5-Finger Hands for Athlete Rigs

- [x] 3.1 Update `buildConstructLimbs` in `src/graphics/materials.js` to build an articulated 5-finger hand (faceted palm chassis, opposable thumb, and four segmented digits) when `archetype === 'player'`.
- [x] 3.2 Ensure proper `chassis_suit` and `chassis_trim` part tags on all palm and finger shards, natural cupped finger curling framing the Hover-Palm disc, and symmetric lateral mirroring for left and right hands.
- [x] 3.3 Add test assertions in `test/graphics/` verifying the 5-finger hand hierarchy and parts tagging, and verify with `node test/runner.js graphics`.

## 4. Main Menu Ambient Diorama Double-Jump

- [x] 4.1 Update the `JUMP` state machine in `src/graphics/ambientLobby.js` to execute a 2.3s multi-phase double-jump trajectory with mid-air impulse burst, particle spark burst, and cushioned landing.
- [x] 4.2 Update diorama jump assertions in `test/ambient_character_diorama.test.js` to validate the double-jump state progression and verify with `node test/runner.js graphics`.

## 5. Tactical Rail UI & Button Overhaul

- [x] 5.1 Update `index.html` CSS styles to add 45-degree chamfered cyberpunk geometry to `.tactical-rail` and `.mode-btn`, add high-speed neon sheen hover keyframes, and fix the `.identity-header` absolute positioning collision.
- [x] 5.2 Update `src/ui/menus.js` (`getMainMenuHtml`) to render the Survival variant toggle as a flush, integrated segmented tab strip without nested border boxes.
- [x] 5.3 Bind tactical rail button `mouseenter` events to synthetic WebAudio feedback (`playTerminalKeySound`) and click events to `playEquipSound`.
- [x] 5.4 Verify tactical rail button interactions, mobile responsive layout (< 768px), and UI test assertions pass with `node test/runner.js ui`.

## 6. Full Integration & Regression Verification

- [x] 6.1 Run full project test suite (`npm test`) and verify all test suites pass without regression.
