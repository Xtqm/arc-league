# Proposal: Terminal System Config, Online Player Names, and Minimal Combat HUD

## Why

Two UX issues affect navigation and clarity in Arc League:
1. Returning to the Main Menu via `showModeSelectMenu()` overwrites the static `index.html` menu with `getMainMenuHtml()`, dropping the `SYSTEM CONFIG` button after the first match or modal transition (and exposing copy drift between the two menu templates).
2. Online `1v1` and `2v2` matches neither exchange nor display participant callsigns, while the in-game HUD shows verbose labels, permanent bottom control hints, and unnecessary score/aggregate readouts that crowd smaller screens—especially mobile viewports.

Moving `SYSTEM CONFIG` into the unified `[ TERMINAL ]` Hub aligns settings with Outfitting and Trophy Matrix, while propagating callsigns and trimming the HUD keeps combat clean and readable.

## What Changes

- **Terminal `[ SYSTEM CONFIG ]` Hub Tab & Main Menu Parity**:
  - Remove `#settingsBtn` from the visible Main Menu (`index.html` and `src/ui/menus.js`), resolving the initial-load vs. re-rendered menu discrepancy and unifying menu copy (`Arcfield` / `kinetic disc`) across both sources.
  - Add a fourth tab `[ SYSTEM CONFIG ]` (`#tabHubConfig`) and view container (`#hubConfigView`) to the Grid Authorization Terminal (`#authModal`) in `index.html` and `src/ui/authTerminal.js`.
  - Extend `SettingsModal` (`src/ui/modals/SettingsModal.js`) with dual-mount support (`_customContainer` / `_inHub`) matching `ArmoryModal` and `AchievementsModal`, embedding settings cleanly in the Terminal Hub while keeping the standalone modal working from the in-game Pause Menu (`#pauseSettingsBtn`).
- **Online `1v1` & `2v2` Player Callsigns**:
  - Resolve the local player's authoritative callsign from `authManager.currentUser.handle` (preserving it even when Firebase anonymous auth populates `state.currentUser`), store `playerNames` per role (`p1`–`p4`) in hosted `1v1` / `2v2` rooms, and exchange `PLAYER_INFO` callsigns over WebRTC for both Quick Match (`MATCH_*`) and hosted sessions.
  - Render projected world-space overhead nameplates above **other** players in the arena (`duel_multi` and `duos_multi` strictly — never over the local player, and not in Solo AI / Swarm / Campaign), color-coded by team (cyan teammates, purple opponents).
  - Display participant callsigns on the online post-match Victory / Derezzed overlay (`showMultiplayerVictory` / `showMultiplayerDefeat`) alongside room/outcome details.
- **Minimal Combat HUD & Control Hint Auto-Hide**:
  - Compact the player status panel (`#tl`: own HP, Identity Disc, and Energy bars) and top-right controls across all modes, with tighter sizing on mobile (`body.touch-device`) while maintaining `>= 44px` tap targets on interactive buttons.
  - Auto-hide `#hint` (desktop) and `#mobileHint` (touch) a few seconds after active gameplay starts (after countdown ends or match begins), resetting on new matches.
  - In online `1v1` and `2v2` (`duel_multi` / `duos_multi`), trim `#tr` to show only the compact pause/fullscreen controls and a compact rival HP indicator (`#bossBarWrap`), omitting `ROOM`, `Score`, and `RIVALS HP` text clutter.

## Capabilities

### New Capabilities
- `combat-hud`: Compact HUD status sizing (desktop and mobile), timed auto-hide for opening control hints, minimal online duel/duos HUD layout, and world-space arena overhead nameplates for remote combatants.

### Modified Capabilities
- `system-settings`: Relocate main-menu settings entry from `#mainMenuButtons` into the Terminal Hub `[ SYSTEM CONFIG ]` tab while preserving standalone `SettingsModal` launch from the in-game pause menu.
- `user-identity`: Add `[ SYSTEM CONFIG ]` (`#tabHubConfig`) to the Terminal Hub navigation bar (`#terminalHubNav`) and unify static `index.html` menu markup with `getMainMenuHtml()`.
- `multiplayer-networking`: Persist and synchronize participant callsigns across hosted `1v1` and `2v2` rooms and display player names on arena nameplates and post-match screens.
- `online-matchmaking`: Exchange participant callsigns over the reliable WebRTC channel on Quick Match connection so matched peers see opponent names in the arena and post-match overlay without database writes.

## Impact

- **UI & Templates**: `index.html`, `src/ui/menus.js`, `src/ui/authTerminal.js`, `src/ui/modals/SettingsModal.js`, `src/ui/hud.js`, `src/ui/UIManager.js`.
- **Networking & Identity**: `src/network/roomManager.js`, `src/network/matchmakingQueue.js`, `src/network/sync.js`, `src/core/state.js`, `src/core/main.js`.
- **Tests**: Update/extend tests in `test/auth/auth_header.test.js`, `test/auth/auth_terminal_integration.test.js`, `test/gameplay/multiplayer.test.js`, `test/gameplay/rematch.test.js`, and `test/gameplay/mobile_controls.test.js` (plus new unit/browser checks for Settings dual-mount, hint auto-hide, and overhead nameplates).
