# Tasks

## 1. Core State & Parry Timing Engine

- [x] 1.1 Add `parryTimer` and `shieldCd` fields to `state.player` in `src/core/state.js`, and implement `triggerPlayerParry()` in `src/entities/Player.js` requiring `hasDisc`, `shieldCd <= 0`, and `parryTimer <= 0` to initiate the 0.35s parry window. Verify by checking player state properties on trigger.
- [x] 1.2 Update `updatePlayer` in `src/entities/Player.js` to decrement `parryTimer` and `shieldCd` per frame delta `dt`, automatically entering 1.0s `shieldCd` on whiff expiration, and pass `blocking: state.player.parryTimer > 0` into `animateProgramKinematics`. Verify with unit test simulating frame elapsed time.

## 2. Disc Deflection & Collision Integration

- [x] 2.1 Update frontal deflection in `src/entities/Disc.js` to check `state.player.parryTimer > 0`, immediately resetting `parryTimer = 0` and setting `shieldCd = 1.0` upon deflection while preserving Guard Crush bypass for throws with charge >= 0.85. Verify via simulated disc collision with active parry vs cooldown.

## 3. Input Handling & Controller Dispatch

- [x] 3.1 Refactor mouse right-click in `src/input/mouse.js`, gamepad L2 in `src/input/gamepad.js`, and touch button in `src/input/touch.js` to dispatch edge-triggered parry impulses via `triggerPlayerParry()` without sustaining block state across holds. Verify that continuous button holds do not prevent parry window expiration.
- [x] 3.2 Ensure touch button `#btnBlock` and gamepad states reset cleanly on pause, modal opens, and round resets in `src/input/touch.js` and `src/input/gamepad.js`. Verify by checking state flags after modal trigger.

## 4. HUD & Audio Sensory Feedback

- [x] 4.1 Update `src/ui/hud.js` and `index.html` CSS styles to add `.parry-active` and `.parry-cooldown` classes to the reticle crosshair, and `.cooling` styling to touch `#btnBlock` during recovery cooldown. Verify visual classes toggle synchronously with player timers.
- [x] 4.2 Add lightweight procedural synth audio cues in `src/audio/sounds.js` for parry activation snap and whiff fizzle discharge. Verify sound playback triggers on parry start and whiff expiration.

## 5. Verification & Test Suite

- [x] 5.1 Update `test/gameplay/physics_and_combat.test.js` to validate active parry deflection (0.35s window), recovery cooldown lockout (1.0s), whiff timeout, and Guard Crush penetration. Verify with `npm test`.
- [x] 5.2 Update `test/gameplay/multiplayer.test.js` debug harness to ensure parry deflection synchronizes across network clients during the active window. Verify tests pass cleanly.

## Workflow follow-up

- Archive the change after implementation and test verification.
- Verify the archived spec synchronization with `openspec list --specs`.
