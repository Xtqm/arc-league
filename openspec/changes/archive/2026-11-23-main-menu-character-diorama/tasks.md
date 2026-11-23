# Tasks

## 1. Match Teardown and Combat HUD Isolation

- [x] 1.1 Implement centralized `teardownActiveMatch()` function to remove and dispose all active `state.discs` and `state.foes`, reset spawn/countdown timers, and restore arena tiles; verify unit test covers entity cleanup
- [x] 1.2 Implement combat HUD hide/show helper to toggle visibility for `#tr`, `#bottomDock`, `#reticle`, `#lockPrompt`, and `#keymon` when transitioning between match and lobby states; verify DOM elements hide on menu entry
- [x] 1.3 Wire `teardownActiveMatch()` into `showModeSelect()`, `showModeSelectMenu()`, and match cancellation handlers in `src/ui/menus.js` and `src/ui/modals.js`; verify no bots, discs, or combat meters linger in the background

## 2. 2-Tier Escape and Fullscreen Retention

- [x] 2.1 Integrate `navigator.keyboard.lock(['Escape'])` in `requestFullScreen()` and `navigator.keyboard.unlock()` in `exitFullScreen()` in `src/ui/modals.js` with feature detection fallback; verify fullscreen entry requests escape lock
- [x] 2.2 Update Escape key routing in `src/input/keyboard.js` and `src/ui/modals.js` so the first Escape press releases pointer lock and triggers the pause menu without exiting fullscreen; verify in unit/integration tests
- [x] 2.3 Implement second Escape press handling when pointer is already unlocked or game is paused to exit fullscreen mode; verify double Escape cleanly exits fullscreen

## 3. 3D Character Staging Diorama

- [x] 3.1 Refactor `src/graphics/ambientLobby.js` to instantiate a 3D Athlete Rig (`makeProgram`) with player archetype, floor pedestal ring, and equipped cosmetics via `CosmeticMaterialEngine`; verify diorama rig spawns in the right 65% staging quadrant
- [x] 3.2 Implement autonomous diorama finite-state machine in `ambientLobby.js` supporting idle hover breathing, periodic jump impulse with landing cushion, and throw wind-up; verify state machine cycles without errors
- [x] 3.3 Implement telekinetic throw and boomerang return trajectory with dedicated diorama disc and magnetic catch cushion animation; verify smooth loop and palm disc restoration
- [x] 3.4 Wire `despawnDiorama()` into match start routines in `src/ui/menus.js` and cosmetic change refresh hooks; verify diorama pauses and hides during active matches

## 4. Verification and Regression Testing

- [x] 4.1 Create automated test suite in `test/ambient_character_diorama.test.js` validating match teardown, HUD toggling, diorama lifecycle, and Escape key state transitions
- [x] 4.2 Run existing test runner (`node test/runner.js`) to ensure all existing menu, combat, and input tests continue passing without regressions
