# Proposal

## Why

Following the recent 2-tier Escape and fullscreen retention update, players who lose a match (e.g. falling into the void or running out of integrity in Swarm/Duel modes) encounter two severe input traps:
1. The mouse pointer remains trapped and locked to the 3D canvas behind the "DE-ALLOCATED" Game Over card, because pointer lock is never released on elimination.
2. The Escape key is completely ignored because Escape routing in `keyboard.js` is gated behind `if (state.running)`, which becomes `false` upon elimination. Because the Keyboard Lock API (`navigator.keyboard.lock(['Escape'])`) is active in fullscreen, Chrome routes Escape to the game client, which drops it. As a result, neither pointer release nor fullscreen exit occurs on a single tap of Escape—leaving players trapped until Chrome's unbypassable 1.5-second hold-Escape failsafe triggers.

## What Changes

- **Automatic Pointer Lock Release on Match Elimination**: Ensure pointer lock is explicitly exited (`document.exitPointerLock()`) and the system cursor is restored (`setCursor()`) immediately when the player is eliminated (`hp <= 0` or void fall) across all game modes (Swarm, Duel, Campaign, and Multiplayer), as well as when displaying `showGameOver()`.
- **Decoupled Escape Routing for Menus and Game Over**: Remove the `if (state.running)` gate from the Escape key handler in `src/input/keyboard.js`. When pointer lock is already unlocked (such as in Game Over, modal views, or paused matches) and the game is in Fullscreen, pressing Escape once immediately calls `exitFullScreen()`.
- **Universal Modal Dismissal on Escape**: Ensure all modal overlays (including `achievementsModal` and `trialDebriefModal`) intercept Escape to close before triggering root fullscreen exit.

## Capabilities

### Modified Capabilities

- `player-character`: Mandate that upon lethal damage elimination or void fall across all game modes, the system immediately releases pointer lock and restores the visible cursor so the player can interact with the Game Over interface.
- `desktop-shell`: Specify that 2-tier Escape key handling functions consistently across all lifecycle states (active combat, paused state, and game over screens), ensuring a single tap of Escape exits fullscreen whenever pointer lock is not active.

## Impact

- `src/entities/Player.js`: Explicitly invoke `document.exitPointerLock()` and `setCursor()` when `hp <= 0` and void-fall de-allocation occurs.
- `src/ui/modals.js`: In `showGameOver()`, ensure pointer lock is terminated and cursor restored.
- `src/input/keyboard.js`: Update Escape key routing in `onDown` to evaluate pointer lock and fullscreen state independently of `state.running`, and support closing modals like `achievementsModal`.
