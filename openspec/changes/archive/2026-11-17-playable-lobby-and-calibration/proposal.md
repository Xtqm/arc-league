# Proposal: Playable 3D Lobby & Onboarding Calibration

## Why

Currently, new players loading Arc League are greeted by a static 2D modal with a 10-line text list of keyboard bindings, delaying engagement and risking immediate bounce. To capture players within their first 5 seconds, the game needs an immediate, visceral entry point: an immersive cyberpunk boot sequence, an in-media-res 3-beat calibration gauntlet, holographic disc materialization, and a dynamic 3D playable arena lobby that replaces static main menu cards.

## What Changes

- **Cyberpunk Boot Terminal (Cold Open)**: Replaces the initial static menu for first-time visitors with a fullscreen terminal prompt ("SUB-STRATA RIG DETECTED - CLICK TO SYNCHRONIZE") that satisfies browser pointer-lock and Web Audio autoplay requirements in a single seamless click.
- **Continuous 3-Beat Calibration Gauntlet**: A ~25-second continuous combat prologue teaching Strike (Beat 1), Slow-Mo Parry Deflection (Beat 2), and Curve/Ricochet Volley (Beat 3) without menu interruptions or loading screens. Includes an `[ESC / START]` bypass escape hatch for friend invites and speedrunners.
- **Calibration Progression Rewards**: Clearing the calibration automatically marks Grid 01: Star 1 as earned and deposits 100 Arc Bits into the player's account.
- **Holographic Disc Materialization**: Implements an energy condensation sequence during the universal 3-second match countdown (`3... 2... 1... ENGAGE`) across all game modes, synthesizing wireframe-to-solid neon assembly with rising Web Audio transients.
- **Playable 3D Arena Lobby (Dojo)**: Replaces the 2D `#mainMenu` overlay with an active 3D Arcfield lobby. Floating holographic Energy Cores (`CIRCUIT`, `SURVIVAL`, `DUELS`, `ARMORY`) activate game modes when struck by kinetic discs or clicked.
- **Core Launch Confirmation Modal**: Adds a holographic confirmation dialog when striking an Energy Core, toggleable in settings (default: ON) so veterans can launch instantly without confirmation.
- **Dual Perspective Toggle (1P / 3P)**: Introduces seamless switching between First-Person (visor view) and Third-Person (over-the-shoulder view) across all modes using Middle Mouse Button (`MMB`) on PC, Right Stick Click (`R3`) on Gamepad, and a dedicated HUD toggle on Mobile.
- **Sensitivity Relocation to Settings**: Removes mouse wheel sensitivity modification during gameplay to prevent accidental DPI changes, relocating look sensitivity strictly to the System Settings menu.
- **Adaptive Device HUD**: Contextual HUD prompts dynamically adapt between PC (KBM), Controller (Gamepad), and Touch (Mobile).

## Capabilities

### New Capabilities
- `onboarding-calibration`: Fullscreen browser-gesture boot terminal, continuous 3-beat combat calibration gauntlet, friend-invite bypass, and onboarding currency/star progression awards.

### Modified Capabilities
- `game-modes`: Replaces static 2D menu overlays with the persistent Playable 3D Arena Lobby featuring interactive holographic Energy Cores, disc target activation, and launch confirmation dialogs.
- `player-character`: Introduces dual-perspective camera switching (First-Person vs Third-Person) with smooth interpolation, and holographic disc materialization during pre-match countdowns.
- `system-settings`: Relocates look sensitivity configuration to System Settings and introduces settings for `coreLaunchConfirmation` (default: true) and `defaultCameraPerspective` (`third_person` vs `first_person`).
- `combat-hud`: Dynamic input device detection and prompt rendering across Desktop (KBM), Gamepad, and Mobile touch interfaces.

## Impact

- **Affected Systems**:
  - `src/core/main.js`: Boot initialization flow (`initApp`), match countdown routine, and input bindings.
  - `src/graphics/scene.js`: Camera update logic (`updateCamera`) for 1P/3P offset lerping and mesh visibility.
  - `src/ui/menus.js`: Replacement of `#overlay / #mainMenu` card with 3D lobby energy cores and confirmation modal.
  - `src/input/mouse.js`, `src/input/InputManager.js`: MMB binding for perspective toggle; removal of `wheel` event DPI modification.
  - `src/audio/sfx.js` / Web Audio: Disc condensation audio sweeps, boot sub-bass thump, and calibration audio cues.
  - `src/campaign/campaignEngine.js` & `src/storage/`: Sector 0 / Grid 01 Star 1 auto-clear and Bit crediting.
- **Dependencies**: No external npm packages required; built entirely on existing Three.js, WebGL, Web Audio, and local storage architecture.
- **Compatibility**: Preserves legacy DOM buttons (`#campaignBtn`, `#swarmBtn`, etc.) as hidden/accessible hooks for automated puppeteer test suites.
