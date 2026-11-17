# Design: Minimal Combat Notifications

## Context

The current in-game notification mechanism routes all notification strings through `message(t)` in `src/ui/hud.js`, which directly manipulates the DOM element `#msg`. `#msg` is styled with static properties (`position: absolute; left: 50%; top: 24%; transform: translateX(-50%); font-size: 38px; letter-spacing: 10px;`) and stays visible for 2.0 seconds (`state.msgT = 2`).

In active play, routine locomotion (double-jumping, recovery jump, recovery dash) and routine combat exchanges (deflections, shield hits, evades, rear strikes) repeatedly overwrite `#msg`. Because `top: 24%` sits directly in the third-person aiming line of sight, this obscures crosshairs, incoming discs, and opponent characters. Furthermore, when the player steps off a collapsing floor into the void recovery zone (`y < 0 && y > -3.5`), the system spams `SURFACE COLLAPSE — JUMP / DASH!` onto `#msg`, blinding the player while they try to aim for a safe tile.

## Goals / Non-Goals

**Goals:**
- Eliminate routine locomotion (`AIR JUMP`, `RECOVERY JUMP`, `RECOVERY DASH`) and routine combat popups (`DEFLECTED!`, `SHIELD HIT`, `REAR STRIKE x2`, etc.) from `#msg`.
- Elevate `#msg` to `top: 15%` and apply fluid responsive typography (`clamp(...)`) so major match announcements scale smoothly between mobile, tablet, and desktop viewports without encroaching on crosshairs.
- Tighten major announcement screen persistence from 2.0 seconds to 1.5 seconds maximum.
- Implement an unmistakable, non-obstructing surface collapse hazard system combining a peripheral amber screen vignette pulse, warning audio cue, and a compact dock-adjacent warning badge when entering the recovery zone.
- Update test assertions in `test/gameplay/physics_and_combat.test.js` to verify combat physics directly without checking `#msg` text strings.

**Non-Goals:**
- Altering existing audio synthesis, disc collision particles, or jump burst particle emitters.
- Modifying the floating economy layer (`showFloatingNeonCredits`, `+25 PARRY`, etc.).
- Changing `#countdownText` (`3`, `2`, `1`, `FIGHT!`) rendering at `top: 50%`.

## Decisions

### Decision 1: Notification Filtering & Locomotion Stripping
- **Approach**: Remove `message('AIR JUMP')`, `message('RECOVERY JUMP')`, and `message('RECOVERY DASH')` entirely from `src/entities/Player.js`. In `src/entities/Disc.js`, eliminate routine combat popup calls to `message()`.
- **Rationale**: Double-jumping and dashing are routine inputs with immediate audiovisual feedback (jump sound, jump burst particles, character animation, camera shake). Text banners add no value and produce continuous visual distraction.
- **Alternatives Considered**: Gating notifications behind a setting toggle. Rejected per design alignment for a unified, clean default for all players.

### Decision 2: Fluid Typography and Viewport Elevation for `#msg`
- **Approach**:
  ```css
  #msg {
    position: absolute;
    left: 50%;
    top: 15%;
    transform: translateX(-50%);
    text-align: center;
    font-size: clamp(16px, 3vw, 24px);
    letter-spacing: clamp(4px, 0.8vw, 8px);
    text-shadow: 0 0 16px var(--cyan);
    opacity: 0;
    transition: opacity 0.25s ease;
    pointer-events: none;
    z-index: 200;
  }
  ```
- **Rationale**: Elevating `#msg` to `top: 15%` moves it safely above character models and crosshair reticles. `clamp()` guarantees legibility without text wrapping on compact mobile devices or overwhelming high-resolution monitors.
- **Duration**: `state.msgT` initialized to 1.5s instead of 2.0s for swift transitions.

### Decision 3: Peripheral Amber Hazard Vignette & Dock-Adjacent Alert
- **Approach**:
  - Add an inset vignette layer `#hazardVignette` fixed to viewport bounds (`position: fixed; inset: 0; pointer-events: none; z-index: 90; opacity: 0; box-shadow: inset 0 0 40px 10px rgba(255,106,16,0.6); transition: opacity 0.2s ease;`).
  - Add a compact `#hazardAlert` element situated just above the bottom-center under-rail dock (`bottom: 96px`), showing `SURFACE COLLAPSE // JUMP OR DASH` in amber.
  - In `updatePlayer(dt)` / `hud.js`, activate the vignette and alert when `inRecoveryZone && state.player.vy <= 0`, and trigger a one-shot warning audio pulse via procedural synth.
- **Rationale**: Peripheral vision detects color pulses instantly. Positioning the text alert near the jump/dash meters keeps the upper 75% of the screen completely clear so players can aim their jump trajectory onto surviving tiles.

### Decision 4: Decoupled Test Harness
- **Approach**: Update `test/gameplay/physics_and_combat.test.js` to inspect `discs.some(d => d.isDeflected)` and `dbg.state.player.shieldCd > 0` rather than asserting `dbg.lastMessage() === 'DEFLECTED!'`.
- **Rationale**: Physical gameplay mechanics should be tested via state variables and simulation outputs, not UI presentation strings.

## Risks / Trade-offs

- **[Risk]** Existing tests or external consumers expecting `lastMessage()` to reflect combat hits.
  - **Mitigation**: Update internal test suites to inspect state; maintain `dbg.lastCombatEvent` if internal telemetry is queried.
- **[Risk]** Player unware they are in danger of falling without center text.
  - **Mitigation**: Combined audio alarm, pulsing amber screen border vignette, and dock-adjacent indicator provide superior sensory urgency compared to plain center text.
