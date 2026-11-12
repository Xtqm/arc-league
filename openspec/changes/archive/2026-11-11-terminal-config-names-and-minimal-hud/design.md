# Design: Terminal System Config, Online Player Names, and Minimal Combat HUD

## Context

See `proposal.md` for motivation and scope. Key codebase constraints discovered during exploration:
- `index.html` holds an initial static `#overlay` main menu containing `#settingsBtn` and older copy, while `showModeSelectMenu()` in `src/ui/menus.js` overwrites `#overlay.innerHTML` with `getMainMenuHtml()` (which omits `#settingsBtn` and has newer copy).
- `src/ui/authTerminal.js` already integrates `ArmoryModal` (`#tabHubLoadout`) and `AchievementsModal` (`#tabHubDirectives`) via `_customContainer` and `_inHub`, hiding inner close buttons with CSS under `.auth-terminal-card`.
- `src/network/firebaseSetup.js` overwrites `state.currentUser = state.auth.currentUser` during Firebase anonymous auth, stripping the user's `authManager.currentUser.handle`.
- Quick Match (`src/network/matchmakingQueue.js`) runs over WebRTC DataChannels with `state.db === null`, so callsigns for Quick Match cannot rely on room documents.
- Existing tests (`test/gameplay/mobile_controls.test.js`, `test/gameplay/fullscreen_mode.test.js`, `test/gameplay/unified_flow.test.js`, `test/gameplay/rematch.test.js`) check specific DOM invariants: `mobileHint` visible immediately after `startMode()`, `#fullscreenBtn`/`#pauseBtn` >= 44x44px tap targets, `#roundLabel` showing `TIER: N` in Solo AI Duel, and `#voteRematchBtn` / `#rematchVoteLabel` / `VICTORY` / `DEREZZED` in multiplayer post-match overlays.

## Goals / Non-Goals

**Goals:**
- Provide one consistent Main Menu across cold boot and menu returns with settings moved cleanly to `[ TERMINAL ] -> SYSTEM CONFIG`.
- Preserve standalone `SettingsModal` invocation from the in-game Pause Menu (`#pauseSettingsBtn`).
- Exchange and display authoritative player callsigns (`authManager.currentUser.handle`) in both Hosted (`1v1`, `2v2`) and Quick Match (`1v1`) online duels—strictly in the arena (remote players only) and on post-match screens.
- Reduce HUD visual footprint across desktop and mobile while keeping existing single-player and accessibility test contracts intact.

**Non-Goals:**
- Mobile camera feel/inertia changes (deferred to Change B).
- Multi-round Best-of-N match series in `1v1` / `2v2` (deferred to Change C).
- Displaying callsigns in offline/AI modes (`duel_ai`, `swarm`, `campaign`, or Quick Match warm-up sparring).

## Decisions

### 1. Dual-Mount `SettingsModal` inside Terminal Hub (`#tabHubConfig`)
- **Decision**: Add `#tabHubConfig` (`SYSTEM CONFIG`) and `#hubConfigView` to `#authModal` in `index.html` and `src/ui/authTerminal.js`. Extend `SettingsModal` (`src/ui/modals/SettingsModal.js`) with `this._customContainer` and `this._inHub` flags mirroring `ArmoryModal` and `AchievementsModal`.
- **Details**:
  - In `SettingsModal.container`, return `this._customContainer` when set; in `hide()`, skip pointer/menu side-effects when `this._inHub` is true; in `index.html`, suppress `#closeSettingsX` and `#closeSettingsBtn` inside `.auth-terminal-card`.
  - When `pauseSettingsBtn` (`src/ui/modals.js`) opens settings mid-match, explicitly reset `settingsModal._customContainer = null; settingsModal._inHub = false;` before `settingsModal.show()` so it always opens as the standalone modal.
  - Increase default `.auth-terminal-card` `max-width` slightly (e.g. `560px`) or allow `.terminal-hub-nav` clean spacing/wrapping so four tabs (`IDENT MATRIX`, `OUTFITTING`, `TROPHY MATRIX`, `SYSTEM CONFIG`) sit on one clean row without clipping.
  - Remove `#settingsBtn` from static `index.html` and `bindMainMenuEvents()`, and align `index.html` static menu wording (`Arcfield`, `kinetic disc`, `suspend simulation`) with `getMainMenuHtml()`.
- **Alternatives Considered**: Opening `SettingsModal` as a second modal on top of `#authModal`. Rejected because nested modals feel disjointed compared to `OUTFITTING` and `TROPHY MATRIX` already living seamlessly inside `#terminalHubNav`.

### 2. Authoritative Callsign Resolution & Dual Transport (`Room Doc + WebRTC PLAYER_INFO`)
- **Decision**: Introduce a single helper `getLocalCallsign()` in `roomManager.js` reading `authManager.currentUser?.handle || authManager.saveState?.handle || state.currentUser?.handle || 'PROGRAM'`. Maintain `state.multiplayerNames = { p1: null, p2: null, p3: null, p4: null }` (cleared on teardown).
- **Transport**:
  - **Hosted Rooms (`1v1`, `2v2`)**: Write `playerNames` in `onClickCreateRoom()` and `playerNames.<assignedRole>` in `onClickConfirmJoin()`. Hydrate `state.multiplayerNames` in `onRoomSnapshot()` and `startMultiplayerDuel()`.
  - **WebRTC (`1v1` Hosted & Quick Match)**: When `WebRTCPeer` reaches `'connected'` (both in `initWebRTCPeerSession()` and `MatchmakingQueue._handleConnectionSuccess()`), send `{ type: 'PLAYER_INFO', role: state.playerRole, name: getLocalCallsign() }` over `sendReliable`, and also attach `playerNames` to `REMATCH_START`. When `PLAYER_INFO` arrives, update `state.multiplayerNames[msg.role]` and `state.multiPlayers[msg.role].name`.
- **Alternatives Considered**: Encoding callsigns into `SignalingBridge.peerId` or room UIDs. Rejected because `peerId` controls deterministic lexicographical host election in `MatchmakingQueue` and handles can change or contain characters unsuitable for peer IDs.

### 3. Projected DOM Arena Nameplates (Remote Players Only)
- **Decision**: Render world-space overhead nameplates via a pooled DOM overlay layer (`#arenaNameplates`) inside `#hud` rather than Three.js `Sprite` + `CanvasTexture` meshes.
- **Rationale**:
  - `CinematicComposer` applies HDR `UnrealBloomPass` across the WebGL scene, which blurs bright 3D text sprites. Projected DOM labels stay crisp on high-DPI mobile and desktop displays without GPU texture churn.
  - Each frame in `updateRemotePlayers()` / `updateHUD()` (only when `state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi'` and `state.running`), project `(opp.pos.x, opp.y + 2.45, opp.pos.z)` into NDC via `camera`. Hide the nameplate whenever `!opp.alive`, `!opp.obj.visible`, behind the camera (`ndc.z > 1`), or off-screen.
  - Local `state.player` never gets a nameplate element, guaranteeing the local player's own name never appears in the arena or blocks third-person aim.
  - Teammate nameplates (`opp.team === myTeam`) use cyan styling; opponent nameplates use purple styling.

### 4. Post-Match Callsign Summary
- **Decision**: Update `showMultiplayerVictory()` and `showMultiplayerDefeat()` in `src/network/roomManager.js` to display the matchup callsigns derived from `state.multiplayerNames` (using fallback role labels like `P1`/`P2` only if a remote callsign has not yet arrived):
  - `1v1`: `<LOCAL_OR_TEAM1_NAME> VS <OPPONENT_NAME>` (showing clearly who won/lost alongside `ROOM` if not Quick Match).
  - `2v2`: `TEAM CYAN (<p1>, <p3>) VS TEAM PURPLE (<p2>, <p4>)`.
  - Keep existing `<h1>` (`VICTORY` / `DEREZZED`), `#voteRematchBtn`, `#rematchVoteLabel`, and `#multiMenuBtn` selectors unchanged for test compatibility.

### 5. Minimal Combat HUD & Hint Auto-Hide
- **Decision**:
  - **Compact `#tl` & `#tr` CSS**: Reduce panel padding, font size, bar height (`6–7px`), and widths globally, with extra compaction under `body.touch-device` (e.g., `min-width: 140px` for `#tl`). Keep `#fullscreenBtn` / `#pauseBtn` at `min-width: 44px; min-height: 44px;` with short icon labels on touch devices (`⛶`, `II`) so they fit comfortably without shrinking below accessible tap target requirements.
  - **Online `#tr` Trim**: In `updateHUD()` when `state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi'`, hide `#roundLabel`, the `#score` row, and `#subLabel` (`RIVALS HP`), keeping `#topControls` and `#bossBarWrap` (labeled `RIVAL` / `RIVALS`, dynamically scaled to living opponents' HP %). Restore those elements in `swarm`, `duel_ai`, and `campaign`.
  - **Hint Auto-Hide**: Track `state.hintTimer` (initialized to `4.5` seconds on `resetRound` / `startMultiplayerDuel`). Once `state.countdownTimer <= 0`, decrement `state.hintTimer` in `update(dt)`; keep `#hint` / `#mobileHint` visible initially (satisfying `mobile_controls.test.js`), fade opacity to `0` near the end of the timer, and set `display: none` when `<= 0`. Reset inline styles when returning to menu or starting a new round.

## Risks / Trade-offs

- **[Risk] Quick Match `PLAYER_INFO` arrives slightly before or after `startMultiplayerDuel()`**: If `PLAYER_INFO` is sent right when WebRTC connects, `state.multiPlayers` might be cleared/rebuilt during `startMultiplayerDuel()`.
  → *Mitigation*: Store received names in `state.multiplayerNames[role]` first, and have `startMultiplayerDuel()` initialize each `mp.name` from `state.multiplayerNames[r]` (and re-send `PLAYER_INFO` if WebRTC is already connected).
- **[Risk] 4 tabs in `#terminalHubNav` wrapping awkwardly on narrow viewports**: Adding `SYSTEM CONFIG` to the existing 3 tabs could overflow a `480px` terminal card.
  → *Mitigation*: Widen default `.auth-terminal-card` to `560px`, tighten tab letter-spacing slightly, and allow `flex-wrap: wrap` under `@media (max-width: 600px)`.
- **[Risk] Headless/unit test environments without real WebGL camera projection**: `updateRemoteNameplates()` runs `Vector3.project(camera)` in `update(dt)`.
  → *Mitigation*: Guard `camera` matrix/projection calls cleanly and ensure `arenaNameplates` cleanly degrades/skips if `document` or `innerWidth` is unavailable.
