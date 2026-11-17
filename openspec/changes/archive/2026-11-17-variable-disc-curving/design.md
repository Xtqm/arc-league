# Design: Variable Disc Curving

## Context

Identity disc combat currently uses binary curve inputs (`-1.0`, `0.0`, `1.0`), resulting in fixed-radius trajectories that limit spatial outplay. On mobile, two toggle buttons (`#btnCurveL` and `#btnCurveR`) clutter the right-hand action cluster. The trajectory prediction engine in `src/physics/trajectory.js` and the projectile physics in `src/entities/Disc.js` already accept floating-point curve parameters, and multiplayer network sync payloads serialize `curve` as a float. This design introduces continuous curve charging on desktop/gamepad, a swipe-curve gesture on mobile, dynamic visual feedback, and an inverse speed penalty to balance wide-angle shots.

See `proposal.md` for background and motivation.

## Goals / Non-Goals

**Goals:**
- Provide continuous curve charging from `0.0` to `1.0` (left or right) on PC (`KeyQ`/`KeyE`) and Gamepad (`L1`/`R1`) over a snappy `0.40s` window.
- Implement a curve memory lock on key release so players can freely WASD-strafe and aim before throwing, with immediate opposite-key neutralization.
- Implement a Hold-Throw + Swipe-Curve gesture on mobile `#btnThrow` with radial deadzones and directional gating, eliminating `#btnCurveL`/`#btnCurveR`.
- Apply an inverse speed scaling penalty (`1.0 - 0.25 * curveMagnitude`) to trade direct velocity for flanking angles.
- Maintain strict trajectory prediction parity between `trajectory.js` and `Disc.js`.
- Provide intuitive HUD feedback via dynamic widening crosshair brackets and real-time 3D trajectory laser bending.

**Non-Goals:**
- Vertical curve / pitch bending (flight curvature remains strictly in the horizontal Magnus plane).
- In-flight aftertouch steering (curve trajectory is locked at disc launch).
- Modifying combat AI bots (bots can continue using discrete or randomized curve inputs).

## Decisions

### Decision 1: Input Curve Accumulator and Memory Lock
- **Choice**: Maintain a continuous curve accumulator in `state.playerCurveIntent` (`-1.0` to `+1.0`) with lock state.
- **Keyboard/Gamepad Dynamics**:
  - Holding `KeyQ` (or Gamepad `L1`) ramps negative curve at `2.5 / s` (`dt / 0.40s`).
  - Holding `KeyE` (or Gamepad `R1`) ramps positive curve at `2.5 / s`.
  - Releasing keys retains the current accumulator value in memory.
  - Tapping the opposite key immediately steps the accumulator toward neutral (`0.0`).
  - Successfully throwing a disc clears the locked curve back to `0.0`.
- **Rationale**: Requiring players to hold `KeyQ`/`KeyE` simultaneously while releasing Left Click and strafing with `A`/`D` severely restricts keyboard mobility. Locking curve on release allows deliberate setup followed by full movement freedom.
- **Alternatives Considered**:
  - *Hold-only (no lock)*: Rejected because holding Q prevents pressing A for left strafe.
  - *Discrete tap tiers (tap=30%, hold=100%)*: Rejected because continuous charging gives players granular control to thread narrow arena gaps.

### Decision 2: Mobile Hold-Throw + Swipe-Curve Gesture
- **Choice**: Gated swipe on `#btnThrow`:
  - When `#btnThrow` is pressed, record `throwStartX` and `throwStartY`.
  - **Deadzone (< 10px)**: Retains camera micro-aim and throw charging.
  - **Horizontal Swipe (> 15px horizontal offset & |dX| > |dY| * 0.8)**: Engages curve mode:
    `curve = THREE.MathUtils.clamp(dX / 75.0, -1.0, 1.0)`
  - **Vertical Drag**: Continues to pass delta to camera look rotation (`applyTouchLookDelta`).
  - **Return to Center (< 10px)**: Resets curve to `0.0`.
  - Releasing launches the disc with the resulting curve.
- **Rationale**: Removes 2 cluttering buttons from the mobile HUD without sacrificing camera look controls. Mimics the physical feel of whipping a disc.
- **Alternatives Considered**:
  - *Movement joystick curving*: Rejected because it ties curve to character movement, preventing players from strafing away while curving back.
  - *Dedicated 2-axis throw pad*: Rejected because it disables camera aiming while charging.

### Decision 3: Velocity Penalty Formula
- **Choice**: Scale launch speed by `(1.0 - 0.25 * Math.abs(curve))`:
  `const speed = (38.0 + 17.0 * charge) * (1.0 - 0.25 * Math.abs(curve));`
- **Rationale**: Maximum curve produces sweeping flank trajectories capable of rear-strike criticals. A 25% speed penalty lengthens flight time and creates counterplay opportunities (dodging, turning to block), preventing curve spam.
- **Parity**: Exactly identical formula applied in `src/entities/Player.js` and `src/physics/trajectory.js`.

### Decision 4: Dynamic Reticle HUD Feedback
- **Choice**: Drive CSS custom properties `--curve-mag-l` and `--curve-mag-r` on `#ch` (crosshair container):
  - Brackets translate outward: `transform: translateX(calc(var(--curve-mag) * -16px))` for left bracket, `+16px` for right bracket.
  - Bracket opacity and glow intensify with magnitude.
- **Rationale**: Clean visual cue centered in the player's foveal vision without adding separate dashboard meters.

## Risks / Trade-offs

- **[Risk] Accidental curve engagement on mobile during camera aiming**
  → *Mitigation*: 15px threshold and angular gating (`|dX| > |dY| * 0.8`) ensure pure vertical or diagonal camera pans are not treated as curve swipes. Returning to center resets curve to zero.
- **[Risk] Unnoticed locked curve firing on desktop**
  → *Mitigation*: Both the reticle bracket and the glowing 3D trajectory line clearly indicate dialed curve before throw. Firing automatically clears the lock.
- **[Risk] Flight duration expiration on high-curve throws**
  → *Mitigation*: The 25% penalty keeps minimum speed at ~28.5 m/s (uncharged) to 41.25 m/s (charged), well within the safe return recall watchdog window.
