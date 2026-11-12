# Tasks

## 1. Host Lobby Series Selector & Room State Schema

- [x] 1.1 Add series tracking fields (`seriesBestOf`, `selectedSeriesBestOf`, `seriesRound`, `seriesScores`, `seriesRoundFinished`, `seriesIntermissionTimer`, `seriesIntermissionMs`) in `src/core/state.js` and add a compact Best-of-N pill selector (`BO1`, `BO3`, `BO5`, `BO7`, defaulting to `BO3`) inside `#hostModal` in `index.html` wired to `state.selectedSeriesBestOf` in `src/ui/menus.js`; verify in `test/gameplay/unified_flow.test.js` that `#hostModal` defaults to `BO3`, switches cleanly, and leaves Solo AI Practice and Swarm untouched.
- [x] 1.2 Extend `onClickCreateRoom`, `onClickConfirmJoin`, `onRoomSnapshot`, and `transitionFromWarmupToPeerMatch` in `src/network/roomManager.js` (plus optional `{ bestOf }` support on `window.__dbg.createRoom()` in `src/core/main.js`) so hosted `1v1` / `2v2` rooms persist/hydrate `bestOf`, `seriesRound`, and `seriesScores` (`0 - 0`), while Quick Match (`state.db === null`) always initializes `bestOf = 3`; verify room doc & Quick Match initial state assertions in `test/gameplay/multiplayer.test.js` and `test/gameplay/rematch.test.js`.

## 2. Best-of-N Clinch Logic, Auto-Intermission & WebRTC / Room Sync

- [x] 2.1 Implement sub-round vs. series-clinch branching in `reportMultiplayerMatchEnd`, `handleRemoteRoundOver`, `handleRemoteNextRoundStart`, and `onRoomSnapshot` in `src/network/roomManager.js` so intermediate rounds (`max(t1, t2) < ceil(bestOf / 2)`) freeze active combat briefly, increment `seriesScores`, synchronize reliable WebRTC `ROUND_OVER` / `NEXT_ROUND_START` (or DB `round_over` / `active` fallback for `2v2`), and automatically reset tiles, HP/energy, discs, and spawn positions into a 3-second countdown after the ~2-second intermission (`seriesIntermissionMs`) without showing Rematch UI or processing payouts; verify with intermediate-round tests in `test/gameplay/rematch.test.js`.
- [x] 2.2 Update clinch completion, `evaluateHostRematchConsensus`, `handleRemoteRematchStart`, `handleRemotePeerLeft`, and `teardownMultiplayer` in `src/network/roomManager.js` so reaching `ceil(bestOf / 2)` wins triggers final match end and awards `duelEconomyBridge` Bits/XP once per series, unanimous `VOTE REMATCH` starts a fresh `0 - 0` series keeping `bestOf` and `mapId`, and mid-series peer departure cancels any pending `seriesIntermissionTimer` and resolves immediately to `OPPONENT LEFT` victory; verify `BO3` Quick Match, `BO3` Hosted Room (`2 - 1` comeback), mid-series disconnect, and single-round (`BO1`) compatibility in `test/gameplay/rematch.test.js` and `test/gameplay/multiplayer.test.js`.

## 3. Compact Online HUD Series Strip, Intermission Callout & Post-Match Overlay

- [x] 3.1 Add `#seriesHudWrap` styling/markup beneath `#bossBarWrap` inside `#tr` and `#seriesIntermission` floating callout styling/markup in `index.html`, and update `updateHUD()`, `showSeriesIntermission()`, and `clearSeriesIntermission()` in `src/ui/hud.js` so `#seriesHudWrap` renders Cyan vs. Purple round win pips/score strictly when `(gameMode === 'duel_multi' || gameMode === 'duos_multi') && seriesBestOf > 1` (hidden in `BO1` and all single-player modes while keeping `#roundLabel`, `#scoreRow`, and `#subLabel` hidden in online matches); verify via `test/gameplay/multiplayer.test.js` and `test/gameplay/unified_flow.test.js`.
- [x] 3.2 Update `showMultiplayerVictory()` and `showMultiplayerDefeat()` in `src/network/roomManager.js` to display final series tally (e.g., `FINAL SERIES // 2 - 1 (BEST OF 3)`) alongside participant callsigns, `#voteRematchBtn`, and `#multiMenuBtn` when `bestOf > 1`; verify post-match series score display across `1v1` and `2v2` in `test/gameplay/multiplayer.test.js` and `test/gameplay/rematch.test.js`.

## 4. End-to-End Verification

- [x] 4.1 Run the full test suite (`node test/runner.js all`) and `openspec validate online-multi-round-series --strict` and confirm all test suites and spec validations pass cleanly.
