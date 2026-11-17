# Tasks

## 1. Input Engine & Curve Accumulation

- [x] 1.1 Implement continuous curve accumulation, memory lock, and opposite-key neutralization in `src/input/keyboard.js`, and verify accumulator dynamics with an isolated test script.
- [x] 1.2 Connect Gamepad `L1`/`R1` bumpers in `src/input/gamepad.js` to the continuous curve accumulator, verifying parity with keyboard input.
- [x] 1.3 Implement Hold-Throw + Swipe-Curve gesture math and directional deadzone gating in `src/input/touch.js`, verifying touch tap, horizontal swipe curve, and vertical aim look.

## 2. Core Combat Physics & Trajectory Parity

- [x] 2.1 Update launch velocity calculation in `src/entities/Player.js` to apply the inverse speed penalty `(1.0 - 0.25 * Math.abs(curve))` and clear locked curve post-throw, verifying disc velocity scaling.
- [x] 2.2 Update `src/physics/trajectory.js` trajectory simulation to apply the identical curve speed penalty and continuous curve inputs, verifying predicted path matches projectile flight.
- [x] 2.3 Verify `src/entities/Disc.js` and multiplayer throw network serialization (`DISC_THROW`) preserve continuous floating-point curve values without degradation.

## 3. HUD Reticle & Mobile UI Overhaul

- [x] 3.1 Update `src/ui/hud.js` and reticle styles to dynamically translate and illuminate crosshair brackets based on continuous curve magnitude, verifying bracket visual feedback.
- [x] 3.2 Remove `#btnCurveL` and `#btnCurveR` DOM elements and associated styles from `index.html`, `src/ui/hud.js`, and `src/input/touch.js`, verifying clean mobile HUD layout.

## 4. Verification & Integration

- [x] 4.1 Run the full project test suite (`npm test`) to ensure existing disc combat, aiming, and touch input regressions do not occur.
- [x] 4.2 Verify end-to-end disc curving across keyboard, gamepad, and touch emulation, confirming 3D trajectory parity and speed trade-offs.

## Workflow follow-up

- Archive the change after implementation and verification are complete.
