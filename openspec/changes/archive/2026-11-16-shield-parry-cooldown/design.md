# Design

## Context

Currently, `state.player.blocking` is driven directly by held button states (`mousedown`, Gamepad `L2`, or touch `#btnBlock`). As long as the button remains pressed and `state.player.hasDisc` is true, the player remains in an indefinite blocking stance, reducing movement speed to 5.5 m/s but granting full frontal projectile immunity and automatic 1.25x deflection.

For background and motivation, see `proposal.md`. For formal behavioral requirements, see `specs/player-character/spec.md`.

## Goals / Non-Goals

**Goals:**
- Replace sustained shield hold with a discrete active parry window (`0.35s`) and mandatory recovery cooldown (`1.0s`).
- Ensure shield input functions as an edge-triggered activation rather than a held state.
- Trigger recovery cooldown upon parry window expiration (whiff) or upon successful deflection (hit).
- Provide diegetic HUD and audio feedback for active parry, whiff discharge, and cooldown readiness.
- Keep kinematic humanoid rig and multiplayer network bitflags synchronized with the active parry window.
- Maintain existing Guard Crush behavior for heavy throws ($\ge 85\%$ charge).

**Non-Goals:**
- Modifying Arbiter Boss multi-layer shield mechanics (Rival shields are distinct entity hit-point layers managed by `ArbiterBossController.js`).
- Changing dash energy costs or jump mechanics.
- Adding parry window upgrades or variable cooldowns based on character stats or loadouts.

## Decisions

### 1. State Model: `parryTimer` and `shieldCd`
- **Choice**: Add `parryTimer: 0` and `shieldCd: 0` to `state.player` in `src/core/state.js`.
- **Behavior**:
  - Activation: If `hasDisc && shieldCd <= 0 && parryTimer <= 0`, set `parryTimer = 0.35`.
  - Frame Step (`src/entities/Player.js`):
    - If `parryTimer > 0`: Decrement by `dt`. If it reaches `<= 0`, set `parryTimer = 0` and `shieldCd = 1.0` (whiff).
    - If `shieldCd > 0`: Decrement by `dt` down to 0.
  - Deflection Event (`src/entities/Disc.js`):
    - When a hostile disc strikes frontally and `parryTimer > 0`, execute deflection, then immediately set `parryTimer = 0` and `shieldCd = 1.0`.
- **Rationale**: Clean, deterministic timer management that mirrors the existing `dashCd` model.
- **Alternatives Considered**:
  - *Stamina/Energy drain*: Allows players to hold block continuously until energy depletes. Rejected because it does not stop turtling during full-energy openings.
  - *Chain-parry reset on hit*: Resets cooldown on deflection. Rejected because it allows trivial defense against clustered boss volleys and swarm projectiles.

### 2. Edge-Triggered Input Dispatch
- **Choice**: In `src/input/mouse.js`, `src/input/gamepad.js`, and `src/input/touch.js`, invoke an activation helper `triggerPlayerParry()` on initial press.
- **Behavior**:
  - Mouse: Button 2 `mousedown` triggers parry. `mouseup` does not cancel cooldown.
  - Gamepad: Button `L2` just-pressed edge triggers parry.
  - Touch: `#btnBlock` `touchstart` triggers parry.
  - Holding input down past `0.35s` has zero effect; releasing and re-pressing while `shieldCd > 0` is ignored.
- **Rationale**: Prevents accidental continuous blocking and enforces intentional timing.

### 3. Kinematic Animation & Rig Synchronization
- **Choice**: Pass `blocking: state.player.parryTimer > 0` to `animateProgramKinematics` in `src/entities/Player.js`.
- **Behavior**: Character model snaps arms and disc forward into holographic shield brace strictly while `parryTimer > 0`. On expiration or deflection, arms transition smoothly back to idle/locomotion.

### 4. Audio & HUD Feedback
- **Choice**:
  - **Reticle**: Toggle `ch.classList.toggle('parry-active', state.player.parryTimer > 0)` and `ch.classList.toggle('parry-cooldown', state.player.shieldCd > 0)` in `src/ui/hud.js`.
  - **Touch**: Toggle `#btnBlock.classList.toggle('cooling', state.player.shieldCd > 0)`.
  - **SFX**: Integrate lightweight procedural synth sounds for parry raise snap and whiff fizzle in `src/audio/sounds.js`.

### 5. Network Bitflag Compatibility
- **Choice**: In `src/network/sync.js`, bit 0 of packet byte 17 (`flags |= 1`) remains set while `state.player.parryTimer > 0`.
- **Rationale**: Remote peers see the parry stance active only during the true 0.35s window, without needing any packet protocol modifications.

## Risks / Trade-offs

- **[Risk] High-speed projectile reaction window feels too punishing**:
  - *Mitigation*: Identity discs travel at 38–55 m/s across a 24–32m arena (0.4s–0.7s flight time). A 0.35s active window (21 frames @ 60fps) provides a fair reaction threshold for throws across mid-to-long range. If testing reveals mid-court throws are too tight, the constant can be easily tuned in config.
- **[Risk] Existing gameplay tests break due to assuming indefinite blocking**:
  - *Mitigation*: Update unit and end-to-end combat tests (`test/gameplay/physics_and_combat.test.js` and `test/gameplay/multiplayer.test.js`) to trigger parry within the active 0.35s window before collision.
- **[Risk] Input queueing / buffering during cooldown**:
  - *Mitigation*: Do not buffer parry inputs during cooldown. The player must press after cooldown finishes to avoid accidental early triggers.
