# Tasks: Playable 3D Lobby & Onboarding Calibration

## 1. Boot Terminal & Cold Open Flow

- [x] 1.1 Implement `#bootTerminal` HTML structure and cyber-terminal CSS in `index.html`, binding click interaction in `src/core/main.js` to request pointer lock and resume Web Audio. Verify clicking anywhere locks cursor and resumes audio context.
- [x] 1.2 Wire persistent storage check in `src/storage/` for `calibration_completed` to bypass `#bootTerminal` for returning players and route new players to calibration. Verify persistent flag routing in test environment.

## 2. Onboarding Calibration Gauntlet (Beats 1-3 & Bypass)

- [x] 2.1 Implement `state.gameMode = 'calibration'` state machine in `src/modes/` and `src/core/main.js`, initializing a focused single-platform sector. Verify calibration mode spawns cleanly without triggering standard wave spawners.
- [x] 2.2 Wire Beat 1 (Kinetic Strike on stationary drone), Beat 2 (Incoming disc volley with 0.25x slow-mo parry prompt), and Beat 3 (Pillar ricochet/curve target). Verify each beat transitions seamlessly upon target destruction.
- [x] 2.3 Implement Calibration Bypass listener for `ESC`, Gamepad `Start`, and mobile UI tap, terminating calibration immediately and navigating to the lobby. Verify bypass cleanly clears active calibration entities.
- [x] 2.4 Implement calibration completion progression rewards: deposit 100 Arc Bits, award Grid 01 Star 1 in campaign storage, and set `calibration_completed = true`. Verify economy balance and campaign star progression update correctly.

## 3. Holographic Disc Materialization

- [x] 3.1 Implement procedural disc condensation visual sequence in `src/entities/Player.js` during `startCountdown(3.0)`, scaling wireframe opacity and condensing energy particles into the athlete's palm. Verify visual transition from wireframe to solid mesh across countdown ticks.
- [x] 3.2 Add Web Audio synthesizer pitch sweep and metallic lock transient in `src/audio/sfx.js` triggered at countdown completion (`ENGAGE`). Verify audio stinger plays cleanly in sync with disc lock.

## 4. Playable 3D Arena Lobby & Energy Cores

- [x] 4.1 Implement `state.gameMode = 'lobby'` environment in `src/ui/menus.js` and `src/core/main.js`, keeping character locomotion, camera aiming, and disc throwing enabled while menus are active. Verify player can run and throw discs in the lobby.
- [x] 4.2 Spawn interactive 3D Energy Core meshes (`CIRCUIT`, `SURVIVAL`, `DUELS`, `ARMORY`) around the lobby perimeter with continuous idle rotation and pulse shaders. Verify cores render and animate in 3D world-space.
- [x] 4.3 Add disc projectile collision detection with Energy Cores to trigger mode launch sequence. Verify throwing a disc into an Energy Core detects intersection.
- [x] 4.4 Implement holographic Energy Core Launch Confirmation dialog (`#coreConfirmModal`) with `coreLaunchConfirmation` setting support (default: ON). Verify modal prompts on core strike when enabled and launches immediately when disabled.
- [x] 4.5 Preserve existing DOM button IDs (`#campaignBtn`, `#swarmBtn`, `#hostMatchBtn`, `#armoryBtn`) in an accessible container to guarantee automated puppeteer test suite compatibility. Verify legacy button events trigger respective mode starts.

## 5. Dual Perspective Viewport Switching (1P / 3P)

- [x] 5.1 Update `updateCamera()` in `src/graphics/scene.js` to smoothly lerp camera distance and height between Third-Person (`DIST: 9.0`, `HEIGHT: 4.3`) and First-Person (`DIST: 0.0`, `HEIGHT: 1.8`) over 0.2 seconds. Verify camera lerp interpolates without clipping through arena bounds.
- [x] 5.2 Implement athlete mesh culling in `src/entities/Player.js` when in First-Person perspective (`blend < 0.2`), hiding head and torso while keeping arm bones and disc visible. Verify head geometry does not obstruct the camera in First-Person.
- [x] 5.3 Bind Middle Mouse Button (`MMB`) in `src/input/mouse.js`, Right Stick Click (`R3`) in gamepad input, and add `#btnPerspectiveToggle` to mobile HUD. Verify all three input devices toggle perspective reliably.

## 6. Settings & Device-Adaptive HUD Prompts

- [x] 6.1 Remove runtime mouse wheel sensitivity scaling from `src/input/mouse.js`, and add Mouse Look Sensitivity numeric slider to `src/ui/settingsModal.js` persisting to `settingsManager`. Verify mouse wheel scrolling during combat does not alter aim sensitivity.
- [x] 6.2 Add settings controls for `coreLaunchConfirmation` (toggle) and `defaultCameraPerspective` (`third_person` vs `first_person`) to System Config. Verify options persist and restore across reloads.
- [x] 6.3 Implement dynamic device-adaptive prompt helper in `src/ui/hud.js` updating instructional glyphs based on active input (KBM vs Gamepad vs Touch). Verify prompts switch appropriately when input method changes.

## 7. Verification & Regression Testing

- [x] 7.1 Execute project unit and integration test suites (`npm run test:storage`, `npm run test:economy`, `npm run test:armory`, `npm run test:campaign`). Verify all existing domain test suites pass.
- [x] 7.2 Run headless game test runner (`node test/runner.js`) to verify core combat simulation and mode transitions pass without headless browser exceptions.
