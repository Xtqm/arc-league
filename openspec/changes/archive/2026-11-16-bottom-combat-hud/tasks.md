# Tasks

## 1. Markup & DOM Structure

- [x] 1.1 Relocate player status elements in `index.html` from `#tl` into a new `#bottomDock` container containing `#hpbar`, `#discEmblem`, and `#energybar`, and verify elements are present in the DOM.
- [x] 1.2 Include backward-compatible element IDs or query aliases so existing modules querying `#discbar` or `#tl` continue to resolve cleanly, and verify no reference errors occur on startup.

## 2. Styling & Layout

- [x] 2.1 Add CSS rules for `#bottomDock`, `.dock-rail`, and `.dock-meter` in `index.html`, establishing the 1px cyan under-rail datum line and translucent glass background, and verify visual alignment.
- [x] 2.2 Add CSS classes and keyframes for `#discEmblem` (`.ready`, `.in-flight`, `.catch-pulse`) with glowing neon shadows and animations, and verify icon states render as expected.
- [x] 2.3 Adjust vertical position of `#hint` and `#mobileHint` in `index.html` to sit above `#bottomDock`, and verify hints display without overlapping the dock.
- [x] 2.4 Add mobile/touch styling in `index.html` under `body.touch-device` to size `#bottomDock` appropriately between the virtual joystick and action cluster, and verify touch viewport proportions.

## 3. HUD Telemetry Controller

- [x] 3.1 Update `src/ui/hud.js` to cache `#discEmblem` and toggle its ready/in-flight/catch-pulse visual classes during `updateHUD()`, and verify dirty checking prevents redundant class assignments.
- [x] 3.2 Verify `src/ui/hud.js` smoothly updates `#hpbar` and `#energybar` within `#bottomDock` without layout thrashing or unneeded DOM mutations.

## 4. Verification & Testing

- [x] 4.1 Update test assertions in `test/gameplay/mobile_controls.test.js` or related UI test files to reference `#bottomDock` and verify touch layout safety passes.
- [x] 4.2 Run existing automated test suites to ensure zero regressions in combat flow, pause/fullscreen buttons, or multiplayer status readouts.
