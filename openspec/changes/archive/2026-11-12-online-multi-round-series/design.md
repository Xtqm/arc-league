# Design: Best-of-N Multi-Round Online Series

## Context

See [proposal.md](./proposal.md) and the 4 capability specs (`multiplayer-networking`, `online-matchmaking`, `game-modes`, `combat-hud`). Currently:
- Online `1v1` and `2v2` sessions tracked in `src/network/roomManager.js` end immediately on the first elimination or team wipe (`reportMultiplayerMatchEnd` -> `GAME_OVER_EVENT` / DB `status: 'finished'`), immediately running `duelEconomyBridge.processMatchOutcome` and showing `VICTORY` / `DEREZZED` with `VOTE REMATCH` / `RETURN TO MENU`.
- `state.multiplayerRoundId` serves as the per-match deduplication and rematch token across both WebRTC (`1v1`, Quick Match with `state.db === null`) and Firestore/mock room documents (`1v1` / `2v2`).
- Change A simplified `#tr` in online modes to `#topControls` + `#bossBarWrap` while hiding `#roundLabel`, `#scoreRow`, and `#subLabel`.

## Goals / Non-Goals

**Goals:**
- Support configurable Best-of-N series (`BO1`, `BO3`, `BO5`, `BO7`) strictly for online `1v1` and `2v2`, ending on first team to reach `ceil(bestOf / 2)` round wins.
- Keep Host UI (`#hostModal`) and automated Quick Match defaulting to `BO3` (`first to 2`), while allowing `BO1` / `BO3` / `BO5` / `BO7` selection for hosted rooms.
- Preserve single-entity identity between `multiplayerRoundId` (match/rematch series token) and `seriesRound` (1-based sub-round within the active series) so mid-series rounds auto-advance cleanly without triggering payouts or Rematch/Leave UI until clinch.
- Keep `#tr` minimal in online matches with an ultra-compact win-pip/score strip strictly when `bestOf > 1`.

**Non-Goals:**
- Changing Solo AI Duel (`duel_ai`), Swarm (`swarm`), or Campaign (`campaign`).
- Changing single-round elimination or mid-match non-respawn rules inside a single round of `2v2` (`Eliminated 2v2 player does not respawn mid-match`).
- Adding Best-of-N to offline practice mode.

## Decisions

### 1. Separate Series Token (`multiplayerRoundId`) from Sub-Round Index (`seriesRound`)
- **Decision**: Introduce series state fields on `state` (`src/core/state.js`):
  - `seriesBestOf`: integer (`1`, `3`, `5`, `7`; default `3`).
  - `seriesRound`: 1-based sub-round index within the current series (`1..seriesBestOf`).
  - `seriesScores`: `{ t1: 0, t2: 0 }` tracking Team 1 (`p1`/`p3`) and Team 2 (`p2`/`p4`) wins.
  - `seriesRoundFinished`: per-sub-round deduplication flag (separate from `multiplayerMatchFinished`, which only becomes `true` once a team clinches the series).
  - `seriesIntermissionTimer`: timeout reference for auto-advancing after ~2s (`state.seriesIntermissionMs`, default `2000ms`), cancelled on teardown, peer departure, or rematch.
- **Rationale**: Prevents conflating an intermediate round reset with a post-match rematch reset. `2v2` eliminated-player non-respawn checks remain intact within `seriesRound`, `duelEconomyBridge.processMatchOutcome` runs exclusively when `multiplayerMatchFinished` turns `true` at series clinch, and unanimous `VOTE REMATCH` increments `multiplayerRoundId` while resetting `seriesRound = 1` and `seriesScores = { t1: 0, t2: 0 }`.

### 2. Host-Orchestrated Sub-Round Intermission Over WebRTC and Room Fallback
- **Decision**:
  - When a round ends (`reportMultiplayerMatchEnd`), compute `nextScores` (`winnerTeam` + 1) and check `clinched = nextScores['t' + winnerTeam] >= Math.ceil(bestOf / 2)`.
  - **If clinched (or `bestOf === 1`)**: Mark `multiplayerMatchFinished = true` and follow the series-completion path (`GAME_OVER_EVENT` with `bestOf`, `seriesRound`, `seriesScores` + DB `status: 'finished'`), showing `VICTORY` / `DEREZZED` with final series tally + `VOTE REMATCH` / `RETURN TO MENU` and processing economy payout once.
  - **If NOT clinched**:
    - Mark `seriesRoundFinished = true`, freeze simulation (`state.running = false`), show brief non-blocking `#seriesIntermission` callout (`ROUND X WON` / `ROUND X LOST` and current score), and update HUD series pips.
    - Dispatch reliable WebRTC `ROUND_OVER` (and for DB-backed rooms without live WebRTC or `2v2`, write `status: 'round_over'`, `seriesRound`, `seriesScores`, `lastRoundWinnerTeam`, `lastRoundWinner`, `lastRoundLoserRole`).
    - Strictly the **Host (`p1`)** schedules `seriesIntermissionTimer` (`seriesIntermissionMs` = `2000ms`). On timer completion (if session still active and peer present), Host emits `NEXT_ROUND_START` (`roundId`, `seriesRound: prev + 1`, `bestOf`, `seriesScores`, `mode`, `mapId`, `playerNames`) via reliable WebRTC (or DB `status: 'active'`, reset `state.p1..p4`, `fallen: []`) and starts the next round (`startMultiplayerDuel` with 3s countdown).
- **Rationale**: Single-authority (`p1`) advancement prevents dual-reset race conditions in `1v1` and `2v2` when WebRTC and Firestore snapshots both exist, while non-blocking auto-advance keeps pace brisk without requiring a button press every round.
- **Alternative Considered**: Clicking Ready between every round. Rejected per user choice for faster flow (~2s callout -> automatic arena reset & 3s countdown).

### 3. Host Lobby Series Selector & Quick Match Default (`BO3`)
- **Decision**:
  - Add a compact 1-row pill selector (`BO1`, `BO3`, `BO5`, `BO7`, default `BO3`) inside `#hostModal`, wired to `state.selectedSeriesBestOf` (`src/ui/menus.js`). Clicking `practiceBtn` leaves Solo AI flow unchanged.
  - `onClickCreateRoom(e, mode, mapId, bestOf)` persists `bestOf` (defaulting to `state.selectedSeriesBestOf || 3`) on the created room document and hydrates `state.seriesBestOf` on both Host and joining Guests via `onRoomSnapshot` / `PLAYER_INFO`.
  - Quick Match (`transitionFromWarmupToPeerMatch`) always initializes with `{ bestOf: 3, seriesRound: 1, seriesScores: { t1: 0, t2: 0 } }` and relies strictly on reliable WebRTC messages (`ROUND_OVER`, `NEXT_ROUND_START`, `GAME_OVER_EVENT`, `REMATCH_START`) with `state.db === null`.
- **Rationale**: Matches user requirements directly (Quick Match `BO3`; Host configurable `BO1`/`BO3`/`BO5`/`BO7` defaulting to `BO3`) while preserving existing room database isolation rules.

### 4. Ultra-Compact Online HUD Pips & Final Score Summary
- **Decision**:
  - Render `<div id="seriesHudWrap">` directly beneath `#bossBarWrap` inside `#tr`. In `updateHUD()`, display `#seriesHudWrap` **only** when `(gameMode === 'duel_multi' || gameMode === 'duos_multi') && (state.seriesBestOf || 1) > 1`, rendering compact Cyan (`YOU`) vs Purple (`RIVAL`/`RIVALS`) filled/empty round pips (`●` / `○`) and numeric score without unhiding `#roundLabel`, `#scoreRow`, or `#subLabel`.
  - Render `#seriesIntermission` as a floating `pointer-events: none` HUD callout banner cleared automatically when `startMultiplayerDuel` or teardown runs.
  - Include final series score (`FINAL SERIES // 2 - 1`) in `#postMatchSeriesScore` on `VICTORY` / `DEREZZED` overlays when `bestOf > 1`.
- **Rationale**: Preserves the uncluttered HUD goals from Change A while communicating round progress cleanly on desktop and mobile.

### 5. Mid-Series Peer Departure & Economy Isolation
- **Decision**: If `handleRemotePeerLeft` triggers during an active multi-round series or during the 2s intermission, cancel `seriesIntermissionTimer` immediately, transition straight to series victory (`multiplayerMatchFinished = true`), award economy victory payout once, and show `OPPONENT LEFT` / `RETURN TO MENU`.
- **Rationale**: Prevents orphaned intermission timers from restarting an abandoned room.

## Risks / Trade-offs

- **Simultaneous Eliminations / Dual Event Race**: Both Host and Guest could detect round end on the same tick and compute scores independently. → *Mitigation*: Key `seriesRoundFinished` strictly on `(roundId, seriesRound)`; whichever side evaluates first locks `(roundId, seriesRound)` locally and broadcasts `seriesScores`; host `ROUND_OVER` / `NEXT_ROUND_START` payloads carry authoritative `seriesScores`, which non-host clients synchronize on `NEXT_ROUND_START` / snapshot.
- **2v2 Stale Teammate Respawn on Intermediate Round**: If a defeated 2v2 player's `onRoomSnapshot` sees `status: 'round_over'` vs `'active'`, an early `active` snapshot could confuse round transitions. → *Mitigation*: Key next-round launches strictly on `data.seriesRound > state.seriesRound` (while `data.status === 'active'`) OR `data.roundId > state.multiplayerRoundId`, never triggering a restart solely on `'active'` within the same `(roundId, seriesRound)`.
- **Existing Single-Round Tests Assuming Quick Match & Default Lobby = BO1**: Existing tests in `test/gameplay/multiplayer.test.js` and `test/gameplay/rematch.test.js` eliminate Guest once and expect immediate `VICTORY`/`DEREZZED`. → *Mitigation*: Support explicit `{ bestOf }` on `window.__dbg.createRoom()` for single-round test coverage (`BO1` where testing single-round physics/throw/teardown), and update `rematch.test.js` + `multiplayer.test.js` to explicitly test `BO3` Quick Match, Host Lobby `BO1`/`BO3`/`BO5`, ~2s auto-intermission, HUD pips, mid-series departure, and per-series single economy payout.
