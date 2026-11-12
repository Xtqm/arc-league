# Tasks

## 1. Terminal System Config & Main Menu Parity

- [x] 1.1 Remove `#settingsBtn` from the static Main Menu in `index.html` and unify the static menu copy (`Arcfield`, `kinetic disc`, `suspend simulation`) with `getMainMenuHtml()`, then remove the obsolete `#settingsBtn` binding in `src/ui/menus.js`; verify neither `index.html` nor `showModeSelectMenu()` renders `#settingsBtn` or logs missing-button warnings on cold boot or menu return.
- [x] 1.2 Add the `[ SYSTEM CONFIG ]` hub tab (`#tabHubConfig`) and `#hubConfigView` container to `#authModal` in `index.html`, adjust `.auth-terminal-card` / `.terminal-hub-nav` sizing so all four tabs render cleanly without clipping, and suppress `.auth-terminal-card #closeSettingsX` and `.auth-terminal-card #closeSettingsBtn` via CSS; verify visually and via DOM assertions that all four Terminal tabs fit cleanly.
- [x] 1.3 Add `_customContainer` and `_inHub` dual-mount support to `SettingsModal` (`src/ui/modals/SettingsModal.js`), reset standalone flags in `#pauseSettingsBtn` (`src/ui/modals.js`), and wire `setTerminalHubTab('config')` and `hideAuthTerminal()` cleanup in `src/ui/authTerminal.js`; verify `node test/auth/auth_header.test.js` and `node test/auth/auth_terminal_integration.test.js` (extended to cover `#tabHubConfig` switching, settings control mutation, and Pause Menu standalone settings).

## 2. Online 1v1 & 2v2 Callsign Synchronization

- [x] 2.1 Add `state.multiplayerNames` in `src/core/state.js` and implement `getLocalCallsign()` in `src/network/roomManager.js` resolving `authManager.currentUser.handle` / `authManager.saveState.handle` cleanly even when Firebase anonymous auth updates `state.currentUser`; verify guest and authenticated handles resolve accurately in both mock and Firebase-backed network init paths.
- [x] 2.2 Persist `playerNames` per role (`p1`–`p4`) on room creation and join in `src/network/roomManager.js`, hydrate `state.multiplayerNames` and `mp.name` in `onRoomSnapshot()` and `startMultiplayerDuel()`, and transmit/handle reliable WebRTC `PLAYER_INFO` packets (plus `playerNames` on `REMATCH_START`) across both `roomManager.js` and `src/network/matchmakingQueue.js`; verify via `node test/network/matchmaking_queue.test.js` and `node test/gameplay/rematch.test.js` (including Quick Match `db === null`).
- [x] 2.3 Update `showMultiplayerVictory()` and `showMultiplayerDefeat()` in `src/network/roomManager.js` to display participant callsigns for `1v1` and team rosters for `2v2` while preserving `#voteRematchBtn`, `#rematchVoteLabel`, and `#multiMenuBtn`; verify `node test/gameplay/multiplayer.test.js` and `node test/gameplay/rematch.test.js` pass with callsign assertions.

## 3. Minimal Combat HUD, Hint Auto-Hide & Arena Overhead Nameplates

- [x] 3.1 Compact `#tl` and `#tr` HUD styles in `index.html` (and add tighter `body.touch-device` sizing and compact `⛶` / `II` button formatting while keeping `>= 44x44px` tap targets), and update `updateHUD()` in `src/ui/hud.js` so online `1v1` / `2v2` hides `#roundLabel`, score readout, and `#subLabel` while preserving `#topControls` and `#bossBarWrap` rival HP bar; verify `node test/gameplay/fullscreen_mode.test.js` and `node test/gameplay/unified_flow.test.js` pass.
- [x] 3.2 Implement timed opening control-hint auto-hide (`state.hintTimer` reset in `src/entities/Player.js` / `src/network/roomManager.js` and updated in `src/core/main.js` & `src/ui/hud.js`) so `#hint` and `#mobileHint` start visible on match launch and fade/hide after ~4.5 seconds of active gameplay; verify `node test/gameplay/mobile_controls.test.js` passes and automated hint hide timing checks succeed.
- [x] 3.3 Add `#arenaNameplates` overlay container and projection updater in `src/ui/hud.js` (invoked from `src/core/main.js` and cleaned up on teardown) to render team-colored overhead nameplates above alive remote players strictly in `duel_multi` and `duos_multi` without rendering a nameplate over `state.player` or in AI modes; verify with `node test/gameplay/multiplayer.test.js` (including nameplate visibility, team styling, elimination hiding, and single-player omission).

## 4. End-to-End Verification

- [x] 4.1 Run the full test suite (`node test/runner.js all`) and `openspec validate terminal-config-names-and-minimal-hud` and confirm all test domains and spec validations pass cleanly.
