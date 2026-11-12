# Design

## Context

See [proposal.md](./proposal.md) for motivation. Currently:
- `src/entities/Bot.js` (`spawnDuelBoss`, `killFoe`) already implements endless Solo AI Duel tiers starting at `250 HP` (`250 + tier * 50` thereafter) and matches `test/gameplay/unified_flow.test.js`, whereas `openspec/specs/game-modes/spec.md` still describes an obsolete `280 HP` single-round victory modal, and `src/ui/modals.js` (`showGameOver`) calls `resetGame()` which unconditionally resets `state.tier = 1`.
- `src/network/roomManager.js` handles `REMATCH_VOTE`, `REMATCH_START`, `PEER_LEFT`, and WebRTC `disconnected`/`closed`/`failed`, but locks `#voteRematchBtn` (`disabled = true`, `VOTED`) on click, lacks rematch timeout recovery for unresponsive Firestore hosts, and tears down `state.activeGridId` in `startMultiplayerDuel()` without reading or syncing `state.selectedArenaMap` / `#arenaSelect`.
- `src/entities/Arena.js` (`applySectorArena`) mutates shared environment materials (`wallMat`, `glowMat`, `tileMatIntact`, `tileEdgeMatIntact`), while `teardownSectorArena()` does not yet restore baseline material properties.

## Goals / Non-Goals

**Goals:**
- Keep Solo AI Duel endless progression and `unified_flow.test.js` green while adding non-destructive same-tier rematch (`REMATCH TIER N`) alongside full reset (`RESTART TIER 1`) on defeat.
- Make post-match rematch voting reversible (`VOTE REMATCH` <-> un-vote) and resilient against silent tab closes or stalled hosts.
- Propagate the host's selected sector arena from `#hostModal` to hosted `1v1` and `2v2` rooms and all rematches, while isolating Quick Match and non-sectored modes onto clean baseline Prime Stadium visuals.

**Non-Goals:**
- Re-introducing a post-match victory screen after Tier 1 AI Duel (explicitly rejected in favor of endless Practice progression).
- Changing Swarm mode wave progression or Solo Campaign trial flows.
- Supporting mid-match arena voting or asymmetric client arenas; Quick Match uses symmetric baseline arena geometry.

## Decisions

### 1. Non-Destructive Tier Rematch (`resetGame` + `showGameOver`)
- **Decision**: Add `options = {}` (`{ preserveTier = false }`) to `resetGame(options)` in `src/entities/Player.js`. When `preserveTier` is `true` during `duel` / `duel_ai`, retain `state.tier`, `state.duelTier`, and accumulated `state.score`; clear projectiles/foes, rebuild tiles, restore HP/energy/disc/spawn via `resetRound()`, and queue `spawnDuelBoss(state.tier)` on countdown completion. When omitted (`false`), retain full reset (`tier = 1`, `duelTier = 1`, `score = 0`).
- **UI**: In `showGameOver()` (`src/ui/modals.js`), when in `duel` / `duel_ai`, render `#rematchTierBtn` (`REMATCH TIER ${currentTier}`) invoking `window.__tronResetGame({ preserveTier: true })` above `#recompileBtn` (`RESTART TIER 1`) and `#returnMenuBtn` (`MODE SELECT`). Non-duel modes keep `#recompileBtn` (`RE-COMPILE (${state.gameMode.toUpperCase()})`).
- **Alternative Considered**: Adding a separate `window.__tronRematchDuelTier` global instead of parameterizing `resetGame()`. Parameterizing `resetGame({ preserveTier })` avoids duplicating entity/countdown reset logic while keeping Pause -> Restart (`restartMatch()`) untouched as a Tier 1 reset.

### 2. Reversible Rematch Vote Toggle (`#voteRematchBtn`)
- **Decision**: Convert `#voteRematchBtn` into a toggle in `renderGameOverActions()`, `updateRematchUI()`, and `bindGameOverActions()` (`src/network/roomManager.js`):
  - Before clicking (`!hasVoted`): text `'VOTE REMATCH'`, `disabled = false`, `aria-pressed="false"`.
  - After clicking (`hasVoted`): text `'CANCEL VOTE (VOTED)'`, **`disabled = false`**, `aria-pressed="true"`.
  - Disabled states: only when `state.peerDeparted || data?.status === 'closed'` (`'OPPONENT LEFT'`), `state.rematchTimedOut` (`'REMATCH TIMED OUT'`), or consensus launch is already locked (`state._launchingRematchRoundId`, `'STARTING REMATCH...'`).
  - Clicking toggles `nextVote = !currentVote`, broadcasts `REMATCH_VOTE` (`voted: nextVote`) over WebRTC or patches `rematchVotes.<role>: nextVote` in Firestore, and recalculates tally (`0 / 2` <-> `1 / 2`).
- **Test Compatibility Note**: `test/gameplay/rematch.test.js` (line 103) currently checks `guestState.voteBtnText !== 'VOTED' || !guestState.voteBtnDisabled`. We will update that assertion to validate active toggle state (`aria-pressed="true"`, `'CANCEL VOTE (VOTED)'`, `!voteBtnDisabled`) and add an explicit un-vote + re-vote round-trip test.
- **Alternative Considered**: Adding a second `#unvoteRematchBtn` beside a disabled `#voteRematchBtn`. Rejected because extra buttons clutter the compact game-over modal and complicate gamepad focus order (`gamepad.js`).

### 3. Tab-Unload Signal & Bounded Rematch Timeout
- **Decision**:
  - Register a single window `pagehide` / `beforeunload` listener wired through `roomManager.js` that dispatches `{ type: 'PEER_LEFT', roundId, role, reason: 'TAB_CLOSED' }` over an open WebRTC channel whenever a multiplayer session ends unexpectedly (ignored if `state.isTearingDownMultiplayer` is already `true`).
  - Add `state.rematchVoteTimeoutId`, `state.rematchTimedOut`, and configurable `state.rematchTimeoutMs` (default `45000`; `state.rematchGraceMs` default `8000` for unanimous room-fallback stall detection). Manage via a central `syncRematchTimeout(vCount, pCount, hasVoted)` helper: start waiting timer when `hasVoted` (or when non-host guest sees `vCount >= pCount` waiting on Firestore host reset), cancel cleanly if all votes return to unvoted/idle or on round start / peer departure / teardown, and on expiry set `state.rematchTimedOut = true` with `'REMATCH TIMED OUT'` UI prompting `RETURN TO MENU`.
- **Alternative Considered**: Guest failover promotion when `p1` disappears. Rejected for Firestore-only rooms because both `p1` and `p2` could race reset patches without a server lock; explicit timeout + `OPPONENT LEFT` keeps state transitions deterministic.

### 4. Hosted Multiplayer Arena Sync & Clean Material Teardown
- **Decision**:
  - In `src/ui/menus.js`, `#host1v1Btn` and `#host2v2Btn` resolve the chosen map ID from `#arenaSelect` / `state.selectedArenaMap || 'arena_grid_01'` and pass it to `onClickCreateRoom(e, mode, chosenMap)`. Direct programmatic callers (`window.__dbg.createRoom()` without `#hostModal`) preserve `mapId: state.selectedArenaMap || null` so baseline multiplayer tests without a map selection remain on default unobstructed Prime Stadium coordinates.
  - `onClickCreateRoom` stores `mapId` and `gridId` (when non-null) in the room doc (`state.multiplayerMapId = mapId`). `onClickConfirmJoin`, `onRoomSnapshot`, `evaluateHostRematchConsensus` (`REMATCH_START` + `resetPatch`), and `startMultiplayerDuel(role, code, mode, { roundId, mapId })` forward `mapId`.
  - In `startMultiplayerDuel`, tiles reset first (`TILE_INTACT`), then if `resolvedMapId` is non-null, `applySectorArena(getGridIdForMap(resolvedMapId))` is called directly so guests render host-selected arenas without mutating guest `inventory.unlockedMaps` storage or local `#hostModal` preference.
  - In `src/ui/menus.js` / `src/network/roomManager.js`, `startSoloSwarm()`, `startMatchmakingWithWarmup()`, and `teardownMultiplayer()` call `teardownSectorArena()`.
  - Enhance `teardownSectorArena()` in `src/entities/Arena.js` to restore `wallMat`, `glowMat`, `tileMatIntact`, `tileEdgeMatIntact`, and `tile.warningColor` back to default baseline values from `src/graphics/materials.js` so browsing sectored arenas in `#hostModal` never bleeds colors into Swarm or Quick Match.

## Risks / Trade-offs

- **Risk**: `applySectorArena('grid_01')` places 4 ricochet pillars at `(+/-14, +/-14)`. → **Mitigation**: Verify spawn coordinates (`p1/p3: (+/-8, 18)`, `p2/p4: (+/-8, -18)`, `1v1: (0, +/-18)`) remain > 7m clear of pillars; only apply `grid_01` hazards when an explicit `mapId` is chosen via `#hostModal`, keeping legacy programmatic `createRoom()` calls default/pillar-free.
- **Risk**: Late `REMATCH_VOTE` (`voted: false`) crosses in-flight `REMATCH_START` packet on WebRTC. → **Mitigation**: Guard `handleRemoteRematchVote` and `bindGameOverActions` with `roundId` and `state._launchingRematchRoundId` so votes for a launching round are ignored once `REMATCH_START` is emitted.
- **Risk**: Sector hazard damage / visuals on non-default grids in multiplayer (`grid_03` laser gates, `grid_04` void zones). → **Mitigation**: Local player damage from laser gates or void zones routes through `damagePlayer()` -> `reportMultiplayerMatchEnd()`, which already replicates elimination reliably over WebRTC/Firestore.
