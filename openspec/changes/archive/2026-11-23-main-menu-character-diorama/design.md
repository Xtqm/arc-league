# Design

## Context

See `proposal.md` for motivation and background.

Currently, `ambientLobby.js` manages a single static turntable Identity Disc (`stagingDiscGroup`) centered at `(1.4, 1.45, -3.8)`. When a player exits an active match into the main menu via `showModeSelect()`, the game mode is set to `'lobby'`, but active bot entities (`state.foes`) and combat discs (`state.discs`) remain in their respective collections and update every frame in `main.js`. Additionally, the combat HUD containers (`#tr`, `#bottomDock`, `#reticle`, `#lockPrompt`) remain visible.

In fullscreen mode, web browsers default to treating `Escape` as a hard command to exit fullscreen. In standard desktop games, players expect the first `Escape` keypress to release pointer lock and pause the game, keeping fullscreen intact, while a subsequent `Escape` keypress exits fullscreen.

## Goals / Non-Goals

**Goals:**
- Provide a unified, leak-proof match teardown routine that removes all combat entities, discs, timers, and HUD overlays when returning to the main menu.
- Upgrade the main menu ambient scene into an autonomous 3D Athlete Character Diorama in the right 65% viewport quadrant with the player's equipped skins and procedural animations (idle, jump, throw-and-catch boomerang).
- Implement a 2-tier Escape handling flow where the first Escape releases cursor/pauses while preserving fullscreen, and the second Escape exits fullscreen.

**Non-Goals:**
- Allowing user locomotion or interactive combat controls while on the main menu.
- Altering match rules, bot combat brains, or in-game camera perspectives during live matches.
- Replacing the left-aligned tactical rail layout.

## Decisions

### 1. Unified Match Teardown Function (`teardownActiveMatch`)
- **Choice**: Create a centralized teardown function in `src/ui/menus.js` (or exported via `src/entities/Player.js` / `src/core/main.js`) invoked whenever transitioning to `'lobby'`.
- **Behavior**:
  - Iterate through `state.discs`, dispose their geometries/materials, remove meshes from `scene`, and clear `state.discs = []`.
  - Iterate through `state.foes`, remove `foe.obj` from `scene`, and clear `state.foes = []`.
  - Reset `state.spawnTimer = 0`, `state.countdownTimer = 0`, `state.timeScale = 1.0`, `state.slowMoActive = false`.
  - Call `rebuildArenaTiles()` to clear any fallen or hazard tiles back to pristine state.
  - Hide combat HUD DOM containers: `#tr`, `#bottomDock`, `#reticle`, `#lockPrompt`, `#keymon`.
- **Alternative considered**: Relying on lazy cleanup when a new match starts. *Rejected* because active bots and discs remain visible and audible behind the main menu.

### 2. Autonomous 3D Character Diorama Architecture
- **Choice**: Refactor `src/graphics/ambientLobby.js` to manage an autonomous diorama actor.
  - Instantiate the player's rig via `makeProgram(config.CYAN, { archetype: 'player' })`.
  - Apply active loadout skins using `cosmeticMaterialEngine.applyChassisSkin(rig, loadout.chassisSkin)` and `cosmeticMaterialEngine.applyDiscSkin(rig.userData.backDisc, loadout.discSkin)`.
  - Position the rig in the staging zone: `(1.4, 0, -3.8)` angled slightly towards camera (`yaw ~ -0.35 rad`).
  - Diorama autonomous finite-state machine:
    - **IDLE (~6s)**: Calls `animateHumanoidRig(rig, dt, time, 0, true, 0, true, false, false, 0, false, false, 0)`. Armor shards bob gently, core pulses, spinning disc hovers above open right palm.
    - **JUMP (~1.8s cycle every 10-14s)**: Simulates a vertical leap (`y` rises with upward velocity, aerodynamic hover-tuck posture), peaks, descends, and compresses smoothly into a grounded landing knee bend before returning to idle.
    - **THROW & CATCH (~3.5s cycle alternating with jumps)**:
      1. *Wind-Up (0.4s)*: Coils torso back, charges throw pose.
      2. *Release (0.3s)*: Open-palm thrust, hides palm disc and launches a dedicated diorama showcase disc out into the arena.
      3. *Boomerang Arc (1.8s)*: Diorama disc traces a smooth quadratic/cubic bezier flight loop across the glowing arena floor with ribbon trail.
      4. *Magnetic Catch (0.6s)*: Character reaches out with magnetic catch cushion recoil animation, diorama disc docks back onto the palm, and palm disc is restored.
- **Alternative considered**: Running the live `Player` entity on the menu. *Rejected* because `Player` is tightly coupled to user input, pointer lock, mouse delta steering, camera tracking, and match state. An isolated diorama actor prevents all input leakage and camera jitter.

### 3. 2-Tier Escape & Fullscreen Retention via Keyboard Lock API
- **Choice**:
  - When entering fullscreen in `requestFullScreen()` (`src/ui/modals.js`), call `navigator.keyboard?.lock?.(['Escape'])`.
  - When exiting fullscreen in `exitFullScreen()`, call `navigator.keyboard?.unlock?.()`.
  - In `src/input/keyboard.js`:
    - If `Escape` is pressed:
      - If in an active match with pointer lock locked: Call `document.exitPointerLock()` and `pauseGame()`. Fullscreen remains intact.
      - If already in a paused state, unlocked state, or main menu, and `isFullScreen()` is true: Call `exitFullScreen()`.
      - If in desktop shell (`isDesktop`), retain existing confirmation prompt if at root lobby and not in fullscreen.
- **Alternative considered**: Custom double-tap timer (e.g. 300ms window). *Rejected* because browser UX is much clearer when the first press cleanly unlocks/pauses, and any subsequent Escape press while already unlocked exits fullscreen.

## Risks / Trade-offs

- **[Risk]**: Browser does not support Keyboard Lock API (e.g., Firefox, Safari).
  - *Mitigation*: Graceful feature detection with `if (navigator.keyboard && typeof navigator.keyboard.lock === 'function')`. In unsupported browsers, browser default fullscreen exit occurs on Escape without throw/crash.
- **[Risk]**: Diorama animation frames consuming CPU/GPU when menu is hidden during matches.
  - *Mitigation*: Diorama update is strictly gated by `if (state.gameMode !== 'lobby') return;`, and `despawnStagingDisc()` / `despawnDiorama()` hides and pauses the diorama mesh when entering a match.
- **[Risk]**: Equipped cosmetics updated in Armory not reflecting immediately in the diorama.
  - *Mitigation*: Export a `refreshDioramaCosmetics()` function hooked into cosmetic equip events.
