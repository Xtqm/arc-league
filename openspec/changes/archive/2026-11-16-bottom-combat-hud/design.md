# Design: Bottom-Center Combat HUD Under-Rail Dock

## Context

Player vitality in Arc League is currently anchored in the `#tl` panel at the top-left corner of `index.html`. During fast-paced matches, players look primarily at the central arena where their character, crosshair, and opponents interact. In addition, the Identity Disc is currently rendered as a generic progress bar identical in shape to the health and energy bars.

Telemetry updates in `src/ui/hud.js` use dirty-checked state comparison (`_lastPlayerHp`, `_lastPlayerHasDisc`, `_lastPlayerEnergy`) and cached DOM references (`_domCache`) to prevent layout thrashing and maintain 60/120fps rendering.

## Goals / Non-Goals

**Goals:**
- Construct an ultra-minimal bottom-center dock (`#bottomDock`) containing the Program Integrity bar, Identity Disc emblem, and Dash Energy bar.
- Style the dock with an under-rail hybrid aesthetic: a slim, glowing 1px cyan neon datum line beneath floating bars with transparent arena gaps.
- Replace the horizontal disc bar with a glowing, multi-state circular disc emblem (`#discEmblem`).
- Reposition `#hint` and `#mobileHint` vertically above the dock so opening hints do not overlap the meters.
- Retain zero-DOM-thrashing dirty checking in `src/ui/hud.js`.
- Maintain full compatibility across desktop monitors and mobile touch displays.

**Non-Goals:**
- Altering the top-right HUD (`#tr`), score pips, boss/rival bar, or pause/fullscreen controls.
- Re-architecting touch joystick or action cluster mechanics.
- Altering game simulation logic in `src/core/state.js` or `src/entities/player.js`.

## Decisions

### 1. Dock Layout & Under-Rail Architecture
- **Decision**: Render a centered, low-profile flex container (`#bottomDock`) pinned to `bottom: max(16px, env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%);`.
- **Structure**:
  ```
  +--------------------------------------------------------------+
  |  [==== Integrity ====]     (( O ))     [===== Energy =====]  |
  \______________________________________________________________/
                 (1px cyan neon dock-rail underglow)
  ```
- **Rationale**: An under-rail hybrid gives the eye a single cohesive visual anchor (reducing peripheral scan latency) while eliminating opaque top/side container walls so dissolving arena floor tiles remain visible through the gaps.
- **Alternatives considered**:
  - *Unified opaque pill*: Better edge bounding, but creates a dark visual blind spot over arena floor hazards.
  - *Pure frameless floating elements*: Maximum floor visibility, but can feel disjointed and harder to scan during rapid turns.

### 2. Identity Disc Emblem Design
- **Decision**: Create `#discEmblem` as a lightweight CSS ring (`width: 22px; height: 22px; border-radius: 50%`) with three state classes:
  - `.ready`: Neon cyan border (`border: 2px solid var(--cyan)`), intense box-shadow glow, white core pip.
  - `.in-flight`: Dimmed opacity (`0.28`), dashed or thin border, zero box-shadow.
  - `.catch-pulse`: Brief keyframe animation (`@keyframes discCatchPulse`) scaling and flashing cyan/white upon catch.
- **Rationale**: A circular icon intuitively represents a throwing disc far better than a linear bar, while freeing horizontal width for the health and energy meters.

### 3. DOM Compatibility & Dirty-Checking in `hud.js`
- **Decision**: Keep element IDs `#hpbar` and `#energybar` within the new `#bottomDock`. Provide `#discEmblem` with backward-compatible fallback for any legacy query selector looking for `#discbar`.
- **Rationale**: `getCachedFill('hpbar', 'hpbFill')` and `getCachedFill('energybar', 'ebFill')` continue working seamlessly without refactoring state synchronization. Disc state handling transitions from bar percentage width to state class toggling on `#discEmblem`.

### 4. Hint & Overlay Stacking Order
- **Decision**:
  - Desktop `#hint`: adjust `bottom` from `22px` to `64px`.
  - Mobile `#mobileHint`: adjust `bottom` from `max(14px, ...)` to `max(58px, env(safe-area-inset-bottom) + 44px)`.
- **Rationale**: Match hints fade out after a few seconds of active combat; placing them directly above the dock ensures they remain visible during warm-up without colliding with the vitals dock.

## Risks / Trade-offs

- **[Risk] Arena Floor & Tile Collapse Occlusion**
  - *Mitigation*: Restrict dock height to 28-32px, use transparent backgrounds (`rgba(0, 16, 24, 0.45)` with `backdrop-filter: blur(3px)`), and maintain transparent gaps between bars and the central disc emblem.
- **[Risk] Mobile Touch Thumbzone Interference**
  - *Mitigation*: The dock max-width is constrained to ~280px-320px on mobile, neatly sitting in the dead-zone between the virtual joystick (left 45%) and action cluster (pinned right).
- **[Risk] Existing Tests Expecting `#tl`**
  - *Mitigation*: If test suites (like `test/gameplay/mobile_controls.test.js`) query `#tl`, maintain a lightweight invisible wrapper or update test assertions to target the new bottom dock and verify touch safety.
