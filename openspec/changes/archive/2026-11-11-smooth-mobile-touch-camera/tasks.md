# Tasks

## 1. Frame-Rate-Independent Touch Velocity & Inertia Integrator

- [x] 1.1 Update `touchState` in `src/core/state.js` and `onTouchMove` / `onTouchEnd` in `src/input/touch.js` to filter delta spikes (`MAX_TOUCH_DELTA = 240`), apply `0.75x` vertical pitch scaling, track timestamped EMA velocity (`px/s`, clamped to `2200 px/s`), and cancel stale velocity when a drag pauses longer than `80ms` before release; update `test/gameplay/mobile_controls.test.js` to verify velocity capture, spike filtering, and pause-before-lift cutoff.
- [x] 1.2 Rewrite `updateTouchMomentum(dt)` in `src/input/touch.js` to integrate angular velocity proportional to `dt` with exponential damping controlled by the active `touchInertia` preset (`smooth`, `light`, `off`) while preserving instant tap-to-stop braking on right-zone touch and desktop pointer-lock bypass; verify equivalent total drift between `0.016s` (60Hz) and `0.008s` (120Hz) step cadences in `test/gameplay/mobile_controls.test.js`.

## 2. Throw-Hold Aim-Drag & Touch Lifecycle Reset

- [x] 2.1 Add `state.throwTouchId` tracking and a `4px` tap-slop deadzone in `src/input/touch.js` so holding `#btnThrow` and dragging steers camera `yaw` and `pitch` continuously while charging, releases cleanly for matching `throwTouchId` without post-throw inertia drift, ignores unrelated secondary fingers, and preserves synthetic empty-touch `TouchEvent` compatibility; add automated assertions in `test/gameplay/mobile_controls.test.js`.
- [x] 2.2 Implement and export `resetTouchInputs()` in `src/input/touch.js` and wire it into pause (`src/ui/modals.js` / `src/core/main.js`), round resets (`src/entities/Player.js`), game over (`src/ui/UIManager.js`), main menu return (`src/ui/menus.js`), and multiplayer teardown (`src/network/roomManager.js`); add pause/reset cleanup verification in `test/gameplay/mobile_controls.test.js`.

## 3. Touch & Camera Preferences in System Settings

- [x] 3.1 Add `touchSensitivity` (`1.0`, range `0.5`–`2.0`), `touchInertia` (`'smooth'` | `'light'` | `'off'`), and `invertY` (`false`) to `DEFAULT_SETTINGS` and `SettingsManager.apply()` in `src/core/settings.js` (keeping `state.invertY` synchronized cleanly alongside `AuthManager` settings hydration), and read those settings live in `src/input/touch.js`; verify storage round-trip and live effect in `test/gameplay/mobile_controls.test.js`.
- [x] 3.2 Render the Controls & Touch section (`#touchSensSlider`, `.inertia-btn` for `SMOOTH` / `LIGHT` / `OFF`, and `#toggleInvertYBtn`) in `src/ui/modals/SettingsModal.js` and update `#mobileHint` copy in `index.html` if needed to mention drag-to-aim while holding Throw; verify via `node test/auth/auth_terminal_integration.test.js`, `node test/gameplay/mobile_modal_scrolling.test.js`, and `node test/gameplay/mobile_controls.test.js`.

## 4. End-to-End Verification

- [x] 4.1 Run the full test suite (`node test/runner.js all`) and `openspec validate smooth-mobile-touch-camera` and confirm all 44+ test suites and strict spec validations pass cleanly.
