# Tasks

## 1. Solo AI Duel Rematch & Restart Lifecycle

- [x] 1.1 Add `options = {}` (`{ preserveTier = false }`) support to `resetGame()` in `src/entities/Player.js` so `preserveTier: true` keeps `state.tier`, `state.duelTier`, and `state.score` while resetting tiles, discs, foes, player state, and countdown (`spawnDuelBoss(state.tier)`), whereas default `resetGame()` resets to Tier 1 and score `0`; verify via headless debug hooks (`window.__tronResetGame({ preserveTier: true })` vs default).
- [x] 1.2 Update `showGameOver()` in `src/ui/modals.js` for `duel` / `duel_ai` to render `#rematchTierBtn` (`REMATCH TIER <N>`) above `#recompileBtn` (`RESTART TIER 1`) and `#returnMenuBtn` (`MODE SELECT`), and extend `test/gameplay/unified_flow.test.js` to verify Tier 2 defeat -> `#rematchTierBtn` respawns Tier 2 (`350 HP`) and `#recompileBtn` restarts Tier 1 (`250 HP`).

## 2. Reversible Rematch Voting & Stalled Consensus Protection

- [x] 2.1 Add `rematchVoteTimeoutId`, `rematchTimedOut`, `rematchTimeoutMs` (default `45000`), `rematchGraceMs` (default `8000`), and `multiplayerMapId` to `src/core/state.js`, and reset per-session flags and timers inside `resetMultiplayerSessionTracking()` in `src/network/roomManager.js`; verify initial defaults and reset cleanup in unit/browser checks.
- [x] 2.2 Convert `#voteRematchBtn` into a reversible toggle (`VOTE REMATCH` <-> `CANCEL VOTE (VOTED)`, `aria-pressed`) across `renderGameOverActions()`, `updateRematchUI()`, `bindGameOverActions()`, and `evaluateHostRematchConsensus()` in `src/network/roomManager.js`, keeping it disabled only on `peerDeparted`, `status === 'closed'`, `rematchTimedOut`, or consensus lock (`_launchingRematchRoundId`); update `test/gameplay/rematch.test.js` Step 2 assertions for the toggle button and add a `1 / 2` -> `0 / 2` un-vote + re-vote test case.
- [x] 2.3 Register a `pagehide` / `beforeunload` best-effort `PEER_LEFT` dispatcher and add `syncRematchTimeout()` in `src/network/roomManager.js` to transition stalled votes into `REMATCH TIMED OUT` cleanly while preserving `RETURN TO MENU`; add an automated stalled-host rematch timeout test in `test/gameplay/rematch.test.js` using a short `state.rematchTimeoutMs` override.

## 3. Hosted Multiplayer Room Arena Synchronization

- [x] 3.1 Enhance `teardownSectorArena()` in `src/entities/Arena.js` to restore default `wallMat`, `glowMat`, `tileMatIntact`, `tileEdgeMatIntact`, and `tile.warningColor` baseline values from `src/graphics/materials.js`, and invoke `teardownSectorArena()` from `startSoloSwarm()` (`src/ui/menus.js`), `startMatchmakingWithWarmup()`, and `teardownMultiplayer()` (`src/network/roomManager.js`); verify Swarm and Quick Match clear any previewed sector colors and hazards.
- [x] 3.2 Propagate the selected arena from `#host1v1Btn` and `#host2v2Btn` (`src/ui/menus.js`) through `onClickCreateRoom()`, room document `mapId`/`gridId`, `REMATCH_START` / `resetPatch`, `onRoomSnapshot()`, and `startMultiplayerDuel()` (`src/network/roomManager.js`) so both host and guest (even if locally unowned) apply the host's chosen arena after tile reset across initial start and rematches while direct legacy `createRoom()` calls without `#hostModal` retain baseline geometry; verify two-client sector hazard sync, rematch persistence, and exit teardown in `test/gameplay/rematch.test.js` and confirm `test/gameplay/multiplayer.test.js` remains green.

## 4. Full Verification

- [x] 4.1 Run `openspec validate align-solo-duel-and-rematch-polish --strict` alongside `node test/runner.js` and confirm zero spec errors and full pass status across gameplay, UI, and network test suites.
