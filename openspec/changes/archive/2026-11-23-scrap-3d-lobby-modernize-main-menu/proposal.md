# Proposal

## Why

The experimental 3D playable lobby (first-person view with floating Energy Cores) introduced significant interface friction, high maintenance overhead, and a fragmented navigation experience. Players had to navigate in first-person and throw kinetic discs at floating 3D geometric meshes just to open menus, while the 2D fallback menu was constrained inside an oversized, scrolling center card dominated by 10 lines of static keybindings. 

Scrapping the playable 3D lobby in favor of a sleek, modern 2D Tactical Staging Rail directly aligns *Arc League* with contemporary cyber-athletic games (*Wipeout HD*, *Apex Legends*, *Rocket League*) and authentic *Tron* lore (the program's Staging Gate / Armory terminal). It provides an unobstructed view of the real-time 3D arena and Identity Disc, eliminates vertical scrolling, simplifies mode transitions, and removes over 650 lines of fragile lobby raycasting and physics code.

## What Changes

- **Decommission 3D Playable Lobby**: Remove `src/ui/lobbyCores.js`, 3D Energy Core meshes, raycasting selection, and transparent `#overlay.lobby-3d` pointer-event hacks. (**BREAKING**)
- **Implement Left-Aligned Tactical Rail**: Redesign the primary main menu in `src/ui/menus.js` and `index.html` as an asymmetric, high-contrast cyber-athletic HUD docked to the left 35% of the viewport.
- **Ambient 3D Staging Background**: Utilize the remaining 65% of the screen for an ambient, non-interactive 3D staging presentation (turntable Identity Disc showcase and/or cinematic camera drift across the glowing arena floor) without raycast locks or player movement inputs.
- **Dedicated Directives & Controls Modal**: Extract the static desktop and mobile keyboard/touch control list from the main menu body into a sleek, accessible `[?] DIRECTIVES & CONTROLS` modal dialog, eliminating vertical clutter and scrollbars.
- **Streamlined Mode Directives**: Position high-contrast primary game mode buttons (`LEAGUE CIRCUIT`, `ARCFIELD SURVIVAL`, `PRACTICE (SOLO AI)`, `QUICK MATCH`, `HOST/JOIN FRIENDLY`) directly above the fold with instantaneous click-to-play responsiveness.
- **Secondary Utility Dock**: Dock Outfitting (`Armory`), Trophy Matrix (`Achievements`), Settings (`System Config`), and Directives to a streamlined secondary toolbar at the base of the tactical rail.
- **Settings & Config Cleanup**: Deprecate obsolete `coreLaunchConfirmation` preference and related lobby-specific settings from `src/ui/modals/SettingsModal.js` and storage schemas.

## Capabilities

### New Capabilities
- `main-menu`: Defines the Left-Aligned Tactical Rail HUD layout, visual branding lockup, instantaneous game mode selection, dedicated Directives modal, and ambient 3D staging canvas presentation.

### Modified Capabilities
- `game-modes`: Deprecate and remove `Interactive Playable Arena Lobby` and `Energy Core Launch Confirmation` requirements; update `Decoupled Duel Entry Modalities` to anchor directly to tactical rail action buttons.
- `system-settings`: Deprecate the `coreLaunchConfirmation` preference and remove the 3D Holo-Deck Settings Core scenario from `In-Game Settings Modal Interface`.

## Impact

- **Codebase**:
  - Delete or archive `src/ui/lobbyCores.js`.
  - Refactor `src/ui/menus.js` (`getMainMenuHtml`, `activate3DLobbyView`, `deactivate3DLobbyView`, `showModeSelectMenu`).
  - Update `index.html` CSS styles for `#mainMenu`, introducing modern tactical rail classes and responsive mobile rules.
  - Update `src/ui/modals/SettingsModal.js` to remove Energy Core confirmation controls.
  - Update `src/core/main.js` and `src/input/keyboard.js` where lobby core checks occur.
- **Dependencies & Performance**: Zero new dependencies; reduces scene mesh count and eliminates per-frame raycasting overhead in the menu.
- **Tests**: Update `test/modes/decoupled_match_entry.test.js` and related menu/UI tests to match the new DOM elements and verify instant mode launches.
