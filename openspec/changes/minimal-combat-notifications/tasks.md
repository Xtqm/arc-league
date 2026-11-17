# Tasks: Minimal Combat Notifications

## 1. Clean Up Locomotion and Routine Combat Notifications

- [x] 1.1 Remove routine locomotion `message()` calls (`AIR JUMP`, `RECOVERY JUMP`, `RECOVERY DASH`) from `src/entities/Player.js` and verify double jumps and recovery maneuvers produce zero text in `#msg`.
- [x] 1.2 Suppress routine combat popups (`DEFLECTED!`, `GUARD CRUSH`, `SHIELD HIT`, `REAR STRIKE x2`, `RIVAL CAUGHT DISC!`) from `#msg` in `src/entities/Disc.js` and `src/entities/Bot.js` while preserving spark VFX and audio.

## 2. Responsive Announcement Styling and Sightline Elevation

- [x] 2.1 Update `#msg` CSS in `index.html` to `top: 15%`, fluid font sizing `clamp(16px, 3vw, 24px)`, and responsive letter spacing `clamp(4px, 0.8vw, 8px)` to clear crosshairs on desktop and avoid mobile overflow.
- [x] 2.2 Cap announcement display duration (`state.msgT`) to 1.5s maximum in `src/ui/hud.js` and confirm major announcements (`ROUND X — FIGHT!`, `CYCLE X`, `WAVE X INCOMING`, `TIER X REACHED`, and lobby alerts) render cleanly.

## 3. Surface Collapse Peripheral Hazard Indication

- [x] 3.1 Add `#hazardVignette` (fixed amber inset screen border pulse) and `#hazardAlert` (dock-adjacent amber warning indicator) markup and styles in `index.html`.
- [x] 3.2 Connect recovery zone state (`y < 0 && y > -3.5`) in `src/entities/Player.js` and `src/ui/hud.js` to trigger the amber vignette, dock-adjacent alert, and procedural hazard warning chime, clearing immediately when grounded.

## 4. Test Suite Modernization and End-to-End Verification

- [x] 4.1 Refactor deflection and combat assertions in `test/gameplay/physics_and_combat.test.js` to verify physical disc reflection (`d.isDeflected`) and shield cooldown directly instead of asserting DOM text on `dbg.lastMessage()`.
- [x] 4.2 Run the complete gameplay test suite to confirm zero regressions and verify clean HUD behavior in both desktop and mobile simulation.

## Workflow follow-up

- Commit all change artifacts and implementation code to `change/minimal-combat-notifications`.
- Archive the change upon verification.
- Merge to `main` only after explicit user confirmation.
