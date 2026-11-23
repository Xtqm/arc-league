# Proposal

## Why

When players cancel a match or return to the main menu mid-game (e.g. pressing Escape and clicking Mode Select), the active match continues executing in the background: hostile bots remain active and moving, discs float or ricochet across the arena, and the combat HUD overlay (program integrity, energy meters, reticle, cycle/score/hostiles panel) remains visible behind the tactical rail. Furthermore, the main menu background currently features only a static turntable disc mesh rather than a dynamic presentation of the player's customized character. In addition, pressing Escape while playing in fullscreen forces an immediate exit from fullscreen in web browsers, disrupting the player's display state rather than cleanly releasing the cursor and pausing the game.

## What Changes

- **Match Teardown & HUD Isolation on Menu Return**: Returning to the main menu from any active or paused match (via Pause Menu "MODE SELECT", match cancellation, or game-over navigation) cleanly tears down active match state: removes and disposes all hostile bot entities (`state.foes`) and active combat discs (`state.discs`), clears spawn and countdown timers, restores arena tiles and hazard states, and completely hides all combat HUD overlays (`#tr`, `#bottomDock`, `#reticle`, `#lockPrompt`, `#keymon`).
- **3D Character Staging Diorama**: Replaces the static turntable disc in `ambientLobby.js` with an autonomous 3D staging diorama featuring the player's actual humanoid Athlete Rig (`makeProgram` / `CosmeticMaterialEngine`), positioned in the unobstructed right 65% of the viewport.
  - Renders with the player's equipped loadout (Chassis Skin, Disc Skin, emissive accent colors).
  - Autonomous animation state loop:
    1. Athletic idle stance: breathing micro-hover, glowing core pulse, floating faceted shards, and spinning Identity Disc hovering above the upturned right palm.
    2. Periodic jump showcase: leaping into the air with aerodynamic hover-leg tuck, followed by smooth landing knee flexion into idle.
    3. Periodic telekinetic throw & boomerang return: coiled wind-up, open-palm thrust, launching the disc in an illuminated boomerang arc across the arena floor, and catching it with a magnetic recoil cushion back onto the palm.
  - Zero player input capture: mouse aim, clicking to throw, and WASD locomotion remain strictly disabled.
- **2-Tier Escape & Fullscreen Retention**:
  - Leverages the Keyboard Lock API (`navigator.keyboard.lock(['Escape'])`) when entering Fullscreen to prevent browsers from automatically breaking fullscreen mode on the initial Escape press.
  - First Escape press (while pointer is locked / match running): releases pointer lock and triggers the Pause Menu while preserving Fullscreen.
  - Second Escape press (while cursor is already released / in Pause Menu or Main Menu): exits Fullscreen mode cleanly.

## Capabilities

### Modified Capabilities

- `main-menu`: Upgrades the ambient 3D staging presentation from a static turntable disc into an autonomous 3D Athlete Character Diorama with equipped cosmetics, idle animations, periodic jumps, and throw/catch cycles; mandates complete match entity and combat HUD teardown upon returning to the main menu.
- `desktop-shell`: Specifies 2-Tier Escape handling across desktop and browser environments, ensuring the first Escape press releases pointer lock and pauses gameplay without leaving Fullscreen, while a second Escape press exits Fullscreen.

## Impact

- `src/graphics/ambientLobby.js`: Refactored to spawn, update, and manage the 3D Athlete Character Diorama and its autonomous diorama state machine (idle, jump, throw-and-catch), applying equipped armory skins and managing diorama disc physics.
- `src/ui/menus.js`: `showModeSelect` and `showModeSelectMenu` invoke match teardown logic, resetting combat state, clearing foes and discs, hiding combat HUD elements, and initializing the diorama.
- `src/ui/modals.js`: Fullscreen management invokes `navigator.keyboard.lock(['Escape'])` on entry and `navigator.keyboard.unlock()` on exit; updates Escape handling and button bindings.
- `src/input/keyboard.js`: Updated Escape routing to support the 2-tier state machine (pointer lock release vs fullscreen exit) without accidental double-triggers.
- `src/ui/hud.js`: Provides clear helper to hide all combat HUD elements when returning to lobby mode.
