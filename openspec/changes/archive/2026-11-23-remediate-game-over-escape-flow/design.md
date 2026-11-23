# Design

## Context

See `proposal.md` for motivation and background.

Currently, when the player runs out of health or falls into the void, `src/entities/Player.js` sets `state.running = false`. However:
1. Pointer lock is not exited in Swarm (Survival) or Duel AI modes, and `src/ui/modals.js` (`showGameOver()`) never calls `document.exitPointerLock()` or `setCursor()`. This leaves the mouse trapped and hidden on the 3D canvas behind the "DE-ALLOCATED" Game Over card.
2. In `src/input/keyboard.js`, the Escape key handler was wrapped inside `if (state.running)`. Because `state.running` is `false` upon elimination, Escape key events are completely dropped. With the Keyboard Lock API active, Chrome routes Escape to the game client, resulting in no pointer release and no fullscreen exit until the user holds Escape for 1.5 seconds.

## Goals / Non-Goals

**Goals:**
- Guarantee that whenever a match ends (player death, defeat, void fall, or victory) across all game modes, pointer lock is immediately terminated and the visible system cursor is restored.
- Decouple the Escape key routing from `state.running` so that whenever pointer lock is already unlocked (e.g. on Game Over screen, Pause Menu, or Lobby) and the display is in Fullscreen, pressing Escape once immediately exits Fullscreen.
- Ensure all modal views (`directivesModal`, `settingsModal`, `armoryModal`, `achievementsModal`, `trialDebriefModal`) intercept Escape to dismiss themselves before triggering root fullscreen exit.
- Prevent canvas click events from accidentally re-acquiring pointer lock while the Game Over screen or active modals are visible.

**Non-Goals:**
- Disabling the Keyboard Lock API during active gameplay (it remains necessary to enable 1st-press cursor release without browser fullscreen interruption).
- Altering the 2-tier Escape experience in active combat (1st press = release cursor & pause, 2nd press = exit fullscreen).

## Decisions

### 1. Unified Pointer Lock Exit on Elimination
- **Choice**:
  - In `src/entities/Player.js` (inside `if (state.player.hp <= 0)`): Call `if (document.pointerLockElement) { document.exitPointerLock(); }` and `setCursor()` immediately before triggering `showGameOver` or debrief modals.
  - In `src/ui/modals.js` (`showGameOver()`): Call `if (document.pointerLockElement) { document.exitPointerLock(); }` and `setCursor()` as a defensive safeguard.
- **Rationale**: Eliminates the trapped cursor bug regardless of which code path initiates the Game Over UI.

### 2. State-Independent Escape Routing Architecture
- **Choice**: Structure the Escape key handler in `src/input/keyboard.js` as a priority-driven state machine that does not depend on `state.running`:
  1. **Modal Interception**: If any sub-modal is open (`authModal`, `armoryModal`, `achievementsModal`, `settingsModal`, `directivesModal`, `hostModal`, `roomModal`, `trialDebriefModal`), dismiss that modal and consume Escape.
  2. **Active Combat / Pointer Locked (Tier 1)**: If pointer lock is engaged (`isLocked()` or `document.pointerLockElement`):
     - Exit pointer lock (`document.exitPointerLock()`).
     - If `state.running && !state.paused`: pause match (`triggerPauseGame()`).
     - Preserve Fullscreen mode.
  3. **Unlocked / Menu / Game Over (Tier 2)**: If pointer lock is NOT engaged (cursor is already free on Game Over screen, Pause Menu, or Lobby):
     - If in Fullscreen (`isFullScreen()`): call `exitFullScreen()` immediately on that single press.
     - If not in Fullscreen: contextual fallback (e.g. in Pause Menu without fullscreen -> resume match; in root lobby on Desktop -> prompt exit).
- **Rationale**: Ensures players never need to hold down Escape. A single tap of Escape while on a menu or game over screen instantly exits fullscreen.

### 3. Pointer Lock Click Re-Acquire Guard
- **Choice**: In `src/input/mouse.js`, extend the canvas click handler to verify that `!state.player.alive`, `overlayEl` visibility, and modal visibility block `tryLock()`.
- **Rationale**: Prevents accidental clicks on the backdrop from trapping the cursor again while the Game Over screen is active.

## Risks / Trade-offs

- **[Risk]**: Pressing Escape while viewing Game Over exits Fullscreen instead of restarting the match.
  - *Mitigation*: This matches expected desktop and web behavior—the on-screen Game Over buttons (`RE-COMPILE`, `MODE SELECT`) provide direct in-game navigation, while Escape handles window/display state.
