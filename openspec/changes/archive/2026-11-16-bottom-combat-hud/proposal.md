# Proposal: Bottom-Center Combat HUD Under-Rail Dock

## Why

During intense combat, glancing to the top-left corner to monitor Program Integrity, dash Energy, and Identity Disc availability forces the player's eyes away from the central arena, crosshair, and incoming enemy discs. Moving player vital meters to an ultra-minimal bottom-center dock brings crucial telemetry directly into peripheral vision on both desktop and mobile viewports, while an under-rail hybrid layout preserves maximum arena floor and hazard visibility.

## What Changes

- Relocate local player health (`Program Integrity`) and dash stamina (`Energy`) meters from the top-left `#tl` panel to a bottom-center dock (`#bottomDock`).
- Replace the horizontal Identity Disc progress bar with a compact, glowing circular Identity Disc emblem located between the health and energy meters.
- Introduce an under-rail hybrid aesthetic: floating meters connected by a subtle, glowing 1px cyan neon datum line along the bottom, leaving the area above and between meters transparent so arena floor tiles and void hazards remain fully visible.
- Define distinct visual states for the Identity Disc icon:
  - **Ready/In-Hand**: High-contrast glowing cyan ring with neon aura.
  - **In-Flight/Thrown**: Dimmed, hollow ring with reduced opacity (approx. 30%).
  - **Recall/Catch**: Transient high-frequency pulse/flash upon disc retrieval.
- Reposition match start control hints (`#hint` on desktop and `#mobileHint` on touch devices) to sit cleanly above the bottom dock prior to their automatic fade-out.
- Adjust touch viewport layout so the bottom-center dock occupies the horizontal clear zone between the virtual movement joystick (left) and the action cluster (right).
- Retain top-right HUD (`#tr`), arena nameplates, and dirty-checked DOM caching architecture.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `combat-hud`: Modifies `Requirement: Compact Player Status and Control Sizing` to specify bottom-center dock placement with an under-rail hybrid layout, glowing Identity Disc emblem, and updated hint vertical offset.

## Impact

- **UI / Styles**: `index.html` structure (relocating `#tl` player meters to `#bottomDock`, adding disc emblem markup, updated CSS rules for `.bottom-dock`, `.dock-rail`, `.disc-icon`, and repositioned `#hint`/`#mobileHint`).
- **Telemetry Controller**: `src/ui/hud.js` (caching `#hpbar`, `#energybar`, and `#discEmblem` in the new dock, updating disc visual state classes instead of bar width).
- **Tests**: `test/gameplay/mobile_controls.test.js` and other gameplay tests verifying HUD element presence, responsiveness, and touch compatibility.
