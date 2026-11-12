# Proposal

## Why

Moving the camera on mobile devices currently feels abrupt and unnatural because touch look stores the last single `touchmove` pixel delta and applies it every frame without `dt` scaling, creating severe frame-rate-dependent overshoot (~7x extra spin at 60 FPS, ~14x at 120 FPS) and abrupt release behavior while simultaneously blocking camera aiming when holding the Throw button. Fixing the touch velocity integrator, adding throw-hold aim-drag, and exposing touch camera tuning will make dual-thumb mobile combat smooth, controllable, and predictable without sacrificing quick flicks.

## What Changes

- **Frame-Rate-Independent Touch Velocity & Smooth Inertia**: Replace the raw per-frame `lookMomentumX` / `lookMomentumY` accumulator with timestamped exponential-moving-average (EMA) velocity tracking (`px/s`), integrated by `dt` after finger lift with exponential damping, flick speed clamping, jump-spike filtering, soft vertical pitch scaling (`0.75x`), and staleness cutoff (cancelling stale momentum if a finger pauses before lift).
- **Aim-Drag While Holding Throw (`#btnThrow`)**: Track `throwTouchId` on `#btnThrow` so dragging the charging thumb past a small tap-slop threshold (`~4px`) steers camera yaw and pitch smoothly throughout a charged throw, while releasing the finger launches the disc at current charge and zeroes leftover throw-drag drift so aimed shots stay on target.
- **Tap-to-Stop & Lifecycle Touch Reset**: Preserve immediate tap-to-stop inertia braking when touching the right look zone, and introduce `resetTouchInputs()` on pause, modal transitions, round resets, and multiplayer teardown so stuck touch IDs or virtual joystick deflections cannot persist.
- **Touch Camera Settings Controls**: Add `touchSensitivity` (`0.5`–`2.0`, default `1.0`), `touchInertia` (`'smooth'` | `'light'` | `'off'`, default `'smooth'`), and `invertY` controls to `settingsManager` and `SettingsModal` (surfaced cleanly in both Pause Settings and the Terminal's `SYSTEM CONFIG` tab).
- **Out of Scope**: Desktop pointer-lock mouse aiming, gamepad stick aiming, and Best-of-1/3/5 multi-round online match series (Change C).

## Capabilities

### New Capabilities
- `touch-input`: Mobile touch virtual joystick locomotion, smoothed velocity-based camera aiming with configurable flick inertia, throw-hold aim-drag steering, spike rejection, and touch state reset hygiene.

### Modified Capabilities
- `system-settings`: Add Touch & Camera configuration controls (`touchSensitivity`, `touchInertia` preset, and `invertY` inversion toggle) backed by persistent settings storage.

## Impact

- **Input & Engine**: `src/input/touch.js`, `src/core/state.js`, `src/core/main.js`, `src/entities/Player.js`.
- **Settings & UI**: `src/core/settings.js`, `src/ui/modals/SettingsModal.js`, `src/ui/modals.js`, `src/ui/menus.js`, `src/network/roomManager.js`, `index.html` (mobile hint copy/styling if needed, keeping 44x44px tap targets).
- **Tests**: `test/gameplay/mobile_controls.test.js` (update inertia assertions from raw pixel delta to frame-rate-independent velocity inertia and add throw-hold aim-drag, staleness cutoff, spike clamp, and settings preset coverage).
